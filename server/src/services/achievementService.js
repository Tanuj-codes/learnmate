import prisma from '../config/prisma.js';
import { awardXp, getTotalXp } from './xpService.js';
import { dbDateToKey, diffDaysKeys } from '../utils/dates.js';

async function buildStats(userId) {
  const [lessons, quizAgg, perfect, totalXp, flashcards, games, goals, enrollments] = await Promise.all([
    prisma.lessonProgress.count({ where: { userId } }),
    prisma.quizAttempt.count({ where: { userId, status: 'SUBMITTED', verified: true } }),
    prisma.quizAttempt.count({ where: { userId, status: 'SUBMITTED', verified: true, score: 100 } }),
    getTotalXp(userId),
    prisma.flashcardReview.count({ where: { userId } }),
    prisma.gameSession.count({ where: { userId, status: 'COMPLETED', verified: true } }),
    prisma.dailyGoal.findMany({ where: { userId, completed: true }, select: { date: true } }),
    prisma.enrollment.findMany({
      where: { userId },
      select: {
        courseId: true,
        course: { select: { lessons: { select: { id: true } } } },
      },
    }),
  ]);

  const completions = await prisma.lessonProgress.findMany({
    where: { userId },
    select: { lesson: { select: { courseId: true } } },
  });
  const completedByCourse = new Map();
  for (const row of completions) {
    const courseId = row.lesson.courseId;
    completedByCourse.set(courseId, (completedByCourse.get(courseId) || 0) + 1);
  }

  const completedCourses = enrollments.filter((enrollment) => {
    const total = enrollment.course.lessons.length;
    return total > 0 && (completedByCourse.get(enrollment.courseId) || 0) >= total;
  }).length;

  const goalKeys = goals.map((goal) => dbDateToKey(goal.date)).sort();
  let bestStreak = 0;
  let run = 0;
  let previous = null;
  for (const key of goalKeys) {
    if (previous && diffDaysKeys(previous, key) === 1) run += 1;
    else run = 1;
    bestStreak = Math.max(bestStreak, run);
    previous = key;
  }

  return {
    LESSONS_COMPLETED: lessons,
    QUIZ_ATTEMPTS: quizAgg,
    PERFECT_QUIZZES: perfect,
    STREAK_DAYS: bestStreak,
    TOTAL_XP: totalXp,
    FLASHCARD_REVIEWS: flashcards,
    GAME_SESSIONS: games,
    GOALS_COMPLETED: goals.length,
    COURSE_COMPLETIONS: completedCourses,
  };
}

export async function evaluateAchievements(userId) {
  const [definitions, owned, stats] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievement: { select: { code: true } } } }),
    buildStats(userId),
  ]);

  const ownedCodes = new Set(owned.map((row) => row.achievement.code));
  const unlocked = [];

  for (const definition of definitions) {
    if (ownedCodes.has(definition.code)) continue;
    const current = stats[definition.criteriaType] ?? 0;
    if (current < definition.criteriaValue) continue;

    const created = await prisma.userAchievement.createMany({
      data: [{ userId, achievementId: definition.id }],
      skipDuplicates: true,
    });
    if (created.count === 0) continue;

    await awardXp({
      userId,
      amount: definition.xpReward,
      reason: 'ACHIEVEMENT',
      sourceType: 'Achievement',
      sourceId: definition.id,
      idempotencyKey: `achievement:${userId}:${definition.code}`,
    });

    await prisma.notification.createMany({
      data: [
        {
          userId,
          type: 'ACHIEVEMENT',
          title: `Achievement unlocked: ${definition.name}`,
          message: `${definition.description} +${definition.xpReward} XP bonus.`,
          link: '/achievements',
          dedupeKey: `achievement:${definition.code}`,
        },
      ],
      skipDuplicates: true,
    });

    unlocked.push({
      code: definition.code,
      name: definition.name,
      icon: definition.icon,
      tier: definition.tier,
      xpReward: definition.xpReward,
    });
  }

  return { unlocked, stats };
}

export async function getAchievementCatalog(userId) {
  // Read-only: badge evaluation only runs after reward-earning actions (see
  // progressService.finalizeProgress), so opening this page cannot award XP.
  const [definitions, owned] = await Promise.all([
    prisma.achievement.findMany({ orderBy: [{ sortOrder: 'asc' }] }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true, unlockedAt: true } }),
  ]);
  const ownedById = new Map(owned.map((row) => [row.achievementId, row.unlockedAt]));

  const achievements = definitions.map((definition) => ({
    id: definition.id,
    code: definition.code,
    name: definition.name,
    description: definition.description,
    icon: definition.icon,
    tier: definition.tier,
    criteriaType: definition.criteriaType,
    criteriaValue: definition.criteriaValue,
    xpReward: definition.xpReward,
    unlocked: ownedById.has(definition.id),
    unlockedAt: ownedById.get(definition.id) || null,
  }));

  return {
    achievements,
    unlockedCount: achievements.filter((achievement) => achievement.unlocked).length,
    totalCount: achievements.length,
  };
}

export { buildStats };
