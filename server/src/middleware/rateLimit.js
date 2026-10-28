import rateLimit from 'express-rate-limit';
import config from '../config/env.js';
import ApiError from '../utils/errors.js';

function limiter(options) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.isTest,
    handler: (_req, _res, next) => next(ApiError.tooManyRequests(options.message)),
    ...options,
  });
}

export const authLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: 'Too many authentication attempts. Please wait a few minutes and try again.',
});

export const apiLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: 'Too many requests. Please slow down.',
});

export const rewardLimiter = limiter({
  windowMs: 60 * 1000,
  limit: 30,
  message: 'Too many submissions. Please wait a moment before trying again.',
});

export const emailLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: 'Too many email requests. Please try again later.',
});
