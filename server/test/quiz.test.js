import { describe, expect, it } from 'vitest';
import prisma from '../src/config/prisma.js';
import {
  api,
  createCourseFixture,
  csrfHeader,
  enroll,
  registerUser,
} from './helpers.js';

async function startAttempt(agent, csrf, quizId) {
  return agent
    .post(`/api/v1/quizzes/${quizId}/attempts`)
    .set(csrfHeader(csrf))
    .send({ questionCount: 5 });
}

async function submitAttempt(agent, csrf, attemptId, answers) {
  return agent
    .post(`/api/v1/attempts/${attemptId}/submit`)
    .set(csrfHeader(csrf))
    .send({ answers });
}

describe('server-scored quizzes and duplicate reward prevention', () => {
  it('grades on the server, hides correct answers, and awards quiz XP once per day', async () => {
    const agent = api();
    const { csrf, user } = await registerUser(agent);
    const { course, quiz, questions } = await createCourseFixture();
    await enroll(user.id, course.id);

    const started = await startAttempt(agent, csrf, quiz.id);
    expect(started.status).toBe(201);
    const served = started.body.data.attempt.questions;
    expect(served).toHaveLength(5);
    expect(served.some((question) => 'correctIndex' in question)).toBe(false);

    const correctById = new Map(questions.map((question) => [question.id, question.correctIndex]));
    const answers = served.map((question, index) => ({
      questionId: question.id,
      selectedIndex:
        index === 4
          ? (correctById.get(question.id) + 1) % 4
          : correctById.get(question.id),
    }));

    const submitted = await submitAttempt(agent, csrf, started.body.data.attempt.id, answers);
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.attempt.score).toBe(80);
    expect(submitted.body.data.attempt.correctCount).toBe(4);
    expect(submitted.body.data.attempt.verified).toBe(true);
    // 5 XP completion + 2 XP per correct answer.
    expect(submitted.body.data.attempt.xpAwarded).toBe(13);

    const results = await agent.get(
      `/api/v1/attempts/${started.body.data.attempt.id}/results`
    );
    expect(results.status).toBe(200);
    expect(results.body.data.answers).toHaveLength(5);

    const second = await startAttempt(agent, csrf, quiz.id);
    expect(second.status).toBe(201);
    const perfectAnswers = second.body.data.attempt.questions.map((question) => ({
      questionId: question.id,
      selectedIndex: correctById.get(question.id),
    }));
    const secondSubmit = await submitAttempt(
      agent,
      csrf,
      second.body.data.attempt.id,
      perfectAnswers
    );
    expect(secondSubmit.status).toBe(200);
    expect(secondSubmit.body.data.attempt.score).toBe(100);
    expect(secondSubmit.body.data.attempt.xpAwarded).toBe(0);

    const quizRewards = await prisma.xPTransaction.findMany({
      where: { userId: user.id, reason: 'QUIZ_COMPLETE' },
    });
    expect(quizRewards).toHaveLength(1);
    expect(quizRewards[0].amount).toBe(13);
  });

  it('rejects questions that were not served in the attempt', async () => {
    const agent = api();
    const { csrf, user } = await registerUser(agent);
    const { course, quiz } = await createCourseFixture();
    await enroll(user.id, course.id);

    const started = await startAttempt(agent, csrf, quiz.id);
    const tampered = await submitAttempt(agent, csrf, started.body.data.attempt.id, [
      { questionId: 'outside-the-served-set', selectedIndex: 0 },
    ]);

    expect(tampered.status).toBe(400);
    expect(tampered.body.error.code).toBe('BAD_REQUEST');
  });

  it('requires enrollment before an attempt can start', async () => {
    const agent = api();
    const { csrf } = await registerUser(agent);
    const { quiz } = await createCourseFixture({ published: true });

    const started = await startAttempt(agent, csrf, quiz.id);
    expect(started.status).toBe(403);
    expect(started.body.error.code).toBe('FORBIDDEN');
  });
});
