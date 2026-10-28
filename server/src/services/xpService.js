import prisma from '../config/prisma.js';
import { levelFromXp } from '../utils/level.js';

/**
 * Award XP exactly once per idempotency key.
 * Uses createMany + skipDuplicates so concurrent or repeated calls cannot
 * duplicate rewards and no Postgres transaction is aborted on conflict.
 */
export async function awardXp({
  userId,
  amount,
  reason,
  sourceType,
  sourceId = null,
  courseId = null,
  idempotencyKey,
  client = prisma,
}) {
  if (!amount || amount <= 0) return { awarded: false, amount: 0, transaction: null };

  const result = await client.xPTransaction.createMany({
    data: [
      {
        userId,
        courseId,
        amount,
        reason,
        sourceType,
        sourceId,
        idempotencyKey,
      },
    ],
    skipDuplicates: true,
  });

  if (result.count === 0) return { awarded: false, amount: 0, transaction: null };

  const transaction = await client.xPTransaction.findUnique({ where: { idempotencyKey } });
  return { awarded: true, amount, transaction };
}

export async function getTotalXp(userId, client = prisma) {
  const aggregate = await client.xPTransaction.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return aggregate._sum.amount || 0;
}

export async function getXpSummary(userId, client = prisma) {
  const [totalXp, recent] = await Promise.all([
    getTotalXp(userId, client),
    client.xPTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { course: { select: { id: true, title: true } } },
    }),
  ]);

  return {
    totalXp,
    ...levelFromXp(totalXp),
    recent,
  };
}

export async function listXpTransactions(userId, { page = 1, pageSize = 20 } = {}) {
  const [total, transactions] = await Promise.all([
    prisma.xPTransaction.count({ where: { userId } }),
    prisma.xPTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { course: { select: { id: true, title: true } } },
    }),
  ]);
  return { transactions, total, page, pageSize };
}

import { dateKeyInTimeZone } from '../utils/dates.js';

/** XP totals grouped by local calendar day for charts. */
export async function xpByDay(userId, days, timeZone, dayKeys) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const transactions = await prisma.xPTransaction.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { amount: true, createdAt: true },
  });
  const totals = Object.fromEntries(dayKeys.map((key) => [key, 0]));
  for (const transaction of transactions) {
    const key = dateKeyInTimeZone(transaction.createdAt, timeZone);
    if (key in totals) totals[key] += transaction.amount;
  }
  return totals;
}
