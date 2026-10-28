import crypto from 'crypto';
import ApiError from '../utils/errors.js';
import { CSRF_COOKIE, CSRF_HEADER, verifyCsrfToken } from '../utils/tokens.js';
import asyncHandler from '../utils/asyncHandler.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF protection for cookie-authenticated write requests.
 * Bearer-token requests are exempt because browsers do not attach them
 * automatically. The CSRF cookie is signed and bound to the authenticated user.
 */
export const csrfProtection = asyncHandler(async (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const bearer = req.headers.authorization?.startsWith('Bearer ');
  if (bearer) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];

  if (!cookieToken || !headerToken) {
    throw new ApiError(403, 'CSRF_MISSING', 'Missing CSRF token. Refresh the page and try again.');
  }

  const cookieBuffer = Buffer.from(String(cookieToken));
  const headerBuffer = Buffer.from(String(headerToken));
  if (cookieBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    throw new ApiError(403, 'CSRF_INVALID', 'Invalid CSRF token.');
  }

  let payload;
  try {
    payload = verifyCsrfToken(cookieToken);
  } catch {
    throw new ApiError(403, 'CSRF_INVALID', 'Expired CSRF token. Refresh the page and try again.');
  }

  if (!req.user || payload.sub !== req.user.id) {
    throw new ApiError(403, 'CSRF_INVALID', 'CSRF token does not belong to this session.');
  }

  next();
});

export default csrfProtection;
