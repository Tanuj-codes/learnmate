import prisma from '../config/prisma.js';
import config from '../config/env.js';
import ApiError from '../utils/errors.js';
import { awardXp } from './xpService.js';
import { countDueForCourse } from './flashcardService.js';

function withProgress(course, completedLessonIds) {
  const lessons = course.lessons || [];
  const completedCount = lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;
  const totalCount = lessons.length;
  const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const resumeLesson =
    lessons.find((lesson) => !completedLessonIds.has(lesson.id)) ||
    lessons[lessons.length - 1] ||
    null;

  return {
    completedCount,
    totalCount,
    percent,
    resumeLessonId: resumeLesson?.id || null,
  };
}

async function completedLessonMap(userId) {
  if (!userId) return new Map();
  const rows = await prisma.lessonProgress.findMany({
    where: { userId },
    select: { lessonId: true, lesson: { select: { courseId: true } } },
  });
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.lesson.courseId)) map.set(row.lesson.courseId, new Set());
    map.get(row.lesson.courseId).add(row.lessonId);
  }
  return map;
}

export async function listCourses({ search, difficulty, category, userId } = {}) {
  const where = { published: true };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { tagline: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (difficulty) where.difficulty = difficulty;
  if (category) where.category = category;

  const [courses, categories, completedByCourse, enrollments] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        topics: { orderBy: { order: 'asc' }, select: { id: true, title: true, order: true } },
        lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, order: true } },
        _count: { select: { lessons: true, quizzes: true, flashcards: true, enrollments: true } },
      },
    }),
    prisma.course.findMany({ where: { published: true }, distinct: ['category'], select: { category: true } }),
    completedLessonMap(userId),
    userId
      ? prisma.enrollment.findMany({ where: { userId }, select: { courseId: true, enrolledAt: true } })
      : Promise.resolve([]),
  ]);

  const enrollmentByCourse = new Map(enrollments.map((entry) => [entry.courseId, entry]));

  return {
    courses: courses.map((course) => {
      const completed = completedByCourse.get(course.id) || new Set();
      const progress = withProgress(course, completed);
      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        tagline: course.tagline,
        description: course.description,
        category: course.category,
        difficulty: course.difficulty,
        estimatedMinutes: course.estimatedMinutes,
        topics: course.topics,
        lessonCount: course._count.lessons,
        quizCount: course._count.quizzes,
        flashcardCount: course._count.flashcards,
        learnerCount: course._count.enrollments,
        enrolled: enrollmentByCourse.has(course.id),
        enrolledAt: enrollmentByCourse.get(course.id)?.enrolledAt || null,
        progress,
      };
    }),
    categories: categories.map((row) => row.category).sort(),
  };
}

export async function findCourseByIdentifier(identifier, { includeUnpublished = false } = {}) {
  const course = await prisma.course.findFirst({
    where: {
      OR: [{ id: identifier }, { slug: identifier }],
      ...(includeUnpublished ? {} : { published: true }),
    },
  });
  if (!course) throw ApiError.notFound('Course not found');
  return course;
}

export async function getCourseDetail(identifier, user) {
  const course = await prisma.course.findFirst({
    where: {
      OR: [{ id: identifier }, { slug: identifier }],
      ...(user?.role === 'ADMIN' ? {} : { published: true }),
    },
    include: {
      topics: {
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, summary: true, order: true, estimatedMinutes: true } } },
      },
      lessons: {
        orderBy: { order: 'asc' },
        select: { id: true, title: true, summary: true, order: true, estimatedMinutes: true, topicId: true },
      },
      quizzes: {
        orderBy: { order: 'asc' },
        include: { _count: { select: { questions: true } } },
      },
      _count: { select: { flashcards: true, enrollments: true } },
    },
  });
  if (!course) throw ApiError.notFound('Course not found');

  const enrollment = user
    ? await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } })
    : null;

  let progress = { completedCount: 0, totalCount: course.lessons.length, percent: 0, resumeLessonId: course.lessons[0]?.id || null };
  let completedIds = new Set();

  if (user && enrollment) {
    const records = await prisma.lessonProgress.findMany({
      where: { userId: user.id, lesson: { courseId: course.id } },
      select: { lessonId: true, completedAt: true },
    });
    completedIds = new Set(records.map((row) => row.lessonId));
    progress = withProgress(course, completedIds);
  }

  const attempts = user && enrollment
    ? await prisma.quizAttempt.findMany({
        where: {
          userId: user.id,
          quizId: { in: course.quizzes.map((quiz) => quiz.id) },
          status: 'SUBMITTED',
          verified: true,
        },
        select: { id: true, quizId: true, score: true, submittedAt: true, attemptNumber: true },
        orderBy: { submittedAt: 'desc' },
      })
    : [];

  const attemptByQuiz = new Map();
  for (const attempt of attempts) {
    if (!attemptByQuiz.has(attempt.quizId)) attemptByQuiz.set(attempt.quizId, []);
    attemptByQuiz.get(attempt.quizId).push(attempt);
  }

  const dueCount = user && enrollment ? await countDueForCourse(user.id, course.id) : 0;

  return {
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      tagline: course.tagline,
      description: course.description,
      category: course.category,
      difficulty: course.difficulty,
      estimatedMinutes: course.estimatedMinutes,
      published: course.published,
      learnerCount: course._count.enrollments,
      flashcardCount: course._count.flashcards,
      createdAt: course.createdAt,
    },
    topics: course.topics,
    lessons: course.lessons.map((lesson) => ({
      ...lesson,
      completed: completedIds.has(lesson.id),
    })),
    quizzes: course.quizzes.map((quiz) => {
      const quizAttempts = attemptByQuiz.get(quiz.id) || [];
      const best = quizAttempts.reduce((max, attempt) => Math.max(max, attempt.score ?? 0), 0);
      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        difficulty: quiz.difficulty,
        passingScore: quiz.passingScore,
        timeLimitSec: quiz.timeLimitSec,
        questionCount: quiz._count.questions,
        attemptCount: quizAttempts.length,
        bestScore: quizAttempts.length ? best : null,
        lastAttemptAt: quizAttempts[0]?.submittedAt || null,
      };
    }),
    enrolled: Boolean(enrollment),
    enrolledAt: enrollment?.enrolledAt || null,
    progress,
    dueFlashcardCount: dueCount,
  };
}

export async function enrollInCourse(userId, courseId) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || !course.published) throw ApiError.notFound('Course not found');

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId },
    update: { lastAccessedAt: new Date() },
  });

  const completed = await prisma.lessonProgress.count({
    where: { userId, lesson: { courseId } },
  });
  const total = await prisma.lesson.count({ where: { courseId } });

  return {
    enrollment,
    progress: {
      completedCount: completed,
      totalCount: total,
      percent: total ? Math.round((completed / total) * 100) : 0,
    },
  };
}

export async function getCourseProgress(userId, courseId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, order: true } } },
  });
  if (!course) throw ApiError.notFound('Course not found');

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) throw ApiError.forbidden('Enroll in this course to view your progress.');

  const records = await prisma.lessonProgress.findMany({
    where: { userId, lesson: { courseId } },
    select: { lessonId: true, completedAt: true },
  });
  const completedIds = new Set(records.map((row) => row.lessonId));
  const completedAt = new Map(records.map((row) => [row.lessonId, row.completedAt]));

  return {
    courseId,
    lessons: course.lessons.map((lesson) => ({
      ...lesson,
      completed: completedIds.has(lesson.id),
      completedAt: completedAt.get(lesson.id) || null,
    })),
    ...withProgress(course, completedIds),
  };
}

export async function getLessonForUser(lessonId, user) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      course: { select: { id: true, title: true, slug: true, published: true } },
      topic: { select: { id: true, title: true } },
    },
  });
  if (!lesson || !lesson.course.published) throw ApiError.notFound('Lesson not found');

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: lesson.courseId } },
  });
  if (!enrollment && user.role !== 'ADMIN') {
    throw ApiError.forbidden('Enroll in this course to open its lessons.');
  }

  const [siblings, progressRows] = await Promise.all([
    prisma.lesson.findMany({
      where: { courseId: lesson.courseId },
      orderBy: { order: 'asc' },
      select: { id: true, title: true, order: true, estimatedMinutes: true },
    }),
    prisma.lessonProgress.findMany({
      where: { userId: user.id, lesson: { courseId: lesson.courseId } },
      select: { lessonId: true },
    }),
  ]);
  const completedIds = new Set(progressRows.map((row) => row.lessonId));
  const index = siblings.findIndex((sibling) => sibling.id === lesson.id);

  await prisma.enrollment.update({
    where: { userId_courseId: { userId: user.id, courseId: lesson.courseId } },
    data: { lastAccessedAt: new Date() },
  }).catch(() => null);

  const completedCount = siblings.filter((sibling) => completedIds.has(sibling.id)).length;

  return {
    lesson: {
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      content: lesson.content,
      order: lesson.order,
      estimatedMinutes: lesson.estimatedMinutes,
      xpReward: lesson.xpReward,
      topic: lesson.topic,
    },
    course: {
      id: lesson.course.id,
      title: lesson.course.title,
      slug: lesson.course.slug,
    },
    completed: completedIds.has(lesson.id),
    progress: {
      completedCount,
      totalCount: siblings.length,
      percent: siblings.length ? Math.round((completedCount / siblings.length) * 100) : 0,
    },
    outline: siblings.map((sibling) => ({
      ...sibling,
      completed: completedIds.has(sibling.id),
      current: sibling.id === lesson.id,
    })),
    navigation: {
      previous: siblings[index - 1] || null,
      next: siblings[index + 1] || null,
    },
  };
}

export async function completeLesson(userId, lessonId) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { select: { id: true, published: true } } },
  });
  if (!lesson || !lesson.course.published) throw ApiError.notFound('Lesson not found');

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: lesson.courseId } },
  });
  if (!enrollment) throw ApiError.forbidden('Enroll in this course to complete lessons.');

  const outcome = await prisma.$transaction(async (tx) => {
    const existing = await tx.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    if (!existing) {
      await tx.lessonProgress.create({ data: { userId, lessonId } });
    }

    const award = existing
      ? { awarded: false, amount: 0 }
      : await awardXp({
          userId,
          amount: lesson.xpReward || config.xp.lessonComplete,
          reason: 'LESSON_COMPLETE',
          sourceType: 'Lesson',
          sourceId: lesson.id,
          courseId: lesson.courseId,
          idempotencyKey: `lesson:${userId}:${lessonId}`,
          client: tx,
        });

    await tx.enrollment.update({
      where: { userId_courseId: { userId, courseId: lesson.courseId } },
      data: { lastAccessedAt: new Date() },
    });

    return { alreadyCompleted: Boolean(existing), xpAwarded: award.amount };
  });

  const progress = await getCourseProgress(userId, lesson.courseId);

  return {
    lessonId,
    completed: true,
    alreadyCompleted: outcome.alreadyCompleted,
    xpAwarded: outcome.xpAwarded,
    progress,
    courseId: lesson.courseId,
  };
}
