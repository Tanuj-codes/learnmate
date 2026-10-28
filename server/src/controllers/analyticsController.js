import { getOverview, getWeeklyAnalytics } from '../services/analyticsService.js';

export async function overview(req, res) {
  const data = await getOverview(req.user.id);
  res.json({ success: true, data });
}

export async function weekly(req, res) {
  const data = await getWeeklyAnalytics(req.user.id, { days: req.validatedQuery.days });
  res.json({ success: true, data });
}
