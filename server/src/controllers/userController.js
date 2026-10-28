import { changePassword, updateProfile } from '../services/authService.js';
import { getXpSummary, listXpTransactions } from '../services/xpService.js';
import { getStreakInfo } from '../services/goalService.js';
import { setAuthCookies, setCsrfCookie } from '../utils/tokens.js';
import prisma from '../config/prisma.js';
import { PUBLIC_USER_SELECT } from '../utils/serializers.js';

export async function profile(req, res) {
  const [xp, streak] = await Promise.all([
    getXpSummary(req.user.id),
    getStreakInfo(req.user.id, req.user.timezone),
  ]);
  res.json({ success: true, data: { user: req.user, xp, streak } });
}

export async function update(req, res) {
  const user = await updateProfile(req.user.id, req.body);
  const csrfToken = setCsrfCookie(res, user.id);
  res.json({ success: true, data: { user, csrfToken } });
}

export async function password(req, res) {
  await changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: PUBLIC_USER_SELECT });
  const csrfToken = setAuthCookies(res, user);
  res.json({ success: true, data: { message: 'Password updated.', user, csrfToken } });
}

export async function xpHistory(req, res) {
  const data = await listXpTransactions(req.user.id, req.validatedQuery);
  res.json({ success: true, data });
}
