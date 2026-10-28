import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';

export const AUTH_COOKIE = 'lm_token';
export const CSRF_COOKIE = 'lm_csrf';
export const CSRF_HEADER = 'x-csrf-token';

const baseCookieOptions = {
  secure: config.isProduction ? true : config.COOKIE_SECURE,
  sameSite: config.isProduction ? 'none' : 'lax',
  path: '/',
};

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, typ: 'access' }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
    issuer: 'learnmate',
  });
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, config.JWT_SECRET, { issuer: 'learnmate' });
  if (payload.typ !== 'access') throw new Error('Invalid token type');
  return payload;
}

export function signCsrfToken(userId) {
  // A signed CSRF token so an attacker cannot forge the double-submit value.
  return jwt.sign({ sub: userId, typ: 'csrf', nonce: crypto.randomBytes(8).toString('hex') }, config.JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'learnmate',
  });
}

export function verifyCsrfToken(token) {
  const payload = jwt.verify(token, config.JWT_SECRET, { issuer: 'learnmate' });
  if (payload.typ !== 'csrf') throw new Error('Invalid CSRF token type');
  return payload;
}

export function setAuthCookies(res, user) {
  const accessToken = signAccessToken(user);
  const csrfToken = signCsrfToken(user.id);
  res.cookie(AUTH_COOKIE, accessToken, {
    ...baseCookieOptions,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie(CSRF_COOKIE, csrfToken, {
    ...baseCookieOptions,
    httpOnly: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return csrfToken;
}

export function setCsrfCookie(res, userId) {
  const csrfToken = signCsrfToken(userId);
  res.cookie(CSRF_COOKIE, csrfToken, {
    ...baseCookieOptions,
    httpOnly: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return csrfToken;
}

export function clearAuthCookies(res) {
  res.clearCookie(AUTH_COOKIE, { ...baseCookieOptions, httpOnly: true });
  res.clearCookie(CSRF_COOKIE, { ...baseCookieOptions, httpOnly: false });
}

export function readAccessToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return req.cookies?.[AUTH_COOKIE] || null;
}
