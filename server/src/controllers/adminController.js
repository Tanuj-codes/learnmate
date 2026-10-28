import { getAdminStats, listAdminUsers, updateUserRole } from '../services/adminService.js';

export async function stats(_req, res) {
  const data = await getAdminStats();
  res.json({ success: true, data });
}

export async function users(req, res) {
  const data = await listAdminUsers(req.validatedQuery);
  res.json({ success: true, data });
}

export async function role(req, res) {
  const user = await updateUserRole(req.user.id, req.params.userId, req.body.role);
  res.json({ success: true, data: { user } });
}
