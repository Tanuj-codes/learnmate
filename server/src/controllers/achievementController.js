import { getAchievementCatalog } from '../services/achievementService.js';

export async function list(req, res) {
  const data = await getAchievementCatalog(req.user.id);
  res.json({ success: true, data });
}
