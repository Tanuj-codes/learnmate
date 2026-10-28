import crypto from 'crypto';
import prisma from '../config/prisma.js';
import config from '../config/env.js';
import ApiError from '../utils/errors.js';
import { awardXp } from './xpService.js';
import { todayKey, zonedDayRange } from '../utils/dates.js';

const MATCH_PAIR_COUNT = 6;
const TIMED_QUESTION_COUNT = 5;
const TIMED_LIMIT_SEC = 60;
const MATCH_SESSION_LIMIT_MS = 20 * 60 * 1000;
const GAME_DAILY_REWARD_LIMIT = 3;

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
  if (!enrollment) throw ApiError.forbidden('Enroll in this course to play its games.');
}

export async function createGameSession(userId, courseId, gameType) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, published: true },
  });
  if (!course || !course.published) throw ApiError.notFound('Course not found');
  await assertEnrolled(userId, courseId);

  let state;
  let publicPayload;

  if (gameType === 'MATCH_PAIRS') {
    const flashcards = await prisma.flashcard.findMany({ where: { courseId }, select: { id: true, front: true, back: true, topic: true } });
    if (flashcards.length < 3) throw ApiError.badRequest('This course needs at least 3 flashcards to play Match the Pairs.');

    const chosen = shuffle(flashcards).slice(0, Math.min(MATCH_PAIR_COUNT, flashcards.length));
    const pairs = chosen.map((card) => ({
      pairId: crypto.randomUUID(),
      token: crypto.randomUUID(),
      front: card.front,
      back: card.back,
      topic: card.topic,
    }));

    state = {
      pairs,
      startedAt: new Date().toISOString(),
      instructions: 'Match each concept with its correct definition.',
    };
    publicPayload = {
      pairs: pairs.length,
      leftCards: shuffle(pairs.map(({ pairId, front, topic }) => ({ pairId, text: front, topic }))),
      rightCards: shuffle(pairs.map(({ token, back }) => ({ token, text: back }))),
    };
  } else if (gameType === 'TIMED_CHALLENGE') {
    const questions = await prisma.question.findMany({
      where: { quiz: { courseId } },
      select: { id: true, prompt: true, options: true, topic: true, difficulty: true },
    });
    if (questions.length === 0) throw ApiError.badRequest('This course has no assessment questions yet.');

    const chosen = shuffle(questions).slice(0, Math.min(TIMED_QUESTION_COUNT, questions.length));
    state = {
      questionIds: chosen.map((question) => question.id),
      timeLimitSec: TIMED_LIMIT_SEC,
      startedAt: new Date().toISOString(),
    };
    publicPayload = {
      timeLimitSec: TIMED_LIMIT_SEC,
      questions: chosen.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        options: question.options,
        topic: question.topic,
        difficulty: question.difficulty,
      })),
    };
  } else {
    throw ApiError.badRequest('Unsupported game type.');
  }

  const session = await prisma.gameSession.create({
    data: {
      userId,
      courseId,
      gameType,
      state,
      maxScore: gameType === 'MATCH_PAIRS' ? state.pairs.length : state.questionIds.length,
      status: 'IN_PROGRESS',
    },
  });

  return {
    session: {
      id: session.id,
      gameType,
      courseId,
      maxScore: session.maxScore,
      startedAt: session.startedAt,
      ...publicPayload,
    },
  };
}

async function completeSession(session, { score, details }) {
  const now = new Date();
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { timezone: true } });
  const dateKey = todayKey(user.timezone);
  const { start, end } = zonedDayRange(dateKey, user.timezone);

  const accuracy = session.maxScore ? Math.round((score / session.maxScore) * 100) : 0;
  const withinTime =
    session.gameType === 'MATCH_PAIRS'
      ? now.getTime() - session.startedAt.getTime() <= MATCH_SESSION_LIMIT_MS
      : now.getTime() - session.startedAt.getTime() <=
        (session.state?.timeLimitSec || TIMED_LIMIT_SEC) * 1000 + 5000;

  const requestedReward = accuracy >= 60 && withinTime;
  const durationMs = now.getTime() - session.startedAt.getTime();

  const outcome = await prisma.$transaction(async (tx) => {
    const fresh = await tx.gameSession.findUnique({ where: { id: session.id } });
    if (!fresh || fresh.status !== 'IN_PROGRESS') {
      throw ApiError.conflict('This game session has already been completed.');
    }

    let xpAwarded = 0;
    if (requestedReward) {
      const rewardedToday = await tx.xPTransaction.count({
        where: { userId: session.userId, reason: 'GAME_COMPLETE', createdAt: { gte: start, lt: end } },
      });
      if (rewardedToday < GAME_DAILY_REWARD_LIMIT) {
        const award = await awardXp({
          userId: session.userId,
          amount: config.xp.gameComplete,
          reason: 'GAME_COMPLETE',
          sourceType: 'GameSession',
          sourceId: session.id,
          courseId: session.courseId,
          idempotencyKey: `game:${session.id}`,
          client: tx,
        });
        xpAwarded = award.amount;
      }
    }

    const updated = await tx.gameSession.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        completedAt: now,
        score,
        durationMs,
        verified: true,
        xpAwarded,
      },
    });

    return { session: updated, xpAwarded };
  });

  return {
    session: {
      id: session.id,
      gameType: session.gameType,
      courseId: session.courseId,
      score,
      maxScore: session.maxScore,
      accuracy,
      durationMs,
      completedAt: now,
      passed: accuracy >= 60,
      withinTime,
      verified: true,
      xpAwarded: outcome.xpAwarded,
      rewardEligible: requestedReward,
    },
    ...details,
  };
}

export async function submitMatchPairs(userId, sessionId, matches) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session) throw ApiError.notFound('Game session not found');
  if (session.userId !== userId) throw ApiError.forbidden('You can only submit your own game sessions.');
  if (session.gameType !== 'MATCH_PAIRS') throw ApiError.badRequest('This is not a Match the Pairs session.');
  if (session.status !== 'IN_PROGRESS') throw ApiError.conflict('This game session is already complete.');

  const pairs = session.state?.pairs || [];
  const pairById = new Map(pairs.map((pair) => [pair.pairId, pair]));
  const tokenToPair = new Map(pairs.map((pair) => [pair.token, pair]));
  const seenPairs = new Set();
  const seenTokens = new Set();

  for (const match of matches) {
    if (!pairById.has(match.pairId) || !tokenToPair.has(match.token)) {
      throw ApiError.badRequest('One of the submitted matches is not part of this game.');
    }
    if (seenPairs.has(match.pairId) || seenTokens.has(match.token)) {
      throw ApiError.badRequest('Each card can only be matched once.');
    }
    seenPairs.add(match.pairId);
    seenTokens.add(match.token);
  }

  const scored = matches.map((match) => {
    const pair = pairById.get(match.pairId);
    const isCorrect = tokenToPair.get(match.token)?.pairId === pair.pairId;
    return {
      pairId: match.pairId,
      front: pair.front,
      back: pair.back,
      matchedBack: tokenToPair.get(match.token)?.back || null,
      isCorrect,
    };
  });

  const correctCount = scored.filter((match) => match.isCorrect).length;
  return completeSession(session, {
    score: correctCount,
    details: { results: scored, correctCount, totalCount: pairs.length },
  });
}

export async function submitTimedChallenge(userId, sessionId, answers) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session) throw ApiError.notFound('Game session not found');
  if (session.userId !== userId) throw ApiError.forbidden('You can only submit your own game sessions.');
  if (session.gameType !== 'TIMED_CHALLENGE') throw ApiError.badRequest('This is not a Timed Knowledge Challenge session.');
  if (session.status !== 'IN_PROGRESS') throw ApiError.conflict('This game session is already complete.');

  const questionIds = session.state?.questionIds || [];
  const questions = await prisma.question.findMany({ where: { id: { in: questionIds } } });
  const questionById = new Map(questions.map((question) => [question.id, question]));

  const seen = new Set();
  for (const answer of answers) {
    if (!questionIds.includes(answer.questionId)) {
      throw ApiError.badRequest('One of the answers is not part of this game.');
    }
    if (seen.has(answer.questionId)) throw ApiError.badRequest('Duplicate answers are not allowed.');
    seen.add(answer.questionId);
    const question = questionById.get(answer.questionId);
    const options = Array.isArray(question?.options) ? question.options : [];
    if (answer.selectedIndex !== null && answer.selectedIndex !== undefined) {
      if (!Number.isInteger(answer.selectedIndex) || answer.selectedIndex < 0 || answer.selectedIndex >= options.length) {
        throw ApiError.badRequest('One of the selected answers is invalid.');
      }
    }
  }

  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  const results = questionIds.map((questionId) => {
    const question = questionById.get(questionId);
    const selectedIndex = answerByQuestion.get(questionId)?.selectedIndex ?? null;
    return {
      questionId,
      prompt: question.prompt,
      options: question.options,
      selectedIndex,
      correctIndex: question.correctIndex,
      isCorrect: selectedIndex !== null && selectedIndex === question.correctIndex,
      explanation: question.explanation,
      topic: question.topic,
    };
  }).filter((row) => row.prompt);

  const correctCount = results.filter((row) => row.isCorrect).length;
  return completeSession(session, {
    score: correctCount,
    details: {
      results,
      correctCount,
      totalCount: questionIds.length,
      timeLimitSec: session.state?.timeLimitSec || TIMED_LIMIT_SEC,
    },
  });
}

export async function getGameHistory(userId, { limit = 10 } = {}) {
  const sessions = await prisma.gameSession.findMany({
    where: { userId, status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
    take: limit,
    include: { course: { select: { id: true, title: true } } },
  });
  return sessions.map((session) => ({
    id: session.id,
    gameType: session.gameType,
    course: session.course,
    score: session.score,
    maxScore: session.maxScore,
    accuracy: session.maxScore ? Math.round(((session.score || 0) / session.maxScore) * 100) : 0,
    durationMs: session.durationMs,
    completedAt: session.completedAt,
    xpAwarded: session.xpAwarded,
    verified: session.verified,
  }));
}
