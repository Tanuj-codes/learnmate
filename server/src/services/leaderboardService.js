import prisma from '../config/prisma.js';
import config from '../config/env.js';
import ApiError from '../utils/errors.js';
import { addDaysToKey, diffDaysKeys, todayKey } from '../utils/dates.js';

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function enrollmentDateKey(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

async function assertEnrolled(userId, courseId) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  });
  if (!enrollment) throw ApiError.forbidden('Enroll in this course to view its leaderboard.');
}

async function buildKnowledgeRanking(courseId) {
  const now = new Date();
  const attemptsCutoff = new Date(now.getTime() - config.LEADERBOARD_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const goalsCutoff = new Date(now.getTime() - (config.LEADERBOARD_WINDOW_DAYS + 2) * 24 * 60 * 60 * 1000);

  const candidates = await prisma.enrollment.findMany({
    where: { courseId },
    orderBy: { enrolledAt: 'asc' },
    take: 500,
    select: {
      userId: true,
      enrolledAt: true,
      user: { select: { id: true, name: true, avatarColor: true, timezone: true } },
    },
  });
  if (candidates.length === 0) return [];

  const userIds = candidates.map((candidate) => candidate.userId);

  const [attempts, completedGoals] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: {
        userId: { in: userIds },
        quiz: { courseId },
        status: 'SUBMITTED',
        verified: true,
      },
      select: { userId: true, quizId: true, score: true, submittedAt: true },
      orderBy: { submittedAt: 'asc' },
    }),
    prisma.dailyGoal.findMany({
      where: {
        userId: { in: userIds },
        completed: true,
        date: { gte: goalsCutoff },
      },
      select: { userId: true, date: true },
    }),
  ]);

  const attemptsByUser = new Map();
  for (const attempt of attempts) {
    if (!attemptsByUser.has(attempt.userId)) attemptsByUser.set(attempt.userId, []);
    attemptsByUser.get(attempt.userId).push(attempt);
  }

  const goalsByUser = new Map();
  for (const goal of completedGoals) {
    if (!goalsByUser.has(goal.userId)) goalsByUser.set(goal.userId, []);
    goalsByUser.get(goal.userId).push(new Date(goal.date).toISOString().slice(0, 10));
  }

  const entries = candidates.map((candidate) => {
    const user = candidate.user;
    const userAttempts = attemptsByUser.get(user.id) || [];

    const firstByQuiz = new Map();
    for (const attempt of userAttempts) {
      if (!firstByQuiz.has(attempt.quizId)) firstByQuiz.set(attempt.quizId, attempt);
    }
    const baselineScores = [...firstByQuiz.values()].map((attempt) => attempt.score ?? 0);

    const recent = userAttempts.filter((attempt) => attempt.submittedAt >= attemptsCutoff);
    const bestRecentByQuiz = new Map();
    for (const attempt of recent) {
      const current = bestRecentByQuiz.get(attempt.quizId);
      if (current === undefined || (attempt.score ?? 0) > current) {
        bestRecentByQuiz.set(attempt.quizId, attempt.score ?? 0);
      }
    }

    const performance = Math.round(average([...bestRecentByQuiz.values()]));
    const baselineAverage = Math.round(average(baselineScores));
    const hasBaseline = baselineScores.length > 0;
    const hasRecentAssessment = recent.length > 0;
    const improvement =
      hasBaseline && hasRecentAssessment
        ? Math.round(clamp((performance - baselineAverage) * config.LEADERBOARD_IMPROVEMENT_SCALE))
        : 0;

    const today = todayKey(user.timezone, now);
    const windowStartKey = addDaysToKey(today, -(config.LEADERBOARD_WINDOW_DAYS - 1));
    const enrolledKey = enrollmentDateKey(candidate.enrolledAt, user.timezone);
    const startKey = enrolledKey > windowStartKey ? enrolledKey : windowStartKey;
    const eligibleDays = Math.max(1, diffDaysKeys(startKey, today) + 1);
    const completedInWindow = (goalsByUser.get(user.id) || []).filter((key) => key >= startKey && key <= today).length;
    const consistency = Math.min(100, Math.round((completedInWindow / eligibleDays) * 100));

    const knowledgeScore = round1(
      config.leaderboardWeights.performance * performance +
        config.leaderboardWeights.improvement * improvement +
        config.leaderboardWeights.consistency * consistency
    );

    const lastSubmittedAt = recent.length
      ? new Date(Math.max(...recent.map((attempt) => attempt.submittedAt.getTime())))
      : null;

    return {
      userId: user.id,
      name: user.name,
      avatarColor: user.avatarColor,
      knowledgeScore,
      components: {
        performance,
        improvement,
        consistency,
      },
      metrics: {
        recentAssessments: recent.length,
        baselineAssessments: baselineScores.length,
        eligibleDays,
        completedGoalDays: completedInWindow,
        lastSubmittedAt,
      },
      insufficientAssessmentHistory: !hasRecentAssessment,
      missingBaseline: !hasBaseline,
      isMe: false,
    };
  });

  entries.sort((a, b) => {
    if (b.knowledgeScore !== a.knowledgeScore) return b.knowledgeScore - a.knowledgeScore;
    if (b.components.performance !== a.components.performance) return b.components.performance - a.components.performance;
    if (b.components.consistency !== a.components.consistency) return b.components.consistency - a.components.consistency;
    const aLast = a.metrics.lastSubmittedAt?.getTime() ?? Number.POSITIVE_INFINITY;
    const bLast = b.metrics.lastSubmittedAt?.getTime() ?? Number.POSITIVE_INFINITY;
    if (aLast !== bLast) return aLast - bLast;
    return a.userId.localeCompare(b.userId);
  });

  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

async function buildXpRanking(courseId) {
  const candidates = await prisma.enrollment.findMany({
    where: { courseId },
    select: { userId: true, user: { select: { id: true, name: true, avatarColor: true } } },
    take: 500,
  });
  if (candidates.length === 0) return [];

  const grouped = await prisma.xPTransaction.groupBy({
    by: ['userId'],
    where: { courseId, userId: { in: candidates.map((candidate) => candidate.userId) } },
    _sum: { amount: true },
    _max: { createdAt: true },
  });
  const groupedById = new Map(grouped.map((row) => [row.userId, row]));

  return candidates
    .map((candidate) => {
      const row = groupedById.get(candidate.user.id);
      return {
        userId: candidate.user.id,
        name: candidate.user.name,
        avatarColor: candidate.user.avatarColor,
        courseXp: row?._sum.amount || 0,
        lastXpAt: row?._max.createdAt || null,
        isMe: false,
      };
    })
    .sort((a, b) => {
      if (b.courseXp !== a.courseXp) return b.courseXp - a.courseXp;
      const aTime = a.lastXpAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const bTime = b.lastXpAt?.getTime() ?? Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime;
      return a.userId.localeCompare(b.userId);
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function publicPolicy() {
  const { performance, improvement, consistency } = config.leaderboardWeights;
  return {
    formula: `${Math.round(performance * 100)}% Test Performance + ${Math.round(improvement * 100)}% Improvement + ${Math.round(consistency * 100)}% Consistency`,
    weights: config.leaderboardWeights,
    windowDays: config.LEADERBOARD_WINDOW_DAYS,
    performance:
      'Average of each learner\'s best verified quiz score per quiz across the course in the evaluation window. No verified attempts = 0.',
    improvement:
      'Percentage-point gain from the learner\'s first-attempt baseline on each quiz, scaled by ' +
      `${config.LEADERBOARD_IMPROVEMENT_SCALE} and capped at 100. No baseline or no recent attempt = 0.`,
    consistency:
      'Completed daily goals divided by eligible days since enrollment (capped at the window length). Missing goals count as incomplete.',
    insufficientHistory:
      'Learners without verified assessment history are scored on a 0 performance/improvement basis, not treated as perfect. Rankings are recalculated on every request from verified attempts and persisted goal data.',
  };
}

export async function getCourseLeaderboard(courseId, userId, { board = 'knowledge', page = 1, pageSize = 10 } = {}) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, title: true, published: true } });
  if (!course || !course.published) throw ApiError.notFound('Course not found');
  await assertEnrolled(userId, courseId);

  const full = board === 'xp' ? await buildXpRanking(courseId) : await buildKnowledgeRanking(courseId);
  const withMe = full.map((entry) => ({ ...entry, isMe: entry.userId === userId }));
  const start = (page - 1) * pageSize;
  const entries = withMe.slice(start, start + pageSize);
  const me = withMe.find((entry) => entry.userId === userId) || null;

  return {
    course,
    board,
    entries,
    page,
    pageSize,
    total: withMe.length,
    totalPages: Math.max(1, Math.ceil(withMe.length / pageSize)),
    me,
    policy: board === 'knowledge' ? publicPolicy() : {
      formula: 'Course XP = sum of verified XP earned in this course. Knowledge rank is separate.',
      xpRewards: config.xp,
    },
    generatedAt: new Date(),
  };
}

export async function getMyCourseRank(courseId, userId, { board = 'knowledge' } = {}) {
  const result = await getCourseLeaderboard(courseId, userId, { board, page: 1, pageSize: 1 });
  return {
    course: result.course,
    board,
    me: result.me,
    total: result.total,
    policy: result.policy,
  };
}

export { buildKnowledgeRanking, buildXpRanking, publicPolicy };
