-- Create overtime tracking table
CREATE TABLE IF NOT EXISTS public.staff_overtime (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(user_id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES public.staff_attendance(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  overtime_hours NUMERIC NOT NULL,
  overtime_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create late login tracking table
CREATE TABLE IF NOT EXISTS public.staff_late_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(user_id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES public.staff_attendance(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  scheduled_clock_in TIME NOT NULL,
  actual_clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  late_minutes INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(staff_id, date)
);

-- Create overtime requests table (for staff to claim OT days)
CREATE TABLE IF NOT EXISTS public.staff_overtime_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(user_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  overtime_hours NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  remarks TEXT,
  overtime_amount NUMERIC DEFAULT 100, -- ₹100 per OT day
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_overtime_staff_date ON public.staff_overtime(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_overtime_status ON public.staff_overtime(status);
CREATE INDEX IF NOT EXISTS idx_late_login_staff_date ON public.staff_late_logins(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_ot_request_staff_date ON public.staff_overtime_requests(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_ot_request_status ON public.staff_overtime_requests(status);

-- Create partial unique index to prevent duplicate pending requests for same staff and date
CREATE UNIQUE INDEX IF NOT EXISTS idx_ot_request_unique_pending 
ON public.staff_overtime_requests(staff_id, date) 
WHERE status = 'pending';

-- Function to detect and record overtime
CREATE OR REPLACE FUNCTION public.detect_and_record_overtime()
RETURNS TRIGGER AS $$
DECLARE
  v_staff_profile RECORD;
  v_shift_hours NUMERIC;
  v_actual_hours NUMERIC;
  v_overtime_hours NUMERIC;
  v_scheduled_end TIME;
BEGIN
  -- Only process if clock_out is set
  IF NEW.clock_out IS NULL OR NEW.clock_in IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get staff profile with shift times
  SELECT 
    shift_start_time,
    shift_end_time,
    EXTRACT(EPOCH FROM (shift_end_time - shift_start_time)) / 3600 as shift_hours
  INTO v_staff_profile
  FROM staff_profiles
  WHERE user_id = NEW.staff_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Skip overtime detection for absent days
  IF NEW.status IN ('absent', 'absent_lop') THEN
    RETURN NEW;
  END IF;

  -- Calculate actual working hours (excluding breaks)
  v_actual_hours := NEW.total_working_hours;
  v_shift_hours := v_staff_profile.shift_hours;

  -- Check if there's overtime (only for present/working days)
  IF v_actual_hours > v_shift_hours AND v_actual_hours > 0 THEN
    v_overtime_hours := v_actual_hours - v_shift_hours;
    
    -- Insert or update overtime record
    INSERT INTO staff_overtime (
      staff_id,
      attendance_id,
      date,
      overtime_hours,
      status,
      requested_by
    ) VALUES (
      NEW.staff_id,
      NEW.id,
      NEW.date,
      v_overtime_hours,
      'pending',
      'system'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to detect and record late login
CREATE OR REPLACE FUNCTION public.detect_and_record_late_login()
RETURNS TRIGGER AS $$
DECLARE
  v_staff_profile RECORD;
  v_scheduled_clock_in TIME;
  v_actual_clock_in TIME;
  v_late_minutes INTEGER;
BEGIN
  -- Only process if clock_in is set
  IF NEW.clock_in IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get staff profile with shift start time
  SELECT shift_start_time
  INTO v_staff_profile
  FROM staff_profiles
  WHERE user_id = NEW.staff_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_scheduled_clock_in := v_staff_profile.shift_start_time;
  v_actual_clock_in := NEW.clock_in::TIME;

  -- Skip late login detection for absent days
  IF NEW.status IN ('absent', 'absent_lop') THEN
    RETURN NEW;
  END IF;

  -- Check if late (actual > scheduled)
  IF v_actual_clock_in > v_scheduled_clock_in THEN
    -- Calculate late minutes
    v_late_minutes := EXTRACT(EPOCH FROM (v_actual_clock_in - v_scheduled_clock_in)) / 60;
    
    -- Insert or update late login record
    INSERT INTO staff_late_logins (
      staff_id,
      attendance_id,
      date,
      scheduled_clock_in,
      actual_clock_in,
      late_minutes
    ) VALUES (
      NEW.staff_id,
      NEW.id,
      NEW.date,
      v_scheduled_clock_in,
      NEW.clock_in,
      v_late_minutes::INTEGER
    )
    ON CONFLICT (staff_id, date) DO UPDATE
    SET 
      actual_clock_in = NEW.clock_in,
      late_minutes = v_late_minutes::INTEGER,
      attendance_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_detect_overtime ON staff_attendance;
CREATE TRIGGER trigger_detect_overtime
  AFTER INSERT OR UPDATE OF clock_out, total_working_hours
  ON staff_attendance
  FOR EACH ROW
  WHEN (NEW.clock_out IS NOT NULL)
  EXECUTE FUNCTION detect_and_record_overtime();

DROP TRIGGER IF EXISTS trigger_detect_late_login ON staff_attendance;
CREATE TRIGGER trigger_detect_late_login
  AFTER INSERT OR UPDATE OF clock_in
  ON staff_attendance
  FOR EACH ROW
  WHEN (NEW.clock_in IS NOT NULL)
  EXECUTE FUNCTION detect_and_record_late_login();

-- View for pending OT requests
CREATE OR REPLACE VIEW public.pending_ot_requests_view AS
SELECT 
  sor.*,
  sp.username,
  sp.full_name,
  sp.designation
FROM staff_overtime_requests sor
JOIN staff_profiles sp ON sor.staff_id = sp.user_id
WHERE sor.status = 'pending'
ORDER BY sor.date DESC, sor.created_at DESC;

-- View for staff overtime and late login summary
CREATE OR REPLACE VIEW public.staff_attendance_summary AS
SELECT 
  sp.user_id,
  sp.username,
  sp.designation,
  COUNT(DISTINCT CASE WHEN sl.date >= DATE_TRUNC('month', CURRENT_DATE) THEN sl.id END) as late_logins_this_month,
  COALESCE(SUM(CASE WHEN so.date >= DATE_TRUNC('month', CURRENT_DATE) AND so.status = 'approved' THEN so.overtime_hours END), 0) as approved_ot_hours_this_month,
  COALESCE(SUM(CASE WHEN sor.date >= DATE_TRUNC('month', CURRENT_DATE) AND sor.status = 'pending' THEN sor.overtime_hours END), 0) as pending_ot_hours_this_month,
  COALESCE(SUM(CASE WHEN sor.date >= DATE_TRUNC('month', CURRENT_DATE) AND sor.status = 'approved' THEN sor.overtime_amount END), 0) as approved_ot_amount_this_month
FROM staff_profiles sp
LEFT JOIN staff_late_logins sl ON sp.user_id = sl.staff_id
LEFT JOIN staff_overtime so ON sp.user_id = so.staff_id
LEFT JOIN staff_overtime_requests sor ON sp.user_id = sor.staff_id
WHERE sp.is_active = true
GROUP BY sp.user_id, sp.username, sp.designation;

-- Function to process approved OT request
CREATE OR REPLACE FUNCTION public.process_ot_request(
  p_ot_request_id UUID,
  p_action TEXT, -- 'approve' or 'reject'
  p_remarks TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_ot_request RECORD;
BEGIN
  -- Get OT request
  SELECT *
  INTO v_ot_request
  FROM staff_overtime_requests
  WHERE id = p_ot_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'OT request not found';
  END IF;
  
  IF p_action = 'approve' THEN
    -- Update OT request status
    UPDATE staff_overtime_requests
    SET 
      status = 'approved',
      reviewed_at = now(),
      reviewed_by = current_setting('request.jwt.claims', true)::json->>'username',
      remarks = p_remarks
    WHERE id = p_ot_request_id;
    
    -- Add OT allowance to payroll (₹100 per OT day)
    -- Check if allowance already exists to prevent duplicates
    IF NOT EXISTS (
      SELECT 1 FROM staff_allowances
      WHERE staff_id = v_ot_request.staff_id
        AND allowance_type = 'overtime'
        AND month = EXTRACT(MONTH FROM v_ot_request.date)::INTEGER
        AND year = EXTRACT(YEAR FROM v_ot_request.date)::INTEGER
        AND reason LIKE '%' || v_ot_request.date || '%'
    ) THEN
      INSERT INTO staff_allowances (
        staff_id,
        allowance_type,
        amount,
        reason,
        approved_by,
        month,
        year
      ) VALUES (
        v_ot_request.staff_id,
        'overtime',
        v_ot_request.overtime_amount,
        'Overtime allowance - ' || v_ot_request.date || ' (' || v_ot_request.overtime_hours || ' hours)',
        current_setting('request.jwt.claims', true)::json->>'username',
        EXTRACT(MONTH FROM v_ot_request.date)::INTEGER,
        EXTRACT(YEAR FROM v_ot_request.date)::INTEGER
      );
    END IF;
  ELSE
    -- Reject OT request
    UPDATE staff_overtime_requests
    SET 
      status = 'rejected',
      reviewed_at = now(),
      reviewed_by = current_setting('request.jwt.claims', true)::json->>'username',
      remarks = p_remarks
    WHERE id = p_ot_request_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

