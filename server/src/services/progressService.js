import { evaluateAchievements } from './achievementService.js';
import { syncTodayGoal } from './goalService.js';

/**
 * Finalize a reward-earning action in one place.
 *
 * Order matters:
 *  1. Award achievements earned by the action itself (lesson/quiz/game/etc.).
 *  2. Sync the daily goal so badge XP counts toward today's target and the
 *     one-time goal bonus is awarded inside this request, not on a later page
 *     load.
 *  3. Evaluate achievements once more in case the goal bonus pushed the learner
 *     over an XP milestone.
 *
 * Read-only endpoints never call this, so simply browsing the app cannot create
 * XP or unlock badges.
 */
export async function finalizeProgress(userId) {
  const before = await evaluateAchievements(userId);
  const goal = await syncTodayGoal(userId, new Date(), { award: true });
  const after = await evaluateAchievements(userId);

  const unlocked = [];
  const seen = new Set();
  for (const achievement of [...before.unlocked, ...after.unlocked]) {
    if (seen.has(achievement.code)) continue;
    seen.add(achievement.code);
    unlocked.push(achievement);
  }

  return { goal, unlocked, stats: after.stats };
}

export default finalizeProgress;
