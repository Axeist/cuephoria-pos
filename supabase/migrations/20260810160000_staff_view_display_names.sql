-- Use full_name as staff_name in HR views when available.

DROP VIEW IF EXISTS public.today_active_shifts CASCADE;
DROP VIEW IF EXISTS public.pending_leaves_view CASCADE;
DROP VIEW IF EXISTS public.staff_payslip_view CASCADE;
DROP VIEW IF EXISTS public.pending_double_shift_requests_view CASCADE;

CREATE VIEW public.today_active_shifts AS
SELECT
  sa.id,
  sa.staff_id,
  sa.date,
  sa.clock_in,
  sa.clock_out,
  sa.break_start_time,
  sa.break_end_time,
  sa.break_duration_minutes,
  sa.total_working_hours,
  sa.status,
  sa.location_id,
  COALESCE(NULLIF(TRIM(sp.full_name), ''), sp.username) AS staff_name,
  sp.username,
  sp.full_name,
  sp.designation,
  sp.organization_id,
  EXTRACT(EPOCH FROM (now() - sa.clock_in)) / 3600.0 AS hours_so_far
FROM public.staff_attendance sa
JOIN public.staff_profiles sp ON sp.user_id = sa.staff_id
WHERE sa.clock_out IS NULL
  AND sa.date = CURRENT_DATE
  AND sa.status IN ('active', 'present', 'completed');

CREATE VIEW public.pending_leaves_view AS
SELECT
  slr.id,
  slr.staff_id,
  slr.leave_type,
  slr.start_date,
  slr.end_date,
  slr.total_days,
  slr.reason,
  slr.status,
  slr.created_at,
  slr.location_id,
  slr.organization_id,
  COALESCE(NULLIF(TRIM(sp.full_name), ''), sp.username) AS staff_name,
  sp.username,
  sp.full_name,
  sp.designation
FROM public.staff_leave_requests slr
JOIN public.staff_profiles sp ON sp.user_id = slr.staff_id
WHERE slr.status = 'pending';

CREATE VIEW public.staff_payslip_view AS
SELECT
  p.id,
  p.staff_id,
  p.month,
  p.year,
  p.total_working_days,
  p.total_working_hours,
  p.base_salary,
  p.gross_earnings,
  p.total_deductions,
  p.total_allowances,
  p.net_salary,
  p.payment_status,
  p.payment_date,
  p.payment_method,
  p.generated_at,
  p.generated_by,
  p.notes,
  COALESCE(p.is_locked, false) AS is_locked,
  COALESCE(NULLIF(TRIM(sp.full_name), ''), sp.username) AS staff_name,
  sp.username,
  sp.full_name,
  sp.designation,
  sp.email,
  sp.location_id,
  sp.organization_id
FROM public.staff_payroll p
JOIN public.staff_profiles sp ON sp.user_id = p.staff_id;

CREATE VIEW public.pending_double_shift_requests_view AS
SELECT
  dsr.*,
  COALESCE(NULLIF(TRIM(sp1.full_name), ''), sp1.username) AS staff_name,
  sp1.username AS staff_username,
  sp1.designation AS staff_designation,
  COALESCE(NULLIF(TRIM(sp2.full_name), ''), sp2.username) AS covered_staff_name,
  sp2.username AS covered_staff_username,
  sp2.designation AS covered_staff_designation,
  sp2.monthly_salary AS covered_staff_salary
FROM public.staff_double_shift_requests dsr
JOIN public.staff_profiles sp1 ON dsr.staff_id = sp1.user_id
JOIN public.staff_profiles sp2 ON dsr.covered_staff_id = sp2.user_id
WHERE dsr.status = 'pending'
ORDER BY dsr.date DESC, dsr.requested_at DESC;
