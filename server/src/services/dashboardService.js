import prisma from '../config/prisma.js';
import { getXpSummary } from './xpService.js';
import { getGoalDashboard } from './goalService.js';
import { listCourses } from './courseService.js';
import { getFlashcardOverview } from './flashcardService.js';
import { getRecentAttempts } from './quizService.js';
import { getWeeklyAnalytics } from './analyticsService.js';
import { ensureInAppReminders } from './notificationService.js';

export async function getDashboard(userId) {
  // Reminders are in-app by default and deduplicated per day/week.
  await ensureInAppReminders(userId);

  const [xp, goals, courseData, flashcards, recentAchievements, recentAttempts, weekly, unreadCount] =
    await Promise.all([
      getXpSummary(userId),
      getGoalDashboard(userId, { days: 7 }),
      listCourses({ userId }),
      getFlashcardOverview(userId),
      prisma.userAchievement.findMany({
        where: { userId },
        orderBy: { unlockedAt: 'desc' },
        take: 4,
        include: { achievement: true },
      }),
      getRecentAttempts(userId, { limit: 4 }),
      getWeeklyAnalytics(userId, { days: 7 }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

  const enrolledCourses = courseData.courses.filter((course) => course.enrolled);
  const suggestedCourses = courseData.courses.filter((course) => !course.enrolled).slice(0, 3);
  const resumeCourse = enrolledCourses.find((course) => course.progress.percent < 100) || enrolledCourses[0] || null;

  return {
    xp,
    goals,
    courses: enrolledCourses,
    suggestedCourses,
    resume: resumeCourse
      ? {
          courseId: resumeCourse.id,
          courseTitle: resumeCourse.title,
          lessonId: resumeCourse.progress.resumeLessonId,
          percent: resumeCourse.progress.percent,
          nextLessonNumber: resumeCourse.progress.completedCount + 1,
          totalLessons: resumeCourse.progress.totalCount,
        }
      : null,
    flashcards,
    achievements: recentAchievements.map((row) => ({
      code: row.achievement.code,
      name: row.achievement.name,
      description: row.achievement.description,
      icon: row.achievement.icon,
      tier: row.achievement.tier,
      unlockedAt: row.unlockedAt,
    })),
    recentAttempts,
    weekly,
    unreadNotifications: unreadCount,
  };
}
