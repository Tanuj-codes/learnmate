const DAY_MS = 24 * 60 * 60 * 1000;

export function zonedParts(date, timeZone = 'UTC') {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date),
  };
}

export function dateKeyInTimeZone(date = new Date(), timeZone = 'UTC') {
  const { year, month, day } = zonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayKey(timeZone = 'UTC', now = new Date()) {
  return dateKeyInTimeZone(now, timeZone);
}

function timeZoneOffsetMs(date, timeZone) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function zonedMidnightUtc(year, month, day, timeZone) {
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  let result = guess - timeZoneOffsetMs(new Date(guess), timeZone);
  result = guess - timeZoneOffsetMs(new Date(result), timeZone);
  return new Date(result);
}

/** Returns [start, end) UTC instants for a local calendar day key (YYYY-MM-DD). */
export function zonedDayRange(dateKey, timeZone = 'UTC') {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  const start = zonedMidnightUtc(year, month, day, timeZone);
  const end = zonedMidnightUtc(year, month, day + 1, timeZone);
  return { start, end };
}

/** Date stored in a PostgreSQL @db.Date column, anchored at UTC midnight. */
export function dateKeyToDbDate(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function dbDateToKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

export function addDaysToKey(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function diffDaysKeys(a, b) {
  const first = new Date(`${a}T00:00:00.000Z`).getTime();
  const second = new Date(`${b}T00:00:00.000Z`).getTime();
  return Math.round((second - first) / DAY_MS);
}

export function startOfWeekKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const weekday = date.getUTCDay(); // 0 = Sunday
  const diff = weekday === 0 ? -6 : 1 - weekday; // Monday start
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

export function isoWeekKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / DAY_MS + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function lastNDaysKeys(days, timeZone = 'UTC', now = new Date()) {
  const today = todayKey(timeZone, now);
  return Array.from({ length: days }, (_, index) => addDaysToKey(today, index - (days - 1)));
}

export function formatDateKey(dateKey, options = {}) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
    ...options,
  }).format(date);
}
