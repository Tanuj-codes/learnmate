import {
  ensureInAppReminders,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService.js';

export async function list(req, res) {
  await ensureInAppReminders(req.user.id);
  const data = await listNotifications(req.user.id);
  res.json({ success: true, data });
}

export async function read(req, res) {
  const notification = await markNotificationRead(req.user.id, req.params.notificationId);
  res.json({ success: true, data: { notification } });
}

export async function readAll(req, res) {
  const result = await markAllNotificationsRead(req.user.id);
  res.json({ success: true, data: result });
}
