import { CSRF_COOKIE, clearAuthCookies, setAuthCookies, setCsrfCookie } from '../utils/tokens.js';
import { authenticateUser, registerUser } from '../services/authService.js';
import { getXpSummary } from '../services/xpService.js';

export async function register(req, res) {
  const user = await registerUser(req.body);
  const csrfToken = setAuthCookies(res, user);
  const xp = await getXpSummary(user.id);
  res.status(201).json({ success: true, data: { user, xp, csrfToken } });
}

export async function login(req, res) {
  const user = await authenticateUser(req.body);
  const csrfToken = setAuthCookies(res, user);
  const xp = await getXpSummary(user.id);
  res.json({ success: true, data: { user, xp, csrfToken } });
}

export async function logout(_req, res) {
  clearAuthCookies(res);
  res.json({ success: true, data: { message: 'Signed out successfully.' } });
}

export async function me(req, res) {
  let csrfToken = req.cookies?.[CSRF_COOKIE];
  if (!csrfToken) csrfToken = setCsrfCookie(res, req.user.id);
  const xp = await getXpSummary(req.user.id);
  res.json({ success: true, data: { user: req.user, xp, csrfToken } });
}
