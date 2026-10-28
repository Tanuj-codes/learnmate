import { describe, expect, it } from 'vitest';
import prisma from '../src/config/prisma.js';
import { syncTodayGoal } from '../src/services/goalService.js';
import { awardXp } from '../src/services/xpService.js';
import { createDirectUser } from './helpers.js';

describe('daily goal progress', () => {
  it('excludes the goal-completion bonus from its own progress and awards it once', async () => {
    const user = await createDirectUser({ dailyGoalXp: 50 });

    await awardXp({
      userId: user.id,
      amount: 60,
      reason: 'LESSON_COMPLETE',
      sourceType: 'Lesson',
      sourceId: 'fixture-lesson',
      idempotencyKey: 'test:goal-progress',
    });

    // Read-only syncs track progress but never create XP on their own.
    const readOnly = await syncTodayGoal(user.id);
    expect(readOnly.completed).toBe(false);
    expect(readOnly.xpEarned).toBe(60);
    expect(readOnly.goalXpAwarded).toBe(0);
    expect(
      await prisma.xPTransaction.count({ where: { userId: user.id, reason: 'DAILY_GOAL' } }),
    ).toBe(0);

    // A write action finalizes the goal and awards the bonus exactly once.
    const first = await syncTodayGoal(user.id, new Date(), { award: true });
    expect(first.completed).toBe(true);
    expect(first.xpEarned).toBe(60);
    expect(first.goalXpAwarded).toBe(10);
    expect(first.percent).toBe(100);

    const second = await syncTodayGoal(user.id, new Date(), { award: true });
    expect(second.completed).toBe(true);
    expect(second.xpEarned).toBe(60);
    expect(second.goalXpAwarded).toBe(0);

    const bonuses = await prisma.xPTransaction.count({
      where: { userId: user.id, reason: 'DAILY_GOAL' },
    });
    expect(bonuses).toBe(1);
  });
});
