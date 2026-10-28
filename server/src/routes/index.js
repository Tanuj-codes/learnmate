import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import validate from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import {
  adminRoleSchema,
  adminUsersQuery,
  analyticsQuery,
  notificationIdParam,
  partnerIdParam,
  partnerRequestSchema,
  partnerUpdateSchema,
  userIdParam,
  xpQuery,
} from '../validators/schemas.js';
import { list as achievements } from '../controllers/achievementController.js';
import { overview, weekly } from '../controllers/analyticsController.js';
import { dashboard } from '../controllers/dashboardController.js';
import { read, readAll } from '../controllers/notificationController.js';
import { list as listNotifications } from '../controllers/notificationController.js';
import { list as listPartners, remove, request, update } from '../controllers/partnerController.js';
import { password, profile, update as updateProfile, xpHistory } from '../controllers/userController.js';
import { role, stats, users as adminUsers } from '../controllers/adminController.js';
import { changePasswordSchema, updateProfileSchema } from '../validators/schemas.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/dashboard', asyncHandler(dashboard));

router.get('/achievements', asyncHandler(achievements));

router.get('/analytics/overview', asyncHandler(overview));
router.get('/analytics/weekly', validate({ query: analyticsQuery }), asyncHandler(weekly));

router.get('/users/me', asyncHandler(profile));
router.patch('/users/me', csrfProtection, validate({ body: updateProfileSchema }), asyncHandler(updateProfile));
router.post('/users/me/password', csrfProtection, validate({ body: changePasswordSchema }), asyncHandler(password));
router.get('/users/me/xp', validate({ query: xpQuery }), asyncHandler(xpHistory));

router.get('/notifications', asyncHandler(listNotifications));
router.patch('/notifications/:notificationId/read', csrfProtection, validate({ params: notificationIdParam }), asyncHandler(read));
router.post('/notifications/read-all', csrfProtection, asyncHandler(readAll));

router.get('/partners', asyncHandler(listPartners));
router.post('/partners/requests', csrfProtection, validate({ body: partnerRequestSchema }), asyncHandler(request));
router.patch('/partners/:partnerId', csrfProtection, validate({ params: partnerIdParam, body: partnerUpdateSchema }), asyncHandler(update));
router.delete('/partners/:partnerId', csrfProtection, validate({ params: partnerIdParam }), asyncHandler(remove));

router.get('/admin/stats', requireAdmin, asyncHandler(stats));
router.get('/admin/users', requireAdmin, validate({ query: adminUsersQuery }), asyncHandler(adminUsers));
router.patch(
  '/admin/users/:userId/role',
  requireAdmin,
  csrfProtection,
  validate({ params: userIdParam, body: adminRoleSchema }),
  asyncHandler(role)
);

export default router;
