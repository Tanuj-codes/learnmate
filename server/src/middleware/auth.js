import prisma from '../config/prisma.js';
import { PUBLIC_USER_SELECT } from '../utils/serializers.js';
import { readAccessToken, verifyAccessToken } from '../utils/tokens.js';
import ApiError from '../utils/errors.js';
import asyncHandler from '../utils/asyncHandler.js';

async function loadUserFromRequest(req) {
  const token = readAccessToken(req);
  if (!token) return null;

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: payload.sub },
    select: PUBLIC_USER_SELECT,
  });
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const user = await loadUserFromRequest(req);
  if (!user) throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  req.user = (await loadUserFromRequest(req)) || null;
  next();
});

export const requireAdmin = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role !== 'ADMIN') return next(ApiError.forbidden('Administrator access is required.'));
  next();
};

export default requireAuth;
