import dotenv from 'dotenv';
import { z } from 'zod';

// Load server/.env regardless of the directory the process was started from.
dotenv.config({ path: new URL('../../.env', import.meta.url) });

const booleanFromString = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  TRUST_PROXY: booleanFromString.default(false),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  COOKIE_SECURE: booleanFromString.default(false),

  XP_LESSON_COMPLETE: z.coerce.number().int().min(0).default(10),
  XP_QUIZ_COMPLETE: z.coerce.number().int().min(0).default(5),
  XP_PER_CORRECT_ANSWER: z.coerce.number().int().min(0).default(2),
  XP_FLASHCARD_REVIEW: z.coerce.number().int().min(0).default(2),
  XP_FLASHCARD_DAILY_CAP: z.coerce.number().int().min(0).default(10),
  XP_GAME_COMPLETE: z.coerce.number().int().min(0).default(8),
  XP_DAILY_GOAL: z.coerce.number().int().min(0).default(10),
  FLASHCARD_REVIEW_COOLDOWN_HOURS: z.coerce.number().min(1).default(12),

  LEADERBOARD_WEIGHT_PERFORMANCE: z.coerce.number().min(0).max(1).default(0.7),
  LEADERBOARD_WEIGHT_IMPROVEMENT: z.coerce.number().min(0).max(1).default(0.2),
  LEADERBOARD_WEIGHT_CONSISTENCY: z.coerce.number().min(0).max(1).default(0.1),
  LEADERBOARD_WINDOW_DAYS: z.coerce.number().int().min(7).max(365).default(30),
  LEADERBOARD_IMPROVEMENT_SCALE: z.coerce.number().positive().default(5),

  EMAIL_ENABLED: booleanFromString.default(false),
  EMAIL_PROVIDER: z.enum(['smtp', 'resend']).default('smtp'),
  EMAIL_FROM: z.string().default('LearnMate <no-reply@learnmate.local>'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanFromString.default(false),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  RESEND_API_KEY: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
  // Fail fast and loudly, but never print secret values.
  console.error(`Invalid server environment configuration:\n${issues}`);
  process.exit(1);
}

const env = parsed.data;

const weightSum =
  env.LEADERBOARD_WEIGHT_PERFORMANCE +
  env.LEADERBOARD_WEIGHT_IMPROVEMENT +
  env.LEADERBOARD_WEIGHT_CONSISTENCY;

if (Math.abs(weightSum - 1) > 0.001) {
  console.error(
    `Invalid leaderboard weights: they must sum to 1.0 (currently ${weightSum.toFixed(3)}).`
  );
  process.exit(1);
}

export const config = {
  ...env,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  corsOrigins: env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
  leaderboardWeights: {
    performance: env.LEADERBOARD_WEIGHT_PERFORMANCE,
    improvement: env.LEADERBOARD_WEIGHT_IMPROVEMENT,
    consistency: env.LEADERBOARD_WEIGHT_CONSISTENCY,
  },
  xp: {
    lessonComplete: env.XP_LESSON_COMPLETE,
    quizComplete: env.XP_QUIZ_COMPLETE,
    perCorrectAnswer: env.XP_PER_CORRECT_ANSWER,
    flashcardReview: env.XP_FLASHCARD_REVIEW,
    flashcardDailyCap: env.XP_FLASHCARD_DAILY_CAP,
    gameComplete: env.XP_GAME_COMPLETE,
    dailyGoal: env.XP_DAILY_GOAL,
  },
};

export default config;
