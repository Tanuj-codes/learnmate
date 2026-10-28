import prisma from '../config/prisma.js';
import {
  dbDateToKey,
  formatDateKey,
  lastNDaysKeys,
  todayKey,
  zonedDayRange,
} from '../utils/dates.js';
import { getXpSummary, getTotalXp } from './xpService.js';
import { getStreakInfo, syncTodayGoal, consistencyForUser } from './goalService.js';
import { topicAccuracy } from './quizService.js';

export async function getCourseCompletion(userId) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    orderBy: { enrolledAt: 'asc' },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          estimatedMinutes: true,
          lessons: { select: { id: true } },
        },
      },
    },
  });

  const completions = await prisma.lessonProgress.findMany({
    where: { userId },
    select: { lessonId: true, completedAt: true, lesson: { select: { courseId: true } } },
  });

  const byCourse = new Map();
  for (const row of completions) {
    if (!byCourse.has(row.lesson.courseId)) byCourse.set(row.lesson.courseId, []);
    byCourse.get(row.lesson.courseId).push(row.completedAt);
  }

  return enrollments.map((enrollment) => {
    const totalLessons = enrollment.course.lessons.length;
    const courseCompletions = byCourse.get(enrollment.courseId) || [];
    const completedLessons = Math.min(totalLessons, courseCompletions.length);
    const lastActivity = courseCompletions.length
      ? new Date(Math.max(...courseCompletions.map((date) => date.getTime())))
      : enrollment.enrolledAt;
    return {
      courseId: enrollment.course.id,
      title: enrollment.course.title,
      slug: enrollment.course.slug,
      enrolledAt: enrollment.enrolledAt,
      totalLessons,
      completedLessons,
      percent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
      lastActivity,
      estimatedMinutes: enrollment.course.estimatedMinutes,
    };
  });
}

export async function getOverview(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, timezone: true, createdAt: true, dailyGoalXp: true, weeklyGoalDays: true },
  });

  const [xp, todayGoal, streak, courseCompletion, quizAgg, flashcards, games, achievements, lessonsCompleted, consistency] =
    await Promise.all([
      getXpSummary(userId),
      syncTodayGoal(userId),
      getStreakInfo(userId, user.timezone),
      getCourseCompletion(userId),
      prisma.quizAttempt.aggregate({
        where: { userId, status: 'SUBMITTED', verified: true },
        _count: { _all: true },
        _avg: { score: true },
        _max: { score: true },
      }),
      prisma.flashcardReview.count({ where: { userId } }),
      prisma.gameSession.count({ where: { userId, status: 'COMPLETED', verified: true } }),
      prisma.userAchievement.count({ where: { userId } }),
      prisma.lessonProgress.count({ where: { userId } }),
      consistencyForUser(userId, { windowDays: 30, timeZone: user.timezone }),
    ]);

  const totalLessons = courseCompletion.reduce((sum, course) => sum + course.totalLessons, 0);
  const completedCourses = courseCompletion.filter((course) => course.percent === 100).length;
  const topics = await topicAccuracy(userId);

  return {
    user: {
      id: user.id,
      createdAt: user.createdAt,
      dailyGoalXp: user.dailyGoalXp,
      weeklyGoalDays: user.weeklyGoalDays,
    },
    xp: {
      totalXp: xp.totalXp,
      level: xp.level,
      xpIntoLevel: xp.xpIntoLevel,
      xpToNextLevel: xp.xpToNextLevel,
      progressPercent: xp.progressPercent,
      nextLevelXp: xp.nextLevelXp,
    },
    todayGoal,
    streak,
    consistency,
    learning: {
      coursesEnrolled: courseCompletion.length,
      coursesCompleted: completedCourses,
      lessonsCompleted,
      totalLessons,
      lessonCompletionPercent: totalLessons ? Math.round((lessonsCompleted / totalLessons) * 100) : 0,
      quizzesTaken: quizAgg._count._all,
      averageQuizScore: Math.round(quizAgg._avg.score || 0),
      bestQuizScore: quizAgg._max.score || 0,
      flashcardsReviewed: flashcards,
      gamesCompleted: games,
      achievementsUnlocked: achievements,
    },
    courses: courseCompletion,
    topicAccuracy: topics,
  };
}

export async function getWeeklyAnalytics(userId, { days = 7 } = {}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = todayKey(user.timezone);
  const dayKeys = lastNDaysKeys(days, user.timezone);
  const { start } = zonedDayRange(dayKeys[0], user.timezone);
  const { end } = zonedDayRange(today, user.timezone);

  const [transactions, lessons, attempts, reviews, games, goals, totalXp] = await Promise.all([
    prisma.xPTransaction.findMany({
      where: { userId, createdAt: { gte: start, lt: end } },
      select: { amount: true, createdAt: true },
    }),
    prisma.lessonProgress.findMany({
      where: { userId, completedAt: { gte: start, lt: end } },
      select: { completedAt: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId, status: 'SUBMITTED', verified: true, submittedAt: { gte: start, lt: end } },
      select: { score: true, submittedAt: true },
    }),
    prisma.flashcardReview.findMany({
      where: { userId, reviewedAt: { gte: start, lt: end } },
      select: { reviewedAt: true },
    }),
    prisma.gameSession.findMany({
      where: { userId, status: 'COMPLETED', verified: true, completedAt: { gte: start, lt: end } },
      select: { completedAt: true },
    }),
    prisma.dailyGoal.findMany({
      where: { userId, date: { gte: new Date(`${dayKeys[0]}T00:00:00.000Z`), lte: new Date(`${today}T00:00:00.000Z`) } },
      select: { date: true, completed: true, xpEarned: true, targetXp: true },
    }),
    getTotalXp(userId),
  ]);

  const rowByKey = new Map(
    dayKeys.map((key) => [
      key,
      {
        date: key,
        label: formatDateKey(key),
        xp: 0,
        lessons: 0,
        quizzes: 0,
        quizScoreTotal: 0,
        flashcards: 0,
        games: 0,
        goalCompleted: false,
        goalStatus: 'no-goal',
        goalXp: 0,
        goalTarget: 0,
      },
    ])
  );

  const keyFor = (date) => new Intl.DateTimeFormat('en-CA', {
    timeZone: user.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

  for (const transaction of transactions) {
    const row = rowByKey.get(keyFor(transaction.createdAt));
    if (row) row.xp += transaction.amount;
  }
  for (const lesson of lessons) {
    const row = rowByKey.get(keyFor(lesson.completedAt));
    if (row) row.lessons += 1;
  }
  for (const attempt of attempts) {
    const row = rowByKey.get(keyFor(attempt.submittedAt));
    if (row) {
      row.quizzes += 1;
      row.quizScoreTotal += attempt.score || 0;
    }
  }
  for (const review of reviews) {
    const row = rowByKey.get(keyFor(review.reviewedAt));
    if (row) row.flashcards += 1;
  }
  for (const game of games) {
    const row = rowByKey.get(keyFor(game.completedAt));
    if (row) row.games += 1;
  }
  for (const goal of goals) {
    const row = rowByKey.get(dbDateToKey(goal.date));
    if (row) {
      row.goalCompleted = goal.completed;
      row.goalStatus = goal.completed ? 'complete' : 'incomplete';
      row.goalXp = goal.xpEarned;
      row.goalTarget = goal.targetXp;
    }
  }

  const xpBeforeWindow = totalXp - transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  let cumulative = xpBeforeWindow;

  const rows = dayKeys.map((key) => {
    const row = rowByKey.get(key);
    cumulative += row.xp;
    return {
      ...row,
      averageQuizScore: row.quizzes ? Math.round(row.quizScoreTotal / row.quizzes) : null,
      cumulativeXp: cumulative,
    };
  });

  const quizRows = rows.filter((row) => row.quizzes > 0);
  const completedGoals = rows.filter((row) => row.goalCompleted).length;

  return {
    periodDays: days,
    timezone: user.timezone,
    rows,
    summary: {
      xp: rows.reduce((sum, row) => sum + row.xp, 0),
      lessons: rows.reduce((sum, row) => sum + row.lessons, 0),
      quizzes: rows.reduce((sum, row) => sum + row.quizzes, 0),
      flashcards: rows.reduce((sum, row) => sum + row.flashcards, 0),
      games: rows.reduce((sum, row) => sum + row.games, 0),
      completedGoals,
      goalCompletionRate: Math.round((completedGoals / Math.max(1, days)) * 100),
      averageQuizScore: quizRows.length
        ? Math.round(quizRows.reduce((sum, row) => sum + (row.averageQuizScore || 0), 0) / quizRows.length)
        : null,
      activeDays: rows.filter((row) => row.xp > 0 || row.lessons > 0 || row.quizzes > 0).length,
      totalXp,
    },
    generatedAt: new Date(),
  };
}

export { topicAccuracy };
