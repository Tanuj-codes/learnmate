import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import validate from '../middleware/validate.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { courseListQuery, idParamSchema, leaderboardQuery } from '../validators/schemas.js';
import { detail, enroll, list, progress } from '../controllers/courseController.js';
import { courseLeaderboard, myRank } from '../controllers/leaderboardController.js';

const router = Router();

router.get('/', optionalAuth, validate({ query: courseListQuery }), asyncHandler(list));

router.get(
  '/:courseId/leaderboard/me',
  requireAuth,
  validate({ params: idParamSchema, query: leaderboardQuery }),
  asyncHandler(myRank)
);

router.get(
  '/:courseId/leaderboard',
  requireAuth,
  validate({ params: idParamSchema, query: leaderboardQuery }),
  asyncHandler(courseLeaderboard)
);

router.get('/:courseId/progress', requireAuth, validate({ params: idParamSchema }), asyncHandler(progress));

router.post(
  '/:courseId/enroll',
  requireAuth,
  csrfProtection,
  validate({ params: idParamSchema }),
  asyncHandler(enroll)
);

router.get('/:courseId', requireAuth, validate({ params: idParamSchema }), asyncHandler(detail));

export default router;
