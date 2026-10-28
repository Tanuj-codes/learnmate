import { getDashboard } from '../services/dashboardService.js';

export async function dashboard(req, res) {
  const data = await getDashboard(req.user.id);
  res.json({ success: true, data });
}
