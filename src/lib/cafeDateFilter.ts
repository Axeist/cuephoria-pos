export type CafeDatePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'this_year'
  | 'last_year'
  | 'all_time'
  | 'custom';

export const CAFE_DATE_LABELS: Record<CafeDatePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This week',
  this_month: 'This month',
  last_month: 'Last month',
  last_3_months: 'Last 3 months',
  this_year: 'This year',
  last_year: 'Last year',
  all_time: 'All time',
  custom: 'Custom range',
};

export interface CafeDateRange {
  start: Date;
  end: Date;
}

export function getCafeDateRange(
  preset: CafeDatePreset,
  customStart: string,
  customEnd: string
): CafeDateRange {
  const now = new Date();
  const sod = new Date(now);
  sod.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'today':
      return { start: sod, end: now };
    case 'yesterday': {
      const y = new Date(sod);
      y.setDate(y.getDate() - 1);
      const ye = new Date(sod);
      ye.setMilliseconds(-1);
      return { start: y, end: ye };
    }
    case 'this_week': {
      const d = new Date(sod);
      d.setDate(d.getDate() - d.getDay());
      return { start: d, end: now };
    }
    case 'this_month': {
      const d = new Date(sod);
      d.setDate(1);
      return { start: d, end: now };
    }
    case 'last_month': {
      const s = new Date(sod);
      s.setMonth(s.getMonth() - 1);
      s.setDate(1);
      const e = new Date(sod);
      e.setDate(0);
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
    case 'last_3_months': {
      const d = new Date(sod);
      d.setMonth(d.getMonth() - 3);
      return { start: d, end: now };
    }
    case 'this_year': {
      const d = new Date(sod.getFullYear(), 0, 1);
      return { start: d, end: now };
    }
    case 'last_year': {
      const s = new Date(sod.getFullYear() - 1, 0, 1);
      const e = new Date(sod.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      return { start: s, end: e };
    }
    case 'all_time':
      return { start: new Date(0), end: now };
    case 'custom':
      return {
        start: new Date(customStart + 'T00:00:00'),
        end: new Date(customEnd + 'T23:59:59'),
      };
  }
}

/** Human-readable range summary, eg. "Apr 1 – Apr 21, 2026". */
export function formatCafeDateRange(range: CafeDateRange, preset: CafeDatePreset): string {
  if (preset === 'all_time') return 'All time';

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  const year = (d: Date) => d.getFullYear();

  if (preset === 'today' || preset === 'yesterday') {
    return range.start.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  const sameYear = year(range.start) === year(range.end);
  const startStr = fmt(range.start);
  const endStr = fmt(range.end);

  if (sameYear) return `${startStr} – ${endStr}, ${year(range.end)}`;
  return `${startStr}, ${year(range.start)} – ${endStr}, ${year(range.end)}`;
}
