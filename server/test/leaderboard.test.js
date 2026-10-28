import { describe, expect, it } from 'vitest';
import prisma from '../src/config/prisma.js';
import { getCourseLeaderboard } from '../src/services/leaderboardService.js';
import { createCourseFixture, createDirectUser, enroll } from './helpers.js';

function attempt({ userId, quizId, score, submittedAt, attemptNumber = 1 }) {
  return prisma.quizAttempt.create({
    data: {
      userId,
      quizId,
      attemptNumber,
      status: 'SUBMITTED',
      verified: true,
      score,
      correctCount: Math.round((score / 100) * 5),
      totalCount: 5,
      questionIds: [],
      startedAt: submittedAt,
      submittedAt,
    },
  });
}

describe('knowledge leaderboard', () => {
  it('uses 70/20/10 weights, rewards improvement, and never treats missing history as perfect', async () => {
    const { course, quiz } = await createCourseFixture();
    const alpha = await createDirectUser({ name: 'Alpha Learner' });
    const beta = await createDirectUser({ name: 'Beta Learner' });
    await enroll(alpha.id, course.id);
    await enroll(beta.id, course.id);

    const now = new Date();
    const baseline = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    await attempt({ userId: alpha.id, quizId: quiz.id, score: 40, submittedAt: baseline, attemptNumber: 1 });
    await attempt({ userId: alpha.id, quizId: quiz.id, score: 90, submittedAt: now, attemptNumber: 2 });

    const board = await getCourseLeaderboard(course.id, alpha.id);
    expect(board.policy.weights).toEqual({ performance: 0.7, improvement: 0.2, consistency: 0.1 });
    expect(board.policy.formula).toBe('70% Test Performance + 20% Improvement + 10% Consistency');

    const alphaEntry = board.entries.find((entry) => entry.userId === alpha.id);
    expect(alphaEntry.components.performance).toBe(90);
    expect(alphaEntry.components.improvement).toBe(100);
    expect(alphaEntry.components.consistency).toBe(0);
    expect(alphaEntry.knowledgeScore).toBe(83);

    const betaEntry = board.entries.find((entry) => entry.userId === beta.id);
    expect(betaEntry.components).toEqual({ performance: 0, improvement: 0, consistency: 0 });
    expect(betaEntry.knowledgeScore).toBe(0);
    expect(betaEntry.insufficientAssessmentHistory).toBe(true);
    expect(alphaEntry.knowledgeScore).toBeGreaterThan(betaEntry.knowledgeScore);
  });

  it('counts completed goals as consistency and ranks the highest score first', async () => {
    const { course, quiz } = await createCourseFixture();
    const alpha = await createDirectUser({ name: 'Alpha Learner' });
    await enroll(alpha.id, course.id);
    await attempt({
      userId: alpha.id,
      quizId: quiz.id,
      score: 100,
      submittedAt: new Date(),
    });
    await prisma.dailyGoal.create({
      data: {
        userId: alpha.id,
        date: new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`),
        targetXp: 50,
        xpEarned: 50,
        completed: true,
        completedAt: new Date(),
      },
    });

    const board = await getCourseLeaderboard(course.id, alpha.id);
    const entry = board.entries[0];
    expect(entry.components).toEqual({ performance: 100, improvement: 0, consistency: 100 });
    expect(entry.knowledgeScore).toBe(80);
    expect(entry.rank).toBe(1);
    expect(entry.isMe).toBe(true);
  });
});
