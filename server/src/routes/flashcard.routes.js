import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import validate from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { rewardLimiter } from '../middleware/rateLimit.js';
import {
  dueFlashcardsQuery,
  flashcardIdParam,
  idParamSchema,
  reviewFlashcardSchema,
} from '../validators/schemas.js';
import { courseDeck, due, overview, review } from '../controllers/flashcardController.js';

const router = Router();
router.use(requireAuth);

router.get('/flashcards/overview', asyncHandler(overview));
router.get('/flashcards/due', validate({ query: dueFlashcardsQuery }), asyncHandler(due));

router.get('/courses/:courseId/flashcards', validate({ params: idParamSchema }), asyncHandler(courseDeck));

router.post(
  '/flashcards/:flashcardId/reviews',
  rewardLimiter,
  csrfProtection,
  validate({ params: flashcardIdParam, body: reviewFlashcardSchema }),
  asyncHandler(review)
);

export default router;
