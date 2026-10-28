import { afterAll, beforeEach } from 'vitest';
import prisma from '../src/config/prisma.js';

const TABLES = [
  'Notification',
  'GameSession',
  'StudyPartner',
  'UserAchievement',
  'Achievement',
  'XPTransaction',
  'DailyGoal',
  'FlashcardReview',
  'QuizAnswer',
  'QuizAttempt',
  'Question',
  'Quiz',
  'Flashcard',
  'LessonProgress',
  'Lesson',
  'Topic',
  'Enrollment',
  'Course',
  'User',
];

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`
  );
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
