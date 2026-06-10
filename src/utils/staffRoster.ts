/** Helpers to derive weekly roster rows from staff profile shift times. */

export const ROSTER_WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export type RosterScheduleRow = {
  id?: string;
  staff_id: string;
  day_of_week: number;
  shift_start: string;
  shift_end: string;
  is_active: boolean;
};

export function normalizeShiftTime(value: string | null | undefined, fallback = '11:00'): string {
  if (!value) return fallback;
  const trimmed = String(value).trim();
  if (trimmed.length >= 5) return trimmed.substring(0, 5);
  return fallback;
}

export function toDbShiftTime(hhmm: string): string {
  return hhmm.length === 5 ? `${hhmm}:00` : hhmm;
}

export function buildWeeklyScheduleFromProfile(staff: {
  user_id: string;
  shift_start_time?: string | null;
  shift_end_time?: string | null;
}): RosterScheduleRow[] {
  const shift_start = normalizeShiftTime(staff.shift_start_time);
  const shift_end = normalizeShiftTime(staff.shift_end_time, '23:00');
  return ROSTER_WEEK_DAYS.map((_, day) => ({
    staff_id: staff.user_id,
    day_of_week: day,
    shift_start,
    shift_end,
    is_active: true,
  }));
}

export function mergeSchedulesWithProfileDefaults(
  stored: RosterScheduleRow[],
  profiles: Array<{
    user_id: string;
    shift_start_time?: string | null;
    shift_end_time?: string | null;
  }>,
): RosterScheduleRow[] {
  const merged = [...stored];
  for (const staff of profiles) {
    const hasAny = merged.some((s) => s.staff_id === staff.user_id);
    if (hasAny) continue;
    merged.push(...buildWeeklyScheduleFromProfile(staff));
  }
  return merged;
}

export function formatShiftRange(start?: string | null, end?: string | null): string {
  const s = normalizeShiftTime(start ?? undefined);
  const e = normalizeShiftTime(end ?? undefined, '23:00');
  return `${s} – ${e}`;
}
