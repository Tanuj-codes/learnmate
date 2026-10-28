import prisma from '../config/prisma.js';
import config from '../config/env.js';
import {
  addDaysToKey,
  dateKeyToDbDate,
  isoWeekKey,
  todayKey,
  zonedParts,
} from '../utils/dates.js';
import { syncTodayGoal } from './goalService.js';
import { buildNotificationEmail, sendEmail } from './emailService.js';
import ApiError from '../utils/errors.js';

async function createNotification({ userId, type, title, message, link, dedupeKey }) {
  const created = await prisma.notification.createMany({
    data: [{ userId, type, title, message, link, dedupeKey }],
    skipDuplicates: true,
  });
  if (created.count === 0) return null;
  return prisma.notification.findFirst({ where: { userId, dedupeKey } });
}

async function maybeEmail(user, notification) {
  if (!config.EMAIL_ENABLED || !user?.emailNotifications) return;
  const email = buildNotificationEmail({
    name: user.name,
    title: notification.title,
    message: notification.message,
    link: notification.link,
  });
  await sendEmail({ to: user.email, ...email });
}

/**
 * In-app reminders are the baseline. Each reminder type uses a dedupe key so
 * repeated dashboard loads do not spam the notification tray. Emails are only
 * sent when EMAIL_ENABLED and the user has explicitly opted in.
 */
export async function ensureInAppReminders(userId, now = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, timezone: true, emailNotifications: true },
  });
  if (!user) return;

  const dateKey = todayKey(user.timezone, now);
  const localHour = zonedParts(now, user.timezone).hour;
  const goal = await syncTodayGoal(userId, now);

  if (!goal.completed && localHour >= 17) {
    const notification = await createNotification({
      userId,
      type: 'GOAL_REMINDER',
      title: 'Keep your goal within reach',
      message: `You are ${goal.remainingXp} XP away from today's goal. One small activity is enough to finish the day.`,
      link: '/accountability',
      dedupeKey: `goal-reminder:${dateKey}`,
    });
    if (notification) await maybeEmail(user, notification);
  }

  // At most one pending-lesson nudge per course per ISO week.
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    select: {
      courseId: true,
      course: { select: { title: true } },
    },
  });

  for (const enrollment of enrollments) {
    const total = await prisma.lesson.count({ where: { courseId: enrollment.courseId } });
    const completed = await prisma.lessonProgress.count({
      where: { userId, lesson: { courseId: enrollment.courseId } },
    });
    if (completed >= total || total === 0) continue;

    const notification = await createNotification({
      userId,
      type: 'PENDING_LESSON',
      title: `Continue ${enrollment.course.title}`,
      message: `You have ${total - completed} lesson${total - completed === 1 ? '' : 's'} left in this course. Pick up where you left off.`,
      link: `/courses/${enrollment.courseId}`,
      dedupeKey: `lesson-reminder:${enrollment.courseId}:${isoWeekKey(dateKey)}`,
    });
    if (notification) await maybeEmail(user, notification);
  }

  // Weekly summary on Mondays.
  if (new Date(`${dateKey}T12:00:00.000Z`).getUTCDay() === 1) {
    const goalCount = await prisma.dailyGoal.count({
      where: { userId, completed: true, date: { gte: dateKeyToDbDate(addDaysToKey(dateKey, -7)) } },
    });
    const notification = await createNotification({
      userId,
      type: 'WEEKLY_SUMMARY',
      title: 'Your weekly learning check-in',
      message: `Last week you completed ${goalCount} daily goal${goalCount === 1 ? '' : 's'}. Set one small target for this week and keep the momentum going.`,
      link: '/analytics',
      dedupeKey: `weekly-summary:${isoWeekKey(dateKey)}`,
    });
    if (notification) await maybeEmail(user, notification);
  }
}

export async function listNotifications(userId) {
  const [notifications, unreadCount, unreadAchievements] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.notification.count({ where: { userId, type: 'ACHIEVEMENT', readAt: null } }),
  ]);
  return { notifications, unreadCount, unreadAchievements };
}

export async function markNotificationRead(userId, notificationId) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw ApiError.notFound('Notification not found');
  if (notification.userId !== userId) {
    throw ApiError.forbidden('You can only update your own notifications.');
  }
  return prisma.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}

export async function createSystemNotification({ userId, title, message, link, dedupeKey, type = 'SYSTEM' }) {
  const notification = await createNotification({ userId, type, title, message, link, dedupeKey });
  return notification;
}

export { createNotification, maybeEmail };
