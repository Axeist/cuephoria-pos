/** Derive shift length and hourly rate from staff profile (matches payroll trigger logic). */

export function shiftHoursFromTimes(
  start?: string | null,
  end?: string | null,
  fallback = 12,
): number {
  if (!start || !end) return fallback;
  const [sh, sm] = start.substring(0, 5).split(':').map(Number);
  const [eh, em] = end.substring(0, 5).split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return fallback;
  let diffMinutes = eh * 60 + em - (sh * 60 + sm);
  if (diffMinutes <= 0) diffMinutes += 24 * 60;
  return diffMinutes / 60;
}

export function resolveStaffHourlyRate(
  staff: {
    hourly_rate?: number | null;
    monthly_salary?: number | null;
    shift_start_time?: string | null;
    shift_end_time?: string | null;
    default_shift_hours?: number | null;
  },
  referenceDate = new Date(),
): number {
  const stored = Number(staff.hourly_rate);
  if (stored > 0) return stored;

  const monthlySalary = Number(staff.monthly_salary);
  if (!monthlySalary || monthlySalary <= 0) return 0;

  const shiftHours =
    Number(staff.default_shift_hours) ||
    shiftHoursFromTimes(staff.shift_start_time, staff.shift_end_time);
  const daysInMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0,
  ).getDate();

  return monthlySalary / daysInMonth / shiftHours;
}

export function resolveStaffShiftHours(staff: {
  default_shift_hours?: number | null;
  shift_start_time?: string | null;
  shift_end_time?: string | null;
}): number {
  return (
    Number(staff.default_shift_hours) ||
    shiftHoursFromTimes(staff.shift_start_time, staff.shift_end_time)
  );
}
