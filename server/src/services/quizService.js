import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import config from '../config/env.js';
import ApiError from '../utils/errors.js';
import { awardXp } from './xpService.js';
import { todayKey, zonedDayRange } from '../utils/dates.js';

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

async function assertEnrolled(userId, courseId) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  });
  if (!enrollment) throw ApiError.forbidden('Enroll in this course to take its assessments.');
}

export async function listQuizzesForCourse(courseId, userId) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, published: true } });
  if (!course || !course.published) throw ApiError.notFound('Course not found');
  await assertEnrolled(userId, courseId);

  const quizzes = await prisma.quiz.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    include: { _count: { select: { questions: true } } },
  });

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId, quizId: { in: quizzes.map((quiz) => quiz.id) }, status: 'SUBMITTED', verified: true },
    select: { quizId: true, score: true, submittedAt: true, id: true },
    orderBy: { submittedAt: 'desc' },
  });

  return quizzes.map((quiz) => {
    const quizAttempts = attempts.filter((attempt) => attempt.quizId === quiz.id);
    return {
      id: quiz.id,
      courseId: quiz.courseId,
      title: quiz.title,
      description: quiz.description,
      difficulty: quiz.difficulty,
      passingScore: quiz.passingScore,
      timeLimitSec: quiz.timeLimitSec,
      questionCount: quiz._count.questions,
      attemptCount: quizAttempts.length,
      bestScore: quizAttempts.length ? Math.max(...quizAttempts.map((attempt) => attempt.score ?? 0)) : null,
      lastAttemptId: quizAttempts[0]?.id || null,
      lastAttemptAt: quizAttempts[0]?.submittedAt || null,
    };
  });
}

export async function startAttempt(userId, quizId, requestedQuestionCount) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      course: { select: { id: true, published: true } },
      questions: { orderBy: { order: 'asc' } },
    },
  });
  if (!quiz || !quiz.course.published) throw ApiError.notFound('Quiz not found');
  await assertEnrolled(userId, quiz.courseId);

  if (quiz.questions.length === 0) throw ApiError.badRequest('This quiz does not have any questions yet.');

  const questionCount = Math.min(
    Math.max(1, Number(requestedQuestionCount) || 5),
    quiz.questions.length
  );
  const selected = shuffle(quiz.questions).slice(0, questionCount);

  let attempt = null;
  for (let retry = 0; retry < 3 && !attempt; retry += 1) {
    const attemptNumber = (await prisma.quizAttempt.count({ where: { userId, quizId } })) + 1;
    try {
      attempt = await prisma.quizAttempt.create({
        data: {
          userId,
          quizId,
          attemptNumber,
          questionIds: selected.map((question) => question.id),
          totalCount: selected.length,
          status: 'IN_PROGRESS',
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    }
  }
  if (!attempt) throw ApiError.conflict('Could not start a new attempt. Please try again.');

  const served = selected.map((question, index) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options,
    difficulty: question.difficulty,
    topic: question.topic,
    position: index + 1,
  }));

  return {
    attempt: {
      id: attempt.id,
      quizId: quiz.id,
      quizTitle: quiz.title,
      courseId: quiz.courseId,
      startedAt: attempt.startedAt,
      questionCount: served.length,
      questions: served,
    },
  };
}

function buildTopicBreakdown(answerRows) {
  const byTopic = new Map();
  for (const answer of answerRows) {
    const topic = answer.question.topic || 'General';
    if (!byTopic.has(topic)) byTopic.set(topic, { topic, correct: 0, total: 0 });
    const entry = byTopic.get(topic);
    entry.total += 1;
    if (answer.isCorrect) entry.correct += 1;
  }
  return [...byTopic.values()].map((entry) => ({
    ...entry,
    accuracy: Math.round((entry.correct / entry.total) * 100),
  }));
}

async function loadResult(attemptId, userId) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: { select: { id: true, title: true, passingScore: true, courseId: true } },
      answers: { include: { question: true } },
    },
  });
  if (!attempt) throw ApiError.notFound('Attempt not found');
  if (attempt.userId !== userId) throw ApiError.forbidden('You can only view your own attempts.');
  if (attempt.status !== 'SUBMITTED') throw ApiError.badRequest('This attempt has not been submitted yet.');

  const order = Array.isArray(attempt.questionIds) ? attempt.questionIds : [];
  const answerByQuestion = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
  const answers = order.map((questionId) => {
    const answer = answerByQuestion.get(questionId);
    if (!answer) return null;
    return {
      questionId,
      prompt: answer.question.prompt,
      options: answer.question.options,
      selectedIndex: answer.selectedIndex,
      correctIndex: answer.question.correctIndex,
      isCorrect: answer.isCorrect,
      explanation: answer.question.explanation,
      topic: answer.question.topic,
      difficulty: answer.question.difficulty,
    };
  }).filter(Boolean);

  const score = attempt.score ?? 0;
  return {
    attempt: {
      id: attempt.id,
      quizId: attempt.quizId,
      quizTitle: attempt.quiz.title,
      courseId: attempt.quiz.courseId,
      attemptNumber: attempt.attemptNumber,
      score,
      correctCount: attempt.correctCount,
      totalCount: attempt.totalCount,
      passed: score >= attempt.quiz.passingScore,
      passingScore: attempt.quiz.passingScore,
      submittedAt: attempt.submittedAt,
      xpAwarded: attempt.xpAwarded,
      verified: attempt.verified,
    },
    answers,
    topicBreakdown: buildTopicBreakdown(attempt.answers),
  };
}

export async function submitAttempt(userId, attemptId, submittedAnswers) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: { include: { course: { select: { id: true, title: true } } } },
    },
  });
  if (!attempt) throw ApiError.notFound('Attempt not found');
  if (attempt.userId !== userId) throw ApiError.forbidden('You can only submit your own attempts.');
  if (attempt.status !== 'IN_PROGRESS') throw ApiError.conflict('This attempt has already been submitted.');

  const questionIds = Array.isArray(attempt.questionIds) ? attempt.questionIds : [];
  const questions = await prisma.question.findMany({ where: { id: { in: questionIds } } });
  const questionById = new Map(questions.map((question) => [question.id, question]));

  const seen = new Set();
  for (const answer of submittedAnswers) {
    if (!questionIds.includes(answer.questionId)) {
      throw ApiError.badRequest('Submission contains a question that was not part of this attempt.');
    }
    if (seen.has(answer.questionId)) {
      throw ApiError.badRequest('Submission contains duplicate answers.');
    }
    seen.add(answer.questionId);
    const question = questionById.get(answer.questionId);
    const optionCount = Array.isArray(question?.options) ? question.options.length : 0;
    if (answer.selectedIndex !== null && answer.selectedIndex !== undefined) {
      if (!Number.isInteger(answer.selectedIndex) || answer.selectedIndex < 0 || answer.selectedIndex >= optionCount) {
        throw ApiError.badRequest('One of the selected answers is not valid for its question.');
      }
    }
  }

  const answerByQuestion = new Map(submittedAnswers.map((answer) => [answer.questionId, answer]));
  const graded = questionIds.map((questionId) => {
    const question = questionById.get(questionId);
    const selected = answerByQuestion.get(questionId)?.selectedIndex ?? null;
    return {
      question,
      selectedIndex: selected,
      isCorrect: selected !== null && selected === question.correctIndex,
    };
  }).filter((row) => row.question);

  const correctCount = graded.filter((row) => row.isCorrect).length;
  const totalCount = graded.length;
  const score = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  const dateKey = todayKey(user.timezone);
  const { start, end } = zonedDayRange(dateKey, user.timezone);

  const outcome = await prisma.$transaction(async (tx) => {
    const fresh = await tx.quizAttempt.findUnique({ where: { id: attemptId } });
    if (!fresh || fresh.status !== 'IN_PROGRESS') throw ApiError.conflict('This attempt has already been submitted.');

    await tx.quizAnswer.createMany({
      data: graded.map((row) => ({
        attemptId,
        questionId: row.question.id,
        selectedIndex: row.selectedIndex,
        isCorrect: row.isCorrect,
      })),
      skipDuplicates: true,
    });

    const verified = fresh.verified !== false;

    // Quiz XP: awarded at most once per quiz per local day to prevent farming.
    const rewardKey = `quiz-reward:${userId}:${attempt.quizId}:${dateKey}`;
    const alreadyRewarded = await tx.xPTransaction.findUnique({ where: { idempotencyKey: rewardKey } });
    const todayAttempts = await tx.quizAttempt.count({
      where: {
        userId,
        quizId: attempt.quizId,
        status: 'SUBMITTED',
        submittedAt: { gte: start, lt: end },
      },
    });

    let xpAwarded = 0;
    if (verified && !alreadyRewarded && todayAttempts === 0) {
      const amount = config.xp.quizComplete + correctCount * config.xp.perCorrectAnswer;
      const award = await awardXp({
        userId,
        amount,
        reason: 'QUIZ_COMPLETE',
        sourceType: 'QuizAttempt',
        sourceId: attemptId,
        courseId: attempt.quiz.courseId,
        idempotencyKey: rewardKey,
        client: tx,
      });
      xpAwarded = award.amount;
    }

    const updated = await tx.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        correctCount,
        totalCount,
        score,
        xpAwarded,
        verified,
      },
    });

    return updated;
  });

  const result = await loadResult(attemptId, userId);
  return { ...result, xpAwarded: outcome.xpAwarded };
}

export async function getAttemptResult(userId, attemptId) {
  return loadResult(attemptId, userId);
}

export async function getQuizAttemptHistory(userId, quizId) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { id: true, courseId: true, title: true } });
  if (!quiz) throw ApiError.notFound('Quiz not found');
  await assertEnrolled(userId, quiz.courseId);

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId, quizId, status: 'SUBMITTED' },
    orderBy: { submittedAt: 'desc' },
    select: {
      id: true,
      attemptNumber: true,
      score: true,
      correctCount: true,
      totalCount: true,
      submittedAt: true,
      xpAwarded: true,
      verified: true,
    },
  });
  return { quiz, attempts };
}

export async function getQuizMeta(userId, quizId) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      course: { select: { id: true, title: true, slug: true, published: true } },
      _count: { select: { questions: true } },
    },
  });
  if (!quiz || !quiz.course.published) throw ApiError.notFound('Quiz not found');
  await assertEnrolled(userId, quiz.courseId);

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId, quizId, status: 'SUBMITTED' },
    orderBy: { submittedAt: 'desc' },
    take: 10,
    select: {
      id: true,
      attemptNumber: true,
      score: true,
      correctCount: true,
      totalCount: true,
      submittedAt: true,
      xpAwarded: true,
    },
  });

  return {
    quiz: {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      difficulty: quiz.difficulty,
      passingScore: quiz.passingScore,
      timeLimitSec: quiz.timeLimitSec,
      questionCount: quiz._count.questions,
      course: { id: quiz.course.id, title: quiz.course.title, slug: quiz.course.slug },
    },
    attempts,
    bestScore: attempts.length ? Math.max(...attempts.map((attempt) => attempt.score ?? 0)) : null,
  };
}

export async function getRecentAttempts(userId, { limit = 5, courseId } = {}) {
  return prisma.quizAttempt.findMany({
    where: {
      userId,
      status: 'SUBMITTED',
      ...(courseId ? { quiz: { courseId } } : {}),
    },
    orderBy: { submittedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      score: true,
      correctCount: true,
      totalCount: true,
      submittedAt: true,
      quiz: { select: { id: true, title: true, courseId: true, course: { select: { title: true } } } },
    },
  });
}

export async function getAllAttemptsForUser(userId) {
  return prisma.quizAttempt.findMany({
    where: { userId, status: 'SUBMITTED', verified: true },
    orderBy: { submittedAt: 'asc' },
    select: {
      id: true,
      score: true,
      correctCount: true,
      totalCount: true,
      submittedAt: true,
      quizId: true,
      quiz: { select: { courseId: true } },
    },
  });
}

export async function topicAccuracy(userId, { courseId } = {}) {
  const answers = await prisma.quizAnswer.findMany({
    where: {
      attempt: {
        userId,
        status: 'SUBMITTED',
        verified: true,
        ...(courseId ? { quiz: { courseId } } : {}),
      },
    },
    include: {
      question: { select: { topic: true } },
      attempt: { select: { quiz: { select: { courseId: true } } } },
    },
  });

  const byTopic = new Map();
  for (const answer of answers) {
    const topic = answer.question.topic || 'General';
    if (!byTopic.has(topic)) byTopic.set(topic, { topic, correct: 0, total: 0 });
    const entry = byTopic.get(topic);
    entry.total += 1;
    if (answer.isCorrect) entry.correct += 1;
  }

  return [...byTopic.values()]
    .map((entry) => ({ ...entry, accuracy: Math.round((entry.correct / entry.total) * 100) }))
    .sort((a, b) => b.total - a.total);
}

export { buildTopicBreakdown };
