import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

export function api() {
  return request.agent(app);
}

export async function registerUser(agent, overrides = {}) {
  const email = overrides.email || `learner-${randomUUID()}@example.com`;
  const res = await agent.post('/api/v1/auth/register').send({
    name: 'Test Learner',
    password: 'Passw0rd!',
    timezone: 'UTC',
    ...overrides,
    email,
  });
  return { res, csrf: res.body.data?.csrfToken, user: res.body.data?.user, email };
}

export async function createDirectUser(overrides = {}) {
  const email = overrides.email || `fixture-${randomUUID()}@example.com`;
  const passwordHash = await bcrypt.hash('Passw0rd!', 10);
  return prisma.user.create({
    data: {
      name: 'Fixture Learner',
      email,
      passwordHash,
      timezone: 'UTC',
      ...overrides,
    },
  });
}

export async function createCourseFixture({ published = true } = {}) {
  const course = await prisma.course.create({
    data: {
      slug: `course-${randomUUID()}`,
      title: 'Test Course',
      tagline: 'A short tagline',
      description: 'A course created for automated tests.',
      category: 'Testing',
      published,
    },
  });

  const lesson = await prisma.lesson.create({
    data: {
      courseId: course.id,
      title: 'Test Lesson',
      summary: 'A short summary',
      content: 'Lesson body',
      order: 1,
    },
  });

  const quiz = await prisma.quiz.create({
    data: {
      courseId: course.id,
      title: 'Test Quiz',
      description: 'A quiz created for automated tests.',
      passingScore: 60,
    },
  });

  const questions = [];
  for (let index = 0; index < 5; index += 1) {
    questions.push(
      await prisma.question.create({
        data: {
          quizId: quiz.id,
          prompt: `Question ${index + 1}`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndex: index % 4,
          explanation: 'Because this is the correct option.',
          topic: 'Testing',
          order: index + 1,
        },
      })
    );
  }

  return { course, lesson, quiz, questions };
}

export function enroll(userId, courseId, enrolledAt = new Date()) {
  return prisma.enrollment.create({
    data: { userId, courseId, enrolledAt, lastAccessedAt: enrolledAt },
  });
}

export function csrfHeader(token) {
  return { 'x-csrf-token': token };
}
