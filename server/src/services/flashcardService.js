import prisma from '../config/prisma.js';
import config from '../config/env.js';
import ApiError from '../utils/errors.js';
import { awardXp } from './xpService.js';
import { todayKey, zonedDayRange } from '../utils/dates.js';

const KNOWN_INTERVALS = [1, 3, 7, 16, 35, 60];
const DAY_MS = 24 * 60 * 60 * 1000;

async function assertEnrolled(userId, courseId) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  });
  if (!enrollment) throw ApiError.forbidden('Enroll in this course to revise its flashcards.');
}

function latestReviewMap(reviews) {
  const map = new Map();
  for (const review of reviews) {
    if (!map.has(review.flashcardId)) map.set(review.flashcardId, review);
  }
  return map;
}

function cardState(card, review) {
  if (!review) {
    return {
      flashcardId: card.id,
      status: 'new',
      dueAt: null,
      intervalDays: 0,
      repetitions: 0,
      lastRating: null,
      lastReviewedAt: null,
      isDue: true,
    };
  }
  return {
    flashcardId: card.id,
    status: review.dueAt <= new Date() ? 'due' : 'scheduled',
    dueAt: review.dueAt,
    intervalDays: review.intervalDays,
    repetitions: review.repetitions,
    lastRating: review.rating,
    lastReviewedAt: review.reviewedAt,
    isDue: review.dueAt <= new Date(),
  };
}

export async function getCourseFlashcards(userId, courseId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, published: true },
  });
  if (!course || !course.published) throw ApiError.notFound('Course not found');
  await assertEnrolled(userId, courseId);

  const cards = await prisma.flashcard.findMany({
    where: { courseId },
    orderBy: [{ topic: 'asc' }, { createdAt: 'asc' }],
  });
  const reviews = await prisma.flashcardReview.findMany({
    where: { userId, flashcardId: { in: cards.map((card) => card.id) } },
    orderBy: { reviewedAt: 'desc' },
  });
  const latest = latestReviewMap(reviews);

  const formatted = cards.map((card) => ({
    id: card.id,
    topic: card.topic,
    front: card.front,
    back: card.back,
    ...cardState(card, latest.get(card.id)),
  }));

  const now = new Date();
  return {
    course,
    cards: formatted,
    summary: {
      total: formatted.length,
      due: formatted.filter((card) => card.isDue).length,
      newCards: formatted.filter((card) => card.status === 'new').length,
      known: formatted.filter((card) => card.lastRating === 'KNOWN').length,
      needsRevision: formatted.filter((card) => card.lastRating === 'NEEDS_REVISION').length,
      reviewedNow: formatted.filter((card) => !card.isDue).length,
      generatedAt: now,
    },
  };
}

export async function reviewFlashcard(userId, flashcardId, rating) {
  const flashcard = await prisma.flashcard.findUnique({
    where: { id: flashcardId },
    include: { course: { select: { id: true, published: true } } },
  });
  if (!flashcard || !flashcard.course.published) throw ApiError.notFound('Flashcard not found');
  await assertEnrolled(userId, flashcard.courseId);

  const previous = await prisma.flashcardReview.findFirst({
    where: { userId, flashcardId },
    orderBy: { reviewedAt: 'desc' },
  });

  const now = new Date();
  let repetitions;
  let intervalDays;

  if (rating === 'NEEDS_REVISION') {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions = (previous?.repetitions || 0) + 1;
    intervalDays = KNOWN_INTERVALS[Math.min(repetitions - 1, KNOWN_INTERVALS.length - 1)];
  }

  const dueAt = new Date(now.getTime() + intervalDays * DAY_MS);
  const cooldownMs = config.FLASHCARD_REVIEW_COOLDOWN_HOURS * 60 * 60 * 1000;
  const withinCooldown = previous && now.getTime() - previous.reviewedAt.getTime() < cooldownMs;

  const outcome = await prisma.$transaction(async (tx) => {
    const review = await tx.flashcardReview.create({
      data: {
        userId,
        flashcardId,
        rating,
        repetitions,
        intervalDays,
        dueAt,
      },
    });

    let xpAwarded = 0;
    if (!withinCooldown) {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { timezone: true } });
      const { start, end } = zonedDayRange(todayKey(user.timezone), user.timezone);
      const earned = await tx.xPTransaction.aggregate({
        where: { userId, reason: 'FLASHCARD_REVIEW', createdAt: { gte: start, lt: end } },
        _sum: { amount: true },
      });
      const remainingCap = Math.max(0, config.xp.flashcardDailyCap - (earned._sum.amount || 0));
      const amount = Math.min(config.xp.flashcardReview, remainingCap);
      const windowKey = Math.floor(now.getTime() / cooldownMs);

      if (amount > 0) {
        const award = await awardXp({
          userId,
          amount,
          reason: 'FLASHCARD_REVIEW',
          sourceType: 'FlashcardReview',
          sourceId: review.id,
          courseId: flashcard.courseId,
          idempotencyKey: `flash:${userId}:${flashcardId}:${windowKey}`,
          client: tx,
        });
        xpAwarded = award.amount;
      }
    }

    if (xpAwarded > 0) {
      await tx.flashcardReview.update({ where: { id: review.id }, data: { xpAwarded } });
    }

    return { review: { ...review, xpAwarded }, xpAwarded };
  });

  return {
    review: {
      id: outcome.review.id,
      flashcardId,
      rating,
      intervalDays,
      repetitions,
      dueAt,
      reviewedAt: outcome.review.reviewedAt,
      xpAwarded: outcome.xpAwarded,
      cooldownApplied: Boolean(withinCooldown),
    },
    xpAwarded: outcome.xpAwarded,
    cooldownHours: config.FLASHCARD_REVIEW_COOLDOWN_HOURS,
  };
}

export async function getDueFlashcards(userId, { limit = 30, courseId } = {}) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, ...(courseId ? { courseId } : {}) },
    select: { courseId: true },
  });
  if (enrollments.length === 0) return { cards: [], total: 0 };

  const cards = await prisma.flashcard.findMany({
    where: { courseId: { in: enrollments.map((entry) => entry.courseId) } },
    include: { course: { select: { id: true, title: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const reviews = await prisma.flashcardReview.findMany({
    where: { userId, flashcardId: { in: cards.map((card) => card.id) } },
    orderBy: { reviewedAt: 'desc' },
  });
  const latest = latestReviewMap(reviews);
  const now = new Date();

  const due = cards
    .map((card) => ({ card, review: latest.get(card.id) }))
    .filter(({ review }) => !review || review.dueAt <= now)
    .sort((a, b) => {
      const aDue = a.review?.dueAt?.getTime() ?? 0;
      const bDue = b.review?.dueAt?.getTime() ?? 0;
      return aDue - bDue || a.card.createdAt - b.card.createdAt;
    });

  return {
    cards: due.slice(0, limit).map(({ card, review }) => ({
      id: card.id,
      front: card.front,
      back: card.back,
      topic: card.topic,
      course: card.course,
      status: review ? 'due' : 'new',
      dueAt: review?.dueAt || null,
      repetitions: review?.repetitions || 0,
      lastRating: review?.rating || null,
    })),
    total: due.length,
  };
}

export async function getFlashcardOverview(userId) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: { course: { select: { id: true, title: true } } },
  });
  const courseIds = enrollments.map((entry) => entry.courseId);

  const [cards, reviews] = await Promise.all([
    prisma.flashcard.findMany({ where: { courseId: { in: courseIds } }, select: { id: true, courseId: true } }),
    prisma.flashcardReview.findMany({ where: { userId }, orderBy: { reviewedAt: 'desc' } }),
  ]);

  // All-time review count and daily activity.
  const [user, allReviewCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
    prisma.flashcardReview.count({ where: { userId } }),
  ]);
  const today = todayKey(user.timezone);
  const { start, end } = zonedDayRange(today, user.timezone);
  const reviewedToday = await prisma.flashcardReview.count({
    where: { userId, reviewedAt: { gte: start, lt: end } },
  });

  const latest = latestReviewMap(reviews);
  const now = new Date();
  const courses = enrollments.map((enrollment) => {
    const courseCards = cards.filter((card) => card.courseId === enrollment.courseId);
    const due = courseCards.filter((card) => {
      const review = latest.get(card.id);
      return !review || review.dueAt <= now;
    }).length;
    return {
      id: enrollment.course.id,
      title: enrollment.course.title,
      totalCards: courseCards.length,
      dueCards: due,
    };
  });

  return {
    courses,
    stats: {
      totalCards: cards.length,
      dueCards: courses.reduce((sum, course) => sum + course.dueCards, 0),
      reviewedToday,
      totalReviews: allReviewCount,
      knownCards: [...latest.values()].filter((review) => review.rating === 'KNOWN').length,
    },
    today,
  };
}

export async function countDueForCourse(userId, courseId) {
  const cards = await prisma.flashcard.findMany({ where: { courseId }, select: { id: true } });
  if (cards.length === 0) return 0;
  const reviews = await prisma.flashcardReview.findMany({
    where: { userId, flashcardId: { in: cards.map((card) => card.id) } },
    orderBy: { reviewedAt: 'desc' },
    select: { flashcardId: true, dueAt: true },
  });
  const latest = new Map();
  for (const review of reviews) if (!latest.has(review.flashcardId)) latest.set(review.flashcardId, review);
  const now = new Date();
  return cards.filter((card) => {
    const review = latest.get(card.id);
    return !review || review.dueAt <= now;
  }).length;
}
