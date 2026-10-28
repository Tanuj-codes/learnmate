export function formatNumber(value, options = {}) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, ...options }).format(Number(value) || 0);
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'LM';
}

export function formatDate(value, options = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function relativeTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const units = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ];
  for (const [unit, secondsPerUnit] of units) {
    if (Math.abs(seconds) >= secondsPerUnit) {
      return formatter.format(Math.round(seconds / secondsPerUnit), unit);
    }
  }
  return formatter.format(seconds, 'second');
}

export function formatDuration(ms) {
  if (ms === null || ms === undefined) return '—';
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

export function formatMinutes(minutes) {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export const DIFFICULTY_STYLES = {
  BEGINNER: 'success',
  INTERMEDIATE: 'warning',
  ADVANCED: 'danger',
};

export const DIFFICULTY_LABELS = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export const XP_REASON_LABELS = {
  LESSON_COMPLETE: 'Lesson completed',
  QUIZ_COMPLETE: 'Quiz attempt',
  QUIZ_CORRECT_ANSWER: 'Correct answers',
  FLASHCARD_REVIEW: 'Flashcard review',
  GAME_COMPLETE: 'Mini-game',
  DAILY_GOAL: 'Daily goal',
  ACHIEVEMENT: 'Achievement bonus',
  ADMIN_ADJUSTMENT: 'Adjustment',
};

export const GAME_LABELS = {
  MATCH_PAIRS: 'Match the Pairs',
  TIMED_CHALLENGE: 'Timed Knowledge Challenge',
};

export const AVATAR_STYLES = {
  indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/25 dark:text-indigo-300',
  violet: 'bg-violet-500/10 text-violet-600 border-violet-500/25 dark:text-violet-300',
  emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-300',
  amber: 'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-300',
  rose: 'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-300',
  sky: 'bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-300',
};

export function scoreTone(score) {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'danger';
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function percent(value, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}
