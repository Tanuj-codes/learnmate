import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import validate from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { lessonIdParam } from '../validators/schemas.js';
import { complete, lesson } from '../controllers/courseController.js';

const router = Router();

router.use(requireAuth);

router.get('/:lessonId', validate({ params: lessonIdParam }), asyncHandler(lesson));
router.post('/:lessonId/complete', csrfProtection, validate({ params: lessonIdParam }), asyncHandler(complete));

export default router;
