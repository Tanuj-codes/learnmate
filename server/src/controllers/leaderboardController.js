import { getCourseLeaderboard, getMyCourseRank } from '../services/leaderboardService.js';

export async function courseLeaderboard(req, res) {
  const result = await getCourseLeaderboard(req.params.courseId, req.user.id, req.validatedQuery);
  res.json({ success: true, data: result });
}

export async function myRank(req, res) {
  const result = await getMyCourseRank(req.params.courseId, req.user.id, req.validatedQuery);
  res.json({ success: true, data: result });
}
