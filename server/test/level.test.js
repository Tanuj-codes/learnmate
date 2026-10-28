import { describe, expect, it } from 'vitest';
import { levelFromXp, XP_PER_LEVEL } from '../src/utils/level.js';

describe('level curve', () => {
  it('starts at level 1 and advances every 250 XP', () => {
    expect(XP_PER_LEVEL).toBe(250);
    expect(levelFromXp(0)).toMatchObject({
      level: 1,
      xpIntoLevel: 0,
      xpToNextLevel: 250,
      progressPercent: 0,
      levelStartXp: 0,
      nextLevelXp: 250,
    });
    expect(levelFromXp(249)).toMatchObject({ level: 1, xpToNextLevel: 1, progressPercent: 100 });
    expect(levelFromXp(250)).toMatchObject({ level: 2, xpIntoLevel: 0, levelStartXp: 250 });
    expect(levelFromXp(607)).toMatchObject({ level: 3, xpIntoLevel: 107, xpToNextLevel: 143 });
  });

  it('clamps invalid or negative totals', () => {
    expect(levelFromXp(-50).level).toBe(1);
    expect(levelFromXp('not-a-number').level).toBe(1);
  });
});
