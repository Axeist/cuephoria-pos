// src/lib/date.ts
/**
 * Safely converts DB timestamps (ISO, Postgres "YYYY-MM-DD HH:mm:ss",
 * millis, or Date) to a Date parsed in UTC to avoid TZ drift.
 */
export const toDate = (value: any): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    // Normalize Postgres "YYYY-MM-DD HH:mm:ss" to ISO and append Z
    const s = value.includes('T') ? value : value.replace(' ', 'T');
    return new Date(s.endsWith('Z') ? s : `${s}Z`);
  }
  return new Date(value);
};

/** Convenience: add a normalized Date field to every bill once. */
export const normalizeBills = <T extends { createdAt: any }>(bills: T[]) =>
  bills.map(b => ({ ...b, createdAtDate: toDate(b.createdAt) }));

/** Between helper (inclusive start, inclusive end) */
export const isBetween = (d: Date, start: Date, end: Date) =>
  d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
