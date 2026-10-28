import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import validate from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { rewardLimiter } from '../middleware/rateLimit.js';
import {
  gameQuery,
  gameSessionSchema,
  sessionIdParam,
  submitMatchSchema,
  submitTimedSchema,
} from '../validators/schemas.js';
import { create, history, submitMatch, submitTimed } from '../controllers/gameController.js';

const router = Router();
router.use(requireAuth);

router.get('/games/history', validate({ query: gameQuery }), asyncHandler(history));

router.post(
  '/games/sessions',
  csrfProtection,
  validate({ body: gameSessionSchema }),
  asyncHandler(create)
);

router.post(
  '/games/sessions/:sessionId/match',
  rewardLimiter,
  csrfProtection,
  validate({ params: sessionIdParam, body: submitMatchSchema }),
  asyncHandler(submitMatch)
);

router.post(
  '/games/sessions/:sessionId/timed',
  rewardLimiter,
  csrfProtection,
  validate({ params: sessionIdParam, body: submitTimedSchema }),
  asyncHandler(submitTimed)
);

export default router;
