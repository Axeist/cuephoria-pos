/** Derive shift length and hourly rate from staff profile (matches payroll trigger logic). */

type StaffPayFields = {
  hourly_rate?: number | null;
  hourlyRate?: number | null;
  monthly_salary?: number | null;
  monthlySalary?: number | null;
  shift_start_time?: string | null;
  shiftStartTime?: string | null;
  shift_end_time?: string | null;
  shiftEndTime?: string | null;
  default_shift_hours?: number | null;
  defaultShiftHours?: number | null;
};

function pickNumber(...values: unknown[]): number {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

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
  staff: StaffPayFields,
  referenceDate = new Date(),
): number {
  const stored = pickNumber(staff.hourly_rate, staff.hourlyRate);
  if (stored > 0) return stored;

  const monthlySalary = pickNumber(staff.monthly_salary, staff.monthlySalary);
  if (monthlySalary <= 0) return 0;

  const shiftHours =
    pickNumber(staff.default_shift_hours, staff.defaultShiftHours) ||
    shiftHoursFromTimes(
      staff.shift_start_time ?? staff.shiftStartTime,
      staff.shift_end_time ?? staff.shiftEndTime,
    );
  if (shiftHours <= 0) return 0;

  const daysInMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0,
  ).getDate();

  return monthlySalary / daysInMonth / shiftHours;
}

export function resolveStaffShiftHours(staff: StaffPayFields): number {
  return (
    pickNumber(staff.default_shift_hours, staff.defaultShiftHours) ||
    shiftHoursFromTimes(
      staff.shift_start_time ?? staff.shiftStartTime,
      staff.shift_end_time ?? staff.shiftEndTime,
    )
  );
}

export function isStaffSalaryConfigured(staff: StaffPayFields): boolean {
  return resolveStaffHourlyRate(staff) > 0;
}
