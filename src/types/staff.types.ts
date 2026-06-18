export type StaffReportScope = 'location' | 'all';

export type StaffScope = {
  organizationId: string;
  locationId: string | null;
  locationIds: string[];
  scope: StaffReportScope;
};

export type StaffProfile = {
  user_id: string;
  username: string;
  full_name: string | null;
  designation: string;
  email: string | null;
  phone: string | null;
  monthly_salary: number;
  hourly_rate: number;
  default_shift_hours: number | null;
  shift_start_time: string | null;
  shift_end_time: string | null;
  is_active: boolean;
  role: string | null;
  joining_date: string | null;
  location_id: string;
  organization_id?: string | null;
  admin_user_id: string | null;
  portal_pin?: string | null;
  total_break_violations?: number;
  created_at?: string;
  updated_at?: string;
};

export type StaffAttendance = {
  id: string;
  staff_id: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
  break_duration_minutes: number;
  total_working_hours: number | null;
  daily_earnings: number | null;
  status: string;
  notes: string | null;
  location_id?: string;
  is_manual_override?: boolean;
};

export type ActiveShift = {
  id: string;
  staff_id: string;
  staff_name: string;
  designation: string;
  clock_in: string;
  hours_so_far?: number;
  break_start_time?: string | null;
  break_end_time?: string | null;
};

export type PendingLeave = {
  id: string;
  staff_id: string;
  staff_name: string;
  designation: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  status: string;
};

export type UnifiedRequestType = 'leave' | 'regularization' | 'overtime' | 'double_shift';

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half_day'
  | 'leave'
  | 'regularized'
  | 'half_day_lop'
  | 'absent_lop'
  | 'completed'
  | 'active'
  | null;

export type StaffLeavePolicy = {
  id: string;
  organization_id: string;
  location_id: string | null;
  leave_type: string;
  annual_quota: number;
  accrual_mode: string;
  carry_forward_max: number;
  requires_approval: boolean;
  created_at?: string;
  updated_at?: string;
};

export type StaffTabId =
  | 'overview'
  | 'directory'
  | 'attendance'
  | 'calendar'
  | 'shifts'
  | 'requests'
  | 'payroll'
  | 'reports'
  | 'policies'
  | 'holidays'
  | 'audit';

export type StaffStats = {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  activeNow: number;
  pendingLeaves: number;
  pendingRequests: number;
  monthlyPayroll: number;
};

export type LeaveBalance = {
  leave_type: string;
  allocated: number;
  used: number;
  remaining: number;
};

export type StaffHoliday = {
  id: string;
  organization_id: string;
  location_id: string | null;
  date: string;
  name: string;
  is_paid: boolean;
};

export type StaffAuditEntry = {
  id: string;
  organization_id: string;
  location_id: string | null;
  actor_admin_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};
