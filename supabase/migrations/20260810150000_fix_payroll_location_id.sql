-- Fix generate_monthly_payroll: staff_payroll.location_id is NOT NULL after multi-location migration.

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
  v_location_id UUID;
  v_organization_id UUID;
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

  SELECT monthly_salary, location_id, organization_id
    INTO v_monthly_salary, v_location_id, v_organization_id
    FROM public.staff_profiles
   WHERE user_id = p_staff_id;

  IF v_location_id IS NULL THEN
    RAISE EXCEPTION 'Staff profile has no branch assigned. Set location_id on the staff profile before generating payroll.';
  END IF;

  SELECT
    COUNT(DISTINCT date),
    COALESCE(SUM(total_working_hours), 0)
  INTO v_total_days, v_total_hours
  FROM public.staff_attendance
  WHERE staff_id = p_staff_id
    AND EXTRACT(MONTH FROM date) = p_month
    AND EXTRACT(YEAR FROM date) = p_year
    AND status IN ('completed', 'regularized', 'present', 'half_day', 'half_day_lop')
    AND total_working_hours > 0;

  v_gross_earnings := COALESCE(
    (SELECT SUM(daily_earnings) FROM public.staff_attendance
     WHERE staff_id = p_staff_id
       AND EXTRACT(MONTH FROM date) = p_month
       AND EXTRACT(YEAR FROM date) = p_year
       AND status IN ('completed', 'regularized', 'present', 'half_day', 'half_day_lop')
       AND daily_earnings > 0), 0
  );

  SELECT COALESCE(SUM(amount), 0) INTO v_total_deductions
  FROM public.staff_deductions
  WHERE staff_id = p_staff_id
    AND month = p_month
    AND year = p_year
    AND deduction_type != 'lop';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_allowances
  FROM public.staff_allowances
  WHERE staff_id = p_staff_id AND month = p_month AND year = p_year;

  v_net_salary := v_gross_earnings + v_total_allowances - v_total_deductions;

  INSERT INTO public.staff_payroll (
    staff_id, month, year, total_working_days, total_working_hours,
    base_salary, gross_earnings, total_deductions, total_allowances,
    net_salary, generated_by, location_id, organization_id
  )
  VALUES (
    p_staff_id, p_month, p_year, v_total_days, v_total_hours,
    v_monthly_salary, v_gross_earnings, v_total_deductions, v_total_allowances,
    v_net_salary, p_admin_username, v_location_id, v_organization_id
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
    location_id = EXCLUDED.location_id,
    organization_id = EXCLUDED.organization_id,
    generated_at = NOW()
  RETURNING id INTO v_payroll_id;

  RETURN v_payroll_id;
END;
$$ LANGUAGE plpgsql;

-- Auto-fill location/org on direct inserts (deductions, allowances, payroll)
DO $$
BEGIN
  IF to_regclass('public.staff_payroll') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.staff_payroll;
    CREATE TRIGGER trg_fill_organization_id
      BEFORE INSERT OR UPDATE OF location_id, organization_id ON public.staff_payroll
      FOR EACH ROW EXECUTE FUNCTION public.fill_organization_id_from_location();
  END IF;

  IF to_regclass('public.staff_deductions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.staff_deductions;
    CREATE TRIGGER trg_fill_organization_id
      BEFORE INSERT OR UPDATE OF location_id, organization_id ON public.staff_deductions
      FOR EACH ROW EXECUTE FUNCTION public.fill_organization_id_from_location();
  END IF;

  IF to_regclass('public.staff_allowances') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.staff_allowances;
    CREATE TRIGGER trg_fill_organization_id
      BEFORE INSERT OR UPDATE OF location_id, organization_id ON public.staff_allowances
      FOR EACH ROW EXECUTE FUNCTION public.fill_organization_id_from_location();
  END IF;
END$$;
