import prisma from '../config/prisma.js';
import ApiError from '../utils/errors.js';
import { PUBLIC_USER_SELECT } from '../utils/serializers.js';
import { getTotalXp } from './xpService.js';

export async function getAdminStats() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [users, courses, enrollments, attempts, xp, activeToday, games] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.enrollment.count(),
    prisma.quizAttempt.count({ where: { status: 'SUBMITTED' } }),
    prisma.xPTransaction.aggregate({ _sum: { amount: true } }),
    prisma.xPTransaction.findMany({ where: { createdAt: { gte: since } }, distinct: ['userId'], select: { userId: true } }),
    prisma.gameSession.count({ where: { status: 'COMPLETED' } }),
  ]);

  return {
    users,
    courses,
    enrollments,
    quizAttempts: attempts,
    totalXpAwarded: xp._sum.amount || 0,
    activeLearners24h: activeToday.length,
    completedGames: games,
  };
}

export async function listAdminUsers({ search, page = 1, pageSize = 20 }) {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        ...PUBLIC_USER_SELECT,
        _count: { select: { enrollments: true, quizAttempts: true, userAchievements: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const withXp = await Promise.all(
    users.map(async (user) => ({
      ...user,
      totalXp: await getTotalXp(user.id),
    }))
  );

  return { users: withXp, total, page, pageSize };
}

export async function updateUserRole(actorId, targetId, role) {
  if (actorId === targetId) throw ApiError.badRequest('You cannot change your own role.');
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw ApiError.notFound('User not found');
  return prisma.user.update({
    where: { id: targetId },
    data: { role },
    select: PUBLIC_USER_SELECT,
  });
}
