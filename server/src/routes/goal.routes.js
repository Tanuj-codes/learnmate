import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import validate from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import { goalIdParam, goalTargetSchema, goalsQuery } from '../validators/schemas.js';
import { create, dashboard, update } from '../controllers/goalController.js';

const router = Router();
router.use(requireAuth);

router.get('/', validate({ query: goalsQuery }), asyncHandler(dashboard));
router.post('/', csrfProtection, validate({ body: goalTargetSchema }), asyncHandler(create));
router.patch('/:goalId', csrfProtection, validate({ params: goalIdParam, body: goalTargetSchema }), asyncHandler(update));

export default router;
