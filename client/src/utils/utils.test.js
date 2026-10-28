import { describe, expect, it } from 'vitest';
import { formatDuration, formatMinutes, greeting, initials, percent } from './format.js';
import { levelFromXp, XP_PER_LEVEL } from './level.js';

describe('level curve (client mirror)', () => {
  it('matches the documented server formula', () => {
    expect(XP_PER_LEVEL).toBe(250);
    expect(levelFromXp(0)).toMatchObject({ level: 1, xpIntoLevel: 0, xpToNextLevel: 250 });
    expect(levelFromXp(249)).toMatchObject({ level: 1, xpToNextLevel: 1, progressPercent: 100 });
    expect(levelFromXp(250)).toMatchObject({ level: 2, xpIntoLevel: 0, levelStartXp: 250 });
    expect(levelFromXp(607)).toMatchObject({ level: 3, xpIntoLevel: 107, xpToNextLevel: 143 });
  });

  it('clamps negative and invalid totals', () => {
    expect(levelFromXp(-100).level).toBe(1);
    expect(levelFromXp('nope').level).toBe(1);
  });
});

describe('format helpers', () => {
  it('builds initials with a safe fallback', () => {
    expect(initials('Demo Learner')).toBe('DL');
    expect(initials('Ava')).toBe('A');
    expect(initials('')).toBe('LM');
  });

  it('formats durations and minutes', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(8000)).toBe('8s');
    expect(formatDuration(125000)).toBe('2m 05s');
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(150)).toBe('2h 30m');
    expect(formatMinutes(0)).toBe('—');
  });

  it('computes percentages without dividing by zero', () => {
    expect(percent(60, 60)).toBe(100);
    expect(percent(1, 3)).toBe(33);
    expect(percent(5, 0)).toBe(0);
    expect(percent(200, 100)).toBe(100);
  });

  it('greets by the local hour', () => {
    expect(greeting(new Date(2026, 0, 1, 8))).toBe('Good morning');
    expect(greeting(new Date(2026, 0, 1, 13))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 0, 1, 21))).toBe('Good evening');
  });
});
