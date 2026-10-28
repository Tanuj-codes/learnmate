/**
 * Mirrors server/src/utils/level.js. Every level costs 250 XP and level 1
 * starts at zero XP, so the formula is transparent on both sides.
 */
export const XP_PER_LEVEL = 250;

export function levelFromXp(totalXp = 0) {
  const safe = Math.max(0, Number(totalXp) || 0);
  const level = Math.floor(safe / XP_PER_LEVEL) + 1;
  const levelStartXp = (level - 1) * XP_PER_LEVEL;
  const xpIntoLevel = safe - levelStartXp;
  const xpToNextLevel = XP_PER_LEVEL - xpIntoLevel;
  return {
    level,
    xpIntoLevel,
    xpToNextLevel,
    progressPercent: Math.min(100, Math.round((xpIntoLevel / XP_PER_LEVEL) * 100)),
    levelStartXp,
    nextLevelXp: level * XP_PER_LEVEL,
  };
}
