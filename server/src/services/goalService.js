import prisma from '../config/prisma.js';
import config from '../config/env.js';
import ApiError from '../utils/errors.js';
import { awardXp } from './xpService.js';
import {
  addDaysToKey,
  dateKeyToDbDate,
  dbDateToKey,
  diffDaysKeys,
  lastNDaysKeys,
  todayKey,
  zonedDayRange,
  zonedParts,
} from '../utils/dates.js';

function emptyToNull(value) {
  return value === undefined ? null : value;
}

export async function getTodayXp(userId, timeZone) {
  const dateKey = todayKey(timeZone);
  const { start, end } = zonedDayRange(dateKey, timeZone);
  const aggregate = await prisma.xPTransaction.aggregate({
    where: { userId, createdAt: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  return { dateKey, xp: Math.max(0, aggregate._sum.amount || 0) };
}

/**
 * Recalculate today's goal progress.
 *
 * `award` defaults to false so read-only endpoints (dashboard, goals, analytics,
 * notifications) can display accurate progress without ever creating XP as a
 * side effect of a page view. Only write actions call this with `award: true`
 * (directly or through progressService.finalizeProgress).
 */
export async function syncTodayGoal(userId, now = new Date(), { award = false } = {}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true, dailyGoalXp: true },
  });
  if (!user) throw ApiError.notFound('User not found');

  const dateKey = todayKey(user.timezone, now);
  const { start, end } = zonedDayRange(dateKey, user.timezone);
  const aggregate = await prisma.xPTransaction.aggregate({
    // The daily-goal bonus is a reward for finishing the goal, so it must not
    // count toward the goal's own progress. Otherwise every completed goal
    // drifts to target + 10 XP on the next sync.
    where: { userId, reason: { not: 'DAILY_GOAL' }, createdAt: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  const xpToday = Math.max(0, aggregate._sum.amount || 0);
  const dbDate = dateKeyToDbDate(dateKey);
  const existingGoal = await prisma.dailyGoal.findUnique({
    where: { userId_date: { userId, date: dbDate } },
  });
  // Never reduce a completed goal's recorded XP. Completed goals keep their
  // earned total even if the day's transaction window is later re-evaluated.
  const nextXpEarned = existingGoal?.completed ? Math.max(existingGoal.xpEarned, xpToday) : xpToday;

  let goal = await prisma.dailyGoal.upsert({
    where: { userId_date: { userId, date: dbDate } },
    create: { userId, date: dbDate, targetXp: user.dailyGoalXp, xpEarned: nextXpEarned },
    update: { xpEarned: nextXpEarned },
  });

  let goalXpAwarded = 0;

  if (award && !goal.completed && goal.xpEarned >= goal.targetXp) {
    const outcome = await prisma.$transaction(async (tx) => {
      const fresh = await tx.dailyGoal.findUnique({ where: { id: goal.id } });
      if (!fresh || fresh.completed) return { goal: fresh, awarded: 0 };

      const completedGoal = await tx.dailyGoal.update({
        where: { id: fresh.id },
        data: { completed: true, completedAt: now },
      });

      const award = await awardXp({
        userId,
        amount: config.xp.dailyGoal,
        reason: 'DAILY_GOAL',
        sourceType: 'DailyGoal',
        sourceId: fresh.id,
        idempotencyKey: `daily-goal:${fresh.id}`,
        client: tx,
      });

      if (!award.awarded) return { goal: completedGoal, awarded: 0 };

      return { goal: completedGoal, awarded: config.xp.dailyGoal };
    });
    goal = outcome.goal || goal;
    goalXpAwarded = outcome.awarded;
  }

  return {
    id: goal.id,
    date: dbDateToKey(goal.date),
    targetXp: goal.targetXp,
    xpEarned: goal.xpEarned,
    completed: goal.completed,
    completedAt: goal.completedAt,
    percent: Math.min(100, Math.round((goal.xpEarned / Math.max(1, goal.targetXp)) * 100)),
    remainingXp: Math.max(0, goal.targetXp - goal.xpEarned),
    timezone: user.timezone,
    deadline: zonedDayRange(addDaysToKey(dateKey, 1), user.timezone).start,
    goalXpAwarded,
  };
}

export async function getStreakInfo(userId, timeZone) {
  const [completedGoals, totalCompleted] = await Promise.all([
    prisma.dailyGoal.findMany({
      where: { userId, completed: true },
      orderBy: { date: 'desc' },
      select: { date: true },
    }),
    prisma.dailyGoal.count({ where: { userId, completed: true } }),
  ]);

  const keys = completedGoals.map((goal) => dbDateToKey(goal.date));
  const today = todayKey(timeZone, new Date());
  const yesterday = addDaysToKey(today, -1);

  let currentStreak = 0;
  if (keys[0] === today || keys[0] === yesterday) {
    let cursor = keys[0];
    for (const key of keys) {
      if (key === cursor) {
        currentStreak += 1;
        cursor = addDaysToKey(cursor, -1);
      } else if (key < cursor) {
        break;
      }
    }
  }

  let bestStreak = 0;
  let run = 0;
  let previous = null;
  for (const key of [...keys].reverse()) {
    if (previous && diffDaysKeys(previous, key) === 1) run += 1;
    else run = 1;
    bestStreak = Math.max(bestStreak, run);
    previous = key;
  }

  return {
    currentStreak,
    bestStreak,
    lifetimeGoalDays: totalCompleted,
    missedYesterday: !keys.includes(yesterday),
  };
}

function buildRecoveryPlan(goal, user, now, timeZone) {
  const localHour = zonedParts(now, timeZone).hour;
  const quickWins = [];

  if (!goal.completed) {
    quickWins.push({
      label: 'Finish one short lesson',
      xp: config.xp.lessonComplete,
      href: '/courses',
    });
    quickWins.push({
      label: `Review ${Math.max(1, Math.ceil(goal.remainingXp / Math.max(1, config.xp.flashcardReview)))} flashcards`,
      xp: Math.min(goal.remainingXp, config.xp.flashcardDailyCap),
      href: '/flashcards',
    });
    quickWins.push({ label: 'Play a 2-minute knowledge game', xp: config.xp.gameComplete, href: '/games' });
  }

  const almostThere = !goal.completed && goal.percent >= 50;
  const lateInDay = localHour >= 17;

  let message;
  if (goal.completed) {
    message = 'Today is complete. Anything else you do now is a bonus, not a requirement.';
  } else if (almostThere) {
    message = `You are ${goal.remainingXp} XP away. One focused activity is enough - no need to catch up on everything at once.`;
  } else if (lateInDay) {
    message = 'The day is winding down, but a small step still counts. Pick the smallest option below.';
  } else {
    message = 'A fresh goal is ready when you are. Start with one small activity to build momentum.';
  }

  return {
    neededXp: goal.remainingXp,
    message,
    quickWins: quickWins.slice(0, 3),
    resumeRecommended: !goal.completed,
    weeklyTarget: user.weeklyGoalDays,
  };
}

export async function getGoalDashboard(userId, { days = 14 } = {}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true, dailyGoalXp: true, weeklyGoalDays: true, createdAt: true },
  });
  if (!user) throw ApiError.notFound('User not found');

  const now = new Date();
  const today = await syncTodayGoal(userId, now);
  const streak = await getStreakInfo(userId, user.timezone);

  const dayKeys = lastNDaysKeys(days, user.timezone, now);
  const goals = await prisma.dailyGoal.findMany({
    where: { userId, date: { gte: dateKeyToDbDate(dayKeys[0]), lte: dateKeyToDbDate(dayKeys[dayKeys.length - 1]) } },
    orderBy: { date: 'asc' },
  });

  const byDate = new Map(goals.map((goal) => [dbDateToKey(goal.date), goal]));
  const history = dayKeys.map((key) => {
    const goal = byDate.get(key);
    return {
      date: key,
      status: goal ? (goal.completed ? 'complete' : 'incomplete') : 'no-goal',
      targetXp: goal?.targetXp ?? user.dailyGoalXp,
      xpEarned: goal?.xpEarned ?? 0,
      completed: goal?.completed ?? false,
    };
  });

  const weekKeys = lastNDaysKeys(7, user.timezone, now);
  const weekGoals = weekKeys.map((key) => byDate.get(key)).filter(Boolean);
  const weeklyCompleted = weekGoals.filter((goal) => goal.completed).length;
  const weeklyXp = weekGoals.reduce((sum, goal) => sum + goal.xpEarned, 0);

  const yesterday = addDaysToKey(today.date, -1);
  const yesterdayGoal = byDate.get(yesterday);
  const recovery = buildRecoveryPlan(today, user, now, user.timezone);

  return {
    today,
    streak,
    history,
    weekly: {
      days: weekKeys,
      completed: weeklyCompleted,
      target: user.weeklyGoalDays,
      xp: weeklyXp,
      percent: Math.min(100, Math.round((weeklyCompleted / Math.max(1, user.weeklyGoalDays)) * 100)),
      missedYesterday: Boolean(yesterdayGoal && !yesterdayGoal.completed),
    },
    recovery,
  };
}

export async function createOrUpdateTodayGoal(userId, targetXp) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true, dailyGoalXp: true },
  });
  if (!user) throw ApiError.notFound('User not found');

  const dateKey = todayKey(user.timezone);
  const dbDate = dateKeyToDbDate(dateKey);
  await prisma.dailyGoal.upsert({
    where: { userId_date: { userId, date: dbDate } },
    create: { userId, date: dbDate, targetXp, xpEarned: 0 },
    update: { targetXp },
  });
  // Changing the target is a write action, so it may finalize a goal that the
  // new target completes immediately (for example, lowering the target below
  // XP already earned today).
  await syncTodayGoal(userId, new Date(), { award: true });
  return getGoalDashboard(userId);
}

export async function updateGoal(userId, goalId, targetXp) {
  const goal = await prisma.dailyGoal.findUnique({ where: { id: goalId } });
  if (!goal) throw ApiError.notFound('Goal not found');
  if (goal.userId !== userId) throw ApiError.forbidden('You can only change your own goals.');

  await prisma.dailyGoal.update({ where: { id: goalId }, data: { targetXp } });
  await syncTodayGoal(userId, new Date(), { award: true });
  return getGoalDashboard(userId);
}

export async function consistencyForUser(userId, { windowDays = config.LEADERBOARD_WINDOW_DAYS, timeZone = 'UTC', now = new Date() } = {}) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId },
    orderBy: { enrolledAt: 'asc' },
    select: { enrolledAt: true },
  });
  if (!enrollment) return { consistency: 0, completedGoals: 0, eligibleDays: 0 };

  const today = todayKey(timeZone, now);
  const windowStart = addDaysToKey(today, -(windowDays - 1));
  const enrollmentKey = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(enrollment.enrolledAt);

  const startKey = enrollmentKey > windowStart ? enrollmentKey : windowStart;
  const eligibleDays = Math.max(1, diffDaysKeys(startKey, today) + 1);

  const completedGoals = await prisma.dailyGoal.count({
    where: {
      userId,
      completed: true,
      date: { gte: dateKeyToDbDate(startKey), lte: dateKeyToDbDate(today) },
    },
  });

  return {
    consistency: Math.min(100, Math.round((completedGoals / eligibleDays) * 100)),
    completedGoals,
    eligibleDays,
    startKey,
  };
}

export { buildRecoveryPlan, emptyToNull };
