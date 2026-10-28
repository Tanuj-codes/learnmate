import { z } from 'zod';

const id = z.string().min(1).max(64);
const timezone = z
  .string()
  .min(1)
  .max(60)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, 'Choose a valid IANA timezone, e.g. Europe/London.');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be 72 characters or fewer.')
  .regex(/[A-Za-z]/, 'Password must include a letter.')
  .regex(/[0-9]/, 'Password must include a number.');

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);

const pagination = {
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
};

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(60),
  email,
  password,
  timezone: timezone.optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.').max(72),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: password,
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
    timezone: timezone.optional(),
    theme: z.enum(['light', 'dark']).optional(),
    avatarColor: z.enum(['indigo', 'violet', 'emerald', 'amber', 'rose', 'sky']).optional(),
    dailyGoalXp: z.coerce.number().int().min(10).max(1000).optional(),
    weeklyGoalDays: z.coerce.number().int().min(1).max(7).optional(),
    emailNotifications: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update.');

export const idParamSchema = z.object({ courseId: id });
export const lessonIdParam = z.object({ lessonId: id });
export const quizIdParam = z.object({ quizId: id });
export const attemptIdParam = z.object({ attemptId: id });
export const flashcardIdParam = z.object({ flashcardId: id });
export const sessionIdParam = z.object({ sessionId: id });
export const goalIdParam = z.object({ goalId: id });
export const notificationIdParam = z.object({ notificationId: id });
export const partnerIdParam = z.object({ partnerId: id });
export const userIdParam = z.object({ userId: id });

export const courseListQuery = z.object({
  search: z.string().trim().max(100).optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  category: z.string().trim().max(60).optional(),
});

export const startAttemptSchema = z.object({
  questionCount: z.coerce.number().int().min(1).max(50).default(5),
});

export const submitAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: id,
        selectedIndex: z.number().int().min(0).max(20).nullable().optional(),
      })
    )
    .min(1)
    .max(100),
});

export const reviewFlashcardSchema = z.object({
  rating: z.enum(['KNOWN', 'NEEDS_REVISION']),
});

export const dueFlashcardsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  courseId: z.string().min(1).max(64).optional(),
});

export const gameSessionSchema = z.object({
  courseId: id,
  gameType: z.enum(['MATCH_PAIRS', 'TIMED_CHALLENGE']),
});

export const submitMatchSchema = z.object({
  matches: z
    .array(z.object({ pairId: z.string().min(1).max(64), token: z.string().min(1).max(64) }))
    .min(1)
    .max(20),
});

export const submitTimedSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: id,
        selectedIndex: z.number().int().min(0).max(20).nullable().optional(),
      })
    )
    .min(1)
    .max(50),
});

export const leaderboardQuery = z.object({
  board: z.enum(['knowledge', 'xp']).default('knowledge'),
  ...pagination,
});

export const goalsQuery = z.object({
  days: z.coerce.number().int().min(7).max(60).default(14),
});

export const goalTargetSchema = z.object({
  targetXp: z.coerce.number().int().min(10).max(1000),
});

export const analyticsQuery = z.object({
  days: z.coerce.number().int().min(7).max(30).default(7),
});

export const partnerRequestSchema = z.object({
  email,
  shareProgress: z.boolean().default(true),
});

export const partnerUpdateSchema = z
  .object({
    status: z.enum(['ACCEPTED', 'DECLINED']).optional(),
    shareProgress: z.boolean().optional(),
  })
  .refine((data) => data.status !== undefined || data.shareProgress !== undefined, 'Provide a status or sharing preference.');

export const xpQuery = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const adminUsersQuery = z.object({
  search: z.string().trim().max(100).optional(),
  ...pagination,
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const adminRoleSchema = z.object({
  role: z.enum(['STUDENT', 'ADMIN']),
});

export const gameQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
