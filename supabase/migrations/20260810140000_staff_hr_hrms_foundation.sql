-- Staff HR / HRMS foundation: views, organization_id, HRMS tables, payroll lock, dedup-safe indexes.
-- Idempotent — safe to re-run.

-- ── 1) organization_id on HR tables ─────────────────────────────────────────
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE;

UPDATE public.staff_profiles sp
   SET organization_id = l.organization_id
  FROM public.locations l
 WHERE sp.location_id = l.id
   AND sp.organization_id IS NULL;

ALTER TABLE public.staff_attendance
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE;

UPDATE public.staff_attendance sa
   SET organization_id = l.organization_id
  FROM public.locations l
 WHERE sa.location_id = l.id
   AND sa.organization_id IS NULL;

ALTER TABLE public.staff_leave_requests
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE;

UPDATE public.staff_leave_requests slr
   SET organization_id = l.organization_id
  FROM public.locations l
 WHERE slr.location_id = l.id
   AND slr.organization_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_payroll') THEN
    ALTER TABLE public.staff_payroll
      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE;
    ALTER TABLE public.staff_payroll
      ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.staff_payroll
      ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
    ALTER TABLE public.staff_payroll
      ADD COLUMN IF NOT EXISTS locked_by TEXT;
  END IF;
END$$;

-- ── 2) Dedup attendance before unique index ───────────────────────────────────
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY staff_id, date
           ORDER BY COALESCE(clock_out, clock_in) DESC, created_at DESC NULLS LAST
         ) AS rn
    FROM public.staff_attendance
)
DELETE FROM public.staff_attendance sa
 USING ranked r
 WHERE sa.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS staff_attendance_staff_date_unique
  ON public.staff_attendance (staff_id, date);

-- ── 3) Manual override flag (prevent trigger overwrite) ───────────────────────
ALTER TABLE public.staff_attendance
  ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN NOT NULL DEFAULT false;

-- ── 4) HRMS tables ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_leave_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations (id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  annual_quota NUMERIC NOT NULL DEFAULT 0,
  accrual_mode TEXT NOT NULL DEFAULT 'annual',
  carry_forward_max NUMERIC NOT NULL DEFAULT 0,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, location_id, leave_type)
);

CREATE TABLE IF NOT EXISTS public.staff_leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles (user_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  leave_type TEXT NOT NULL,
  allocated NUMERIC NOT NULL DEFAULT 0,
  used NUMERIC NOT NULL DEFAULT 0,
  remaining NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_id, year, leave_type)
);

CREATE TABLE IF NOT EXISTS public.staff_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, location_id, date)
);

CREATE TABLE IF NOT EXISTS public.staff_hr_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations (id) ON DELETE SET NULL,
  actor_admin_user_id UUID REFERENCES public.admin_users (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_hr_audit_log_org_created
  ON public.staff_hr_audit_log (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.staff_hr_settings (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations (id) ON DELETE CASCADE,
  payroll_payout_threshold NUMERIC DEFAULT 15000,
  break_max_minutes INTEGER DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5) Views ──────────────────────────────────────────────────────────────────
-- Must DROP first: CREATE OR REPLACE cannot rename/reorder view columns (42P16).
DROP VIEW IF EXISTS public.today_active_shifts CASCADE;
DROP VIEW IF EXISTS public.pending_leaves_view CASCADE;
DROP VIEW IF EXISTS public.staff_payslip_view CASCADE;

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
  sp.username AS staff_name,
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
  sp.username AS staff_name,
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
  sp.username,
  sp.full_name,
  sp.designation,
  sp.email,
  sp.location_id,
  sp.organization_id
FROM public.staff_payroll p
JOIN public.staff_profiles sp ON sp.user_id = p.staff_id;

-- ── 6) Org-scoped username (dedup within org first) ───────────────────────────
DO $$
DECLARE
  rec RECORD;
  suffix INT;
  new_username TEXT;
BEGIN
  FOR rec IN
    SELECT user_id, username, organization_id,
           ROW_NUMBER() OVER (PARTITION BY organization_id, username ORDER BY created_at) AS rn
      FROM public.staff_profiles
     WHERE organization_id IS NOT NULL
  LOOP
    IF rec.rn > 1 THEN
      suffix := rec.rn;
      new_username := LEFT(rec.username, 70) || '-' || suffix::text;
      UPDATE public.staff_profiles SET username = new_username WHERE user_id = rec.user_id;
    END IF;
  END LOOP;
END$$;

ALTER TABLE public.staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_username_key;

CREATE UNIQUE INDEX IF NOT EXISTS staff_profiles_org_username_unique
  ON public.staff_profiles (organization_id, username)
  WHERE organization_id IS NOT NULL;

-- ── 7) Auto-fill organization_id trigger on HR tables ────────────────────────
DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.staff_profiles;
CREATE TRIGGER trg_fill_organization_id
  BEFORE INSERT OR UPDATE OF location_id, organization_id ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.fill_organization_id_from_location();

DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.staff_attendance;
CREATE TRIGGER trg_fill_organization_id
  BEFORE INSERT OR UPDATE OF location_id, organization_id ON public.staff_attendance
  FOR EACH ROW EXECUTE FUNCTION public.fill_organization_id_from_location();

DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.staff_leave_requests;
CREATE TRIGGER trg_fill_organization_id
  BEFORE INSERT OR UPDATE OF location_id, organization_id ON public.staff_leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.fill_organization_id_from_location();

-- ── 8) Payroll lock guard on generate_monthly_payroll ─────────────────────────
CREATE OR REPLACE FUNCTION public.generate_monthly_payroll(
  p_staff_id UUID,
  p_month INTEGER,
  p_year INTEGER,
  p_admin_username TEXT
)
RETURNS UUID AS $$
DECLARE
  v_payroll_id UUID;
  v_monthly_salary DECIMAL(10, 2);
  v_total_days INTEGER;
  v_total_hours DECIMAL(10, 2);
  v_gross_earnings DECIMAL(10, 2);
  v_total_deductions DECIMAL(10, 2);
  v_total_allowances DECIMAL(10, 2);
  v_net_salary DECIMAL(10, 2);
  v_locked BOOLEAN;
  v_payment_status TEXT;
BEGIN
  SELECT is_locked, payment_status INTO v_locked, v_payment_status
    FROM public.staff_payroll
   WHERE staff_id = p_staff_id AND month = p_month AND year = p_year;

  IF COALESCE(v_locked, false) OR v_payment_status = 'approved' THEN
    RAISE EXCEPTION 'Payroll is locked or approved. Unlock before regenerating.';
  END IF;

  SELECT monthly_salary INTO v_monthly_salary
  FROM staff_profiles WHERE user_id = p_staff_id;

  SELECT
    COUNT(DISTINCT date),
    COALESCE(SUM(total_working_hours), 0)
  INTO v_total_days, v_total_hours
  FROM staff_attendance
  WHERE staff_id = p_staff_id
    AND EXTRACT(MONTH FROM date) = p_month
    AND EXTRACT(YEAR FROM date) = p_year
    AND status IN ('completed', 'regularized', 'present', 'half_day', 'half_day_lop')
    AND total_working_hours > 0;

  v_gross_earnings := COALESCE(
    (SELECT SUM(daily_earnings) FROM staff_attendance
     WHERE staff_id = p_staff_id
       AND EXTRACT(MONTH FROM date) = p_month
       AND EXTRACT(YEAR FROM date) = p_year
       AND status IN ('completed', 'regularized', 'present', 'half_day', 'half_day_lop')
       AND daily_earnings > 0), 0
  );

  SELECT COALESCE(SUM(amount), 0) INTO v_total_deductions
  FROM staff_deductions
  WHERE staff_id = p_staff_id
    AND month = p_month
    AND year = p_year
    AND deduction_type != 'lop';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_allowances
  FROM staff_allowances
  WHERE staff_id = p_staff_id AND month = p_month AND year = p_year;

  v_net_salary := v_gross_earnings + v_total_allowances - v_total_deductions;

  INSERT INTO staff_payroll (
    staff_id, month, year, total_working_days, total_working_hours,
    base_salary, gross_earnings, total_deductions, total_allowances,
    net_salary, generated_by
  )
  VALUES (
    p_staff_id, p_month, p_year, v_total_days, v_total_hours,
    v_monthly_salary, v_gross_earnings, v_total_deductions, v_total_allowances,
    v_net_salary, p_admin_username
  )
  ON CONFLICT (staff_id, month, year)
  DO UPDATE SET
    total_working_days = EXCLUDED.total_working_days,
    total_working_hours = EXCLUDED.total_working_hours,
    gross_earnings = EXCLUDED.gross_earnings,
    total_deductions = EXCLUDED.total_deductions,
    total_allowances = EXCLUDED.total_allowances,
    net_salary = EXCLUDED.net_salary,
    generated_by = EXCLUDED.generated_by,
    generated_at = NOW()
  RETURNING id INTO v_payroll_id;

  RETURN v_payroll_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON VIEW public.today_active_shifts IS 'Staff currently clocked in today, scoped via staff_profiles.organization_id.';
COMMENT ON VIEW public.pending_leaves_view IS 'Pending leave requests with staff profile join.';
COMMENT ON VIEW public.staff_payslip_view IS 'Payroll rows joined to staff profiles for admin portal and payslip UI.';
