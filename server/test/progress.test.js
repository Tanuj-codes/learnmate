import { describe, expect, it } from 'vitest';
import prisma from '../src/config/prisma.js';
import { evaluateAchievements, getAchievementCatalog } from '../src/services/achievementService.js';
import { awardXp, getXpSummary } from '../src/services/xpService.js';
import {
  api,
  createCourseFixture,
  createDirectUser,
  csrfHeader,
  enroll,
  registerUser,
} from './helpers.js';

describe('progress finalization', () => {
  it('does not award XP or unlock badges from a read-only achievements page', async () => {
    const user = await createDirectUser({ dailyGoalXp: 50 });
    const achievement = await prisma.achievement.create({
      data: {
        code: 'XP_500',
        name: 'XP Collector',
        description: 'Earn 500 XP.',
        icon: 'Zap',
        criteriaType: 'TOTAL_XP',
        criteriaValue: 500,
        xpReward: 50,
        tier: 'SILVER',
        sortOrder: 1,
      },
    });

    await awardXp({
      userId: user.id,
      amount: 600,
      reason: 'LESSON_COMPLETE',
      sourceType: 'Lesson',
      sourceId: 'fixture-lesson',
      idempotencyKey: 'test:read-only-achievements',
    });

    const before = await getXpSummary(user.id);
    const catalog = await getAchievementCatalog(user.id);

    expect(catalog.unlockedCount).toBe(0);
    expect(await prisma.userAchievement.count({ where: { userId: user.id } })).toBe(0);
    const afterRead = await getXpSummary(user.id);
    expect(afterRead.totalXp).toBe(before.totalXp);

    // The same evaluation does unlock (and reward) when it runs after a write.
    const evaluation = await evaluateAchievements(user.id);
    expect(evaluation.unlocked).toHaveLength(1);
    expect(evaluation.unlocked[0].code).toBe(achievement.code);
    expect((await getXpSummary(user.id)).totalXp).toBe(before.totalXp + 50);
  });

  it('awards the daily goal bonus inside the action that crosses the target', async () => {
    const agent = api();
    const { csrf, user } = await registerUser(agent);
    await prisma.user.update({ where: { id: user.id }, data: { dailyGoalXp: 10 } });

    const { course, quiz, questions } = await createCourseFixture();
    await enroll(user.id, course.id);

    const started = await agent
      .post(`/api/v1/quizzes/${quiz.id}/attempts`)
      .set(csrfHeader(csrf))
      .send({ questionCount: 5 });
    expect(started.status).toBe(201);

    const correctById = new Map(questions.map((question) => [question.id, question.correctIndex]));
    const answers = started.body.data.attempt.questions.map((question) => ({
      questionId: question.id,
      selectedIndex: correctById.get(question.id),
    }));

    const submitted = await agent
      .post(`/api/v1/attempts/${started.body.data.attempt.id}/submit`)
      .set(csrfHeader(csrf))
      .send({ answers });

    expect(submitted.status).toBe(200);
    // 5 XP completion + 2 XP per correct answer = 15 XP, plus the 10 XP goal bonus.
    expect(submitted.body.data.goal.goalXpAwarded).toBe(10);
    expect(submitted.body.data.goal.completed).toBe(true);
    expect(submitted.body.data.goal.xpEarned).toBe(15);
    expect(submitted.body.data.xpAwarded).toBe(25);
    expect(submitted.body.data.xp.totalXp).toBe(25);

    const bonuses = await prisma.xPTransaction.count({
      where: { userId: user.id, reason: 'DAILY_GOAL' },
    });
    expect(bonuses).toBe(1);
  });
});
