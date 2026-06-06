/** Max backdating allowed for walk-in sessions started late. */
export const CUSTOM_START_MAX_BACK_MS = 60 * 60 * 1000;

/** Strip seconds/ms so datetime-local minute picks align with validation. */
export function truncateToMinute(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), 0, 0);
}

/** Format for `<input type="datetime-local" />` (local timezone). */
export function toDatetimeLocalInputValue(d: Date): string {
  const t = truncateToMinute(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`;
}

/** Parse `YYYY-MM-DDTHH:mm` as local wall time (avoids browser UTC quirks). */
export function parseDatetimeLocalInputValue(input: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(input.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const parsed = new Date(year, month, day, hour, minute, 0, 0);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hour ||
    parsed.getMinutes() !== minute
  ) {
    return null;
  }

  return parsed;
}

export function startOfTodayLocal(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

export function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Allowed custom start window: today only, up to 1 hour before now. */
export function getCustomStartTimeBounds(now = new Date()): { min: Date; max: Date } {
  const max = truncateToMinute(now);
  const oneHourAgo = truncateToMinute(new Date(now.getTime() - CUSTOM_START_MAX_BACK_MS));
  const todayStart = startOfTodayLocal(now);
  const min = oneHourAgo.getTime() > todayStart.getTime() ? oneHourAgo : todayStart;
  return { min, max };
}

export function defaultCustomStartTime(now = new Date()): Date {
  const { min } = getCustomStartTimeBounds(now);
  const fifteenMinAgo = truncateToMinute(new Date(now.getTime() - 15 * 60 * 1000));
  return fifteenMinAgo.getTime() < min.getTime() ? min : fifteenMinAgo;
}

export function parseCustomSessionStartTime(
  input: string,
  now = new Date()
): { ok: true; date: Date } | { ok: false; message: string } {
  if (!input.trim()) {
    return { ok: false, message: 'Pick a start date and time.' };
  }

  const parsed = parseDatetimeLocalInputValue(input);
  if (!parsed) {
    return { ok: false, message: 'Invalid start time.' };
  }

  return validateCustomSessionStartTime(parsed, now);
}

export function validateCustomSessionStartTime(
  when: Date,
  now = new Date()
): { ok: true; date: Date } | { ok: false; message: string } {
  const whenMinute = truncateToMinute(when);
  const nowMinute = truncateToMinute(now);

  if (!Number.isFinite(whenMinute.getTime())) {
    return { ok: false, message: 'Invalid start time.' };
  }

  if (whenMinute.getTime() > nowMinute.getTime()) {
    return { ok: false, message: 'Start time must be before now.' };
  }

  if (!isSameLocalCalendarDay(whenMinute, nowMinute)) {
    return { ok: false, message: 'Start time must be today (not a previous day).' };
  }

  const { min } = getCustomStartTimeBounds(now);
  if (whenMinute.getTime() < min.getTime()) {
    return {
      ok: false,
      message: 'Start time can only be backdated up to 1 hour (and must be today).',
    };
  }

  return { ok: true, date: whenMinute };
}

export function formatElapsedSinceStart(start: Date, now = new Date()): string {
  const ms = Math.max(0, now.getTime() - start.getTime());
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m elapsed`;
  return `${minutes}m elapsed`;
}

export function formatCustomStartBoundsHint(now = new Date()): string {
  const { min, max } = getCustomStartTimeBounds(now);
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `Today between ${fmt(min)} and ${fmt(max)}`;
}
