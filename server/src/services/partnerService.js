import prisma from '../config/prisma.js';
import ApiError from '../utils/errors.js';
import { dateKeyToDbDate, todayKey, zonedDayRange } from '../utils/dates.js';
import { createNotification } from './notificationService.js';

const USER_SUMMARY_SELECT = { id: true, name: true, avatarColor: true, timezone: true, dailyGoalXp: true };

async function partnerProgress(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SUMMARY_SELECT });
  const dateKey = todayKey(user.timezone);
  const { start, end } = zonedDayRange(dateKey, user.timezone);

  const [goal, completedGoals, xpToday, totalXp, streakGoals] = await Promise.all([
    prisma.dailyGoal.findUnique({ where: { userId_date: { userId, date: dateKeyToDbDate(dateKey) } } }),
    prisma.dailyGoal.count({ where: { userId, completed: true } }),
    prisma.xPTransaction.aggregate({
      where: { userId, createdAt: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.xPTransaction.aggregate({ where: { userId }, _sum: { amount: true } }),
    prisma.dailyGoal.findMany({
      where: { userId, completed: true },
      orderBy: { date: 'desc' },
      take: 60,
      select: { date: true },
    }),
  ]);

  let currentStreak = 0;
  let cursor = new Date(`${dateKey}T00:00:00.000Z`);
  const completedKeys = new Set(streakGoals.map((row) => new Date(row.date).toISOString().slice(0, 10)));
  const today = cursor.toISOString().slice(0, 10);
  const yesterday = new Date(cursor.getTime() - 86400000).toISOString().slice(0, 10);
  const startCursor = completedKeys.has(today) ? today : completedKeys.has(yesterday) ? yesterday : null;
  if (startCursor) {
    cursor = new Date(`${startCursor}T00:00:00.000Z`);
    while (completedKeys.has(cursor.toISOString().slice(0, 10))) {
      currentStreak += 1;
      cursor = new Date(cursor.getTime() - 86400000);
    }
  }

  return {
    user,
    today: {
      date: dateKey,
      xpEarned: goal?.xpEarned ?? Math.max(0, xpToday._sum.amount || 0),
      targetXp: goal?.targetXp ?? user.dailyGoalXp ?? 50,
      completed: goal?.completed ?? false,
    },
    completedGoals,
    currentStreak,
    totalXp: totalXp._sum.amount || 0,
  };
}

export async function listPartners(userId) {
  const relations = await prisma.studyPartner.findMany({
    where: { OR: [{ requesterId: userId }, { partnerId: userId }] },
    orderBy: { createdAt: 'desc' },
    include: {
      requester: { select: { id: true, name: true, avatarColor: true } },
      partner: { select: { id: true, name: true, avatarColor: true } },
    },
  });

  const formatted = [];
  for (const relation of relations) {
    const isRequester = relation.requesterId === userId;
    const otherUser = isRequester ? relation.partner : relation.requester;
    const otherConsent = isRequester ? relation.partnerConsent : relation.requesterConsent;
    const myConsent = isRequester ? relation.requesterConsent : relation.partnerConsent;

    let progress = null;
    if (relation.status === 'ACCEPTED' && otherConsent) {
      progress = await partnerProgress(otherUser.id);
    }

    formatted.push({
      id: relation.id,
      status: relation.status,
      direction: relation.status === 'PENDING' ? (isRequester ? 'outgoing' : 'incoming') : 'accepted',
      user: otherUser,
      myConsent,
      otherConsent,
      progress,
      createdAt: relation.createdAt,
      updatedAt: relation.updatedAt,
    });
  }

  const accepted = formatted.filter((row) => row.status === 'ACCEPTED');
  const incoming = formatted.filter((row) => row.direction === 'incoming');
  const outgoing = formatted.filter((row) => row.direction === 'outgoing');

  return {
    accepted,
    incoming,
    outgoing,
    sharingNote:
      'Progress is only shared when both partners accept and the person whose progress is shown has explicitly turned sharing on.',
  };
}

export async function requestPartner(userId, email, shareProgress = true) {
  const target = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!target) throw ApiError.notFound('No LearnMate learner was found with that email.');
  if (target.id === userId) throw ApiError.badRequest('You cannot add yourself as an accountability partner.');

  const existing = await prisma.studyPartner.findFirst({
    where: {
      OR: [
        { requesterId: userId, partnerId: target.id },
        { requesterId: target.id, partnerId: userId },
      ],
    },
  });
  if (existing) {
    if (existing.status === 'ACCEPTED') throw ApiError.conflict('You are already accountability partners.');
    if (existing.status === 'PENDING') throw ApiError.conflict('A partner request already exists between you.');
    if (existing.status === 'DECLINED') {
      await prisma.studyPartner.delete({ where: { id: existing.id } });
    }
  }

  const relation = await prisma.studyPartner.create({
    data: {
      requesterId: userId,
      partnerId: target.id,
      status: 'PENDING',
      requesterConsent: Boolean(shareProgress),
      partnerConsent: false,
    },
    include: {
      requester: { select: { name: true } },
      partner: { select: { name: true } },
    },
  });

  await createNotification({
    userId: target.id,
    type: 'PARTNER',
    title: 'New accountability partner request',
    message: `${relation.requester.name} would like to be accountability partners. Open Accountability to respond.`,
    link: '/accountability',
    dedupeKey: `partner-request:${relation.id}`,
  });

  return relation;
}

export async function updatePartner(userId, relationId, { status, shareProgress }) {
  const relation = await prisma.studyPartner.findUnique({ where: { id: relationId } });
  if (!relation) throw ApiError.notFound('Partner request not found');
  if (relation.requesterId !== userId && relation.partnerId !== userId) {
    throw ApiError.forbidden('This partner request does not belong to you.');
  }

  const isPartner = relation.partnerId === userId;
  const data = {};

  if (status) {
    if (!isPartner) throw ApiError.forbidden('Only the invited learner can accept or decline this request.');
    if (relation.status !== 'PENDING') throw ApiError.badRequest('This request has already been answered.');
    if (!['ACCEPTED', 'DECLINED'].includes(status)) throw ApiError.badRequest('Invalid partner status.');

    data.status = status;
    if (status === 'ACCEPTED') {
      data.partnerConsent = Boolean(shareProgress);
    }
    await createNotification({
      userId: relation.requesterId,
      type: 'PARTNER',
      title: status === 'ACCEPTED' ? 'Partner request accepted' : 'Partner request declined',
      message:
        status === 'ACCEPTED'
          ? 'Your accountability partner is on board. Agree on a small daily goal together.'
          : 'Your partner request was declined. You can invite someone else any time.',
      link: '/accountability',
      dedupeKey: `partner-response:${relation.id}`,
    });
  }

  if (shareProgress !== undefined) {
    if (isPartner) data.partnerConsent = Boolean(shareProgress);
    else data.requesterConsent = Boolean(shareProgress);
  }

  if (Object.keys(data).length === 0) throw ApiError.badRequest('Nothing to update.');

  return prisma.studyPartner.update({
    where: { id: relationId },
    data,
    include: {
      requester: { select: { id: true, name: true, avatarColor: true } },
      partner: { select: { id: true, name: true, avatarColor: true } },
    },
  });
}

export async function removePartner(userId, relationId) {
  const relation = await prisma.studyPartner.findUnique({ where: { id: relationId } });
  if (!relation) throw ApiError.notFound('Partner relationship not found');
  if (relation.requesterId !== userId && relation.partnerId !== userId) {
    throw ApiError.forbidden('This partner relationship does not belong to you.');
  }
  await prisma.studyPartner.delete({ where: { id: relationId } });
}

export { partnerProgress };
