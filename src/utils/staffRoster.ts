/** Helpers to derive weekly roster rows from staff profile shift times. */

export const ROSTER_WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const DEFAULT_SHIFT_START = '11:00';
export const DEFAULT_SHIFT_END = '23:00';

export type RosterScheduleRow = {
  id?: string;
  staff_id: string;
  day_of_week: number;
  shift_start: string;
  shift_end: string;
  is_active: boolean;
};

const TIME_PATTERN = /(\d{1,2}):(\d{2})(?::\d{2})?/;

export function normalizeShiftTime(
  value: string | null | undefined,
  fallback = DEFAULT_SHIFT_START,
): string {
  if (value == null || value === '') return fallback;
  const trimmed = String(value).trim();

  if (trimmed.includes('T')) {
    const iso = trimmed.match(/T(\d{1,2}):(\d{2})/);
    if (iso) {
      return `${iso[1].padStart(2, '0')}:${iso[2]}`;
    }
  }

  const match = trimmed.match(TIME_PATTERN);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }

  return fallback;
}

export function toDbShiftTime(hhmm: string): string {
  return hhmm.length === 5 ? `${hhmm}:00` : hhmm;
}

/** Map DB row — supports both legacy (start_time/weekday) and current column names. */
export function mapStoredScheduleRow(raw: Record<string, unknown>): RosterScheduleRow {
  const startRaw = raw.shift_start ?? raw.start_time;
  const endRaw = raw.shift_end ?? raw.end_time;
  const dayRaw = raw.day_of_week ?? raw.weekday;

  return {
    id: typeof raw.id === 'string' ? raw.id : undefined,
    staff_id: String(raw.staff_id),
    day_of_week: Number(dayRaw),
    shift_start: normalizeShiftTime(startRaw as string | null | undefined),
    shift_end: normalizeShiftTime(endRaw as string | null | undefined, DEFAULT_SHIFT_END),
    is_active: raw.is_active !== false,
  };
}

export function buildWeeklyScheduleFromProfile(staff: {
  user_id: string;
  shift_start_time?: string | null;
  shift_end_time?: string | null;
}): RosterScheduleRow[] {
  const shift_start = normalizeShiftTime(staff.shift_start_time);
  const shift_end = normalizeShiftTime(staff.shift_end_time, DEFAULT_SHIFT_END);
  return ROSTER_WEEK_DAYS.map((_, day) => ({
    staff_id: staff.user_id,
    day_of_week: day,
    shift_start,
    shift_end,
    is_active: true,
  }));
}

function isPlaceholderShift(start: string, end: string): boolean {
  return (
    normalizeShiftTime(start) === DEFAULT_SHIFT_START &&
    normalizeShiftTime(end, DEFAULT_SHIFT_END) === DEFAULT_SHIFT_END
  );
}

export function isLegacyPlaceholderSchedule(rows: RosterScheduleRow[]): boolean {
  if (rows.length === 0) return false;
  return rows.every((r) => isPlaceholderShift(r.shift_start, r.shift_end));
}

/** Replace stale 11:00–23:00 placeholder rows with profile shift times. */
export function reconcilePlaceholderSchedules(
  stored: RosterScheduleRow[],
  profiles: Array<{
    user_id: string;
    shift_start_time?: string | null;
    shift_end_time?: string | null;
  }>,
): RosterScheduleRow[] {
  let merged = [...stored];

  for (const staff of profiles) {
    const profileStart = normalizeShiftTime(staff.shift_start_time);
    const profileEnd = normalizeShiftTime(staff.shift_end_time, DEFAULT_SHIFT_END);
    const profileIsPlaceholder = isPlaceholderShift(profileStart, profileEnd);
    if (profileIsPlaceholder) continue;

    const staffRows = merged.filter((s) => s.staff_id === staff.user_id);
    if (staffRows.length === 0) continue;

    const allDaysPlaceholder = staffRows.every((r) =>
      isPlaceholderShift(r.shift_start, r.shift_end),
    );
    if (!allDaysPlaceholder) continue;

    merged = merged.filter((s) => s.staff_id !== staff.user_id);
    merged.push(...buildWeeklyScheduleFromProfile(staff));
  }

  return merged;
}

export function mergeSchedulesWithProfileDefaults(
  stored: RosterScheduleRow[],
  profiles: Array<{
    user_id: string;
    shift_start_time?: string | null;
    shift_end_time?: string | null;
  }>,
): RosterScheduleRow[] {
  const merged = reconcilePlaceholderSchedules(stored, profiles);
  for (const staff of profiles) {
    const hasAny = merged.some((s) => s.staff_id === staff.user_id);
    if (hasAny) continue;
    merged.push(...buildWeeklyScheduleFromProfile(staff));
  }
  return merged;
}

export function formatShiftTimeCompact(hhmm: string): string {
  const normalized = normalizeShiftTime(hhmm);
  const [hStr, mStr] = normalized.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h >= 12 ? 'pm' : 'am';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return m === 0 ? `${h}${suffix}` : `${h}:${String(m).padStart(2, '0')}${suffix}`;
}

export function formatShiftRange(start?: string | null, end?: string | null): string {
  const s = normalizeShiftTime(start ?? undefined);
  const e = normalizeShiftTime(end ?? undefined, DEFAULT_SHIFT_END);
  return `${s} – ${e}`;
}

export function formatShiftRangeCompact(start?: string | null, end?: string | null): string {
  const s = normalizeShiftTime(start ?? undefined);
  const e = normalizeShiftTime(end ?? undefined, DEFAULT_SHIFT_END);
  return `${formatShiftTimeCompact(s)} – ${formatShiftTimeCompact(e)}`;
}
