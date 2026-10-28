import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import validate from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { rewardLimiter } from '../middleware/rateLimit.js';
import {
  attemptIdParam,
  idParamSchema,
  quizIdParam,
  startAttemptSchema,
  submitAttemptSchema,
} from '../validators/schemas.js';
import { history, list, meta, results, start, submit } from '../controllers/quizController.js';

const router = Router();
router.use(requireAuth);

router.get('/courses/:courseId/quizzes', validate({ params: idParamSchema }), asyncHandler(list));

router.get('/quizzes/:quizId', validate({ params: quizIdParam }), asyncHandler(meta));

router.post(
  '/quizzes/:quizId/attempts',
  rewardLimiter,
  csrfProtection,
  validate({ params: quizIdParam, body: startAttemptSchema }),
  asyncHandler(start)
);

router.get('/quizzes/:quizId/attempts', validate({ params: quizIdParam }), asyncHandler(history));

router.post(
  '/attempts/:attemptId/submit',
  rewardLimiter,
  csrfProtection,
  validate({ params: attemptIdParam, body: submitAttemptSchema }),
  asyncHandler(submit)
);

router.get('/attempts/:attemptId/results', validate({ params: attemptIdParam }), asyncHandler(results));

export default router;
