-- Create double shift requests table
-- This handles cases where a staff member covers for another staff member's shift
CREATE TABLE IF NOT EXISTS public.staff_double_shift_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(user_id) ON DELETE CASCADE,
  covered_staff_id UUID NOT NULL REFERENCES public.staff_profiles(user_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  original_shift_start TIME,
  original_shift_end TIME,
  covered_shift_start TIME,
  covered_shift_end TIME,
  total_hours NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  remarks TEXT,
  allowance_amount NUMERIC DEFAULT 0 -- Will be calculated based on hourly rate
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_double_shift_staff_date ON public.staff_double_shift_requests(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_double_shift_covered_date ON public.staff_double_shift_requests(covered_staff_id, date);
CREATE INDEX IF NOT EXISTS idx_double_shift_status ON public.staff_double_shift_requests(status);

-- Create partial unique index to prevent duplicate pending requests for same staff, covered staff and date
CREATE UNIQUE INDEX IF NOT EXISTS idx_double_shift_unique_pending 
ON public.staff_double_shift_requests(staff_id, covered_staff_id, date) 
WHERE status = 'pending';

-- View for pending double shift requests
CREATE OR REPLACE VIEW public.pending_double_shift_requests_view AS
SELECT 
  dsr.*,
  sp1.username as staff_name,
  sp1.designation as staff_designation,
  sp2.username as covered_staff_name,
  sp2.designation as covered_staff_designation,
  sp2.monthly_salary as covered_staff_salary
FROM staff_double_shift_requests dsr
JOIN staff_profiles sp1 ON dsr.staff_id = sp1.user_id
JOIN staff_profiles sp2 ON dsr.covered_staff_id = sp2.user_id
WHERE dsr.status = 'pending'
ORDER BY dsr.date DESC, dsr.requested_at DESC;

-- Function to calculate double shift allowance
-- Allowance = covered staff's hourly rate * covered shift hours
CREATE OR REPLACE FUNCTION public.calculate_double_shift_allowance(
  p_staff_id UUID,
  p_covered_staff_id UUID,
  p_covered_shift_hours NUMERIC,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC AS $$
DECLARE
  v_covered_salary NUMERIC;
  v_days_in_month INTEGER;
  v_daily_rate NUMERIC;
  v_shift_hours NUMERIC;
  v_hourly_rate NUMERIC;
  v_allowance NUMERIC;
BEGIN
  -- Get covered staff's salary and shift hours
  SELECT 
    monthly_salary,
    EXTRACT(EPOCH FROM (shift_end_time - shift_start_time)) / 3600
  INTO v_covered_salary, v_shift_hours
  FROM staff_profiles
  WHERE user_id = p_covered_staff_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Calculate hourly rate for covered staff
  v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', p_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE);
  v_daily_rate := v_covered_salary / v_days_in_month;
  v_hourly_rate := v_daily_rate / v_shift_hours;
  
  -- Calculate allowance: covered shift hours * covered hourly rate
  v_allowance := p_covered_shift_hours * v_hourly_rate;
  
  RETURN v_allowance;
END;
$$ LANGUAGE plpgsql;

-- Function to process approved double shift request
CREATE OR REPLACE FUNCTION public.process_double_shift_request(
  p_request_id UUID,
  p_action TEXT, -- 'approve' or 'reject'
  p_remarks TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_request RECORD;
  v_allowance NUMERIC;
BEGIN
  -- Get double shift request
  SELECT *
  INTO v_request
  FROM staff_double_shift_requests
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Double shift request not found';
  END IF;
  
  IF p_action = 'approve' THEN
    -- Calculate allowance if not already set
    IF v_request.allowance_amount = 0 OR v_request.allowance_amount IS NULL THEN
      SELECT calculate_double_shift_allowance(
        v_request.staff_id,
        v_request.covered_staff_id,
        v_request.total_hours,
        v_request.date
      ) INTO v_allowance;
    ELSE
      v_allowance := v_request.allowance_amount;
    END IF;
    
    -- Update request status
    UPDATE staff_double_shift_requests
    SET 
      status = 'approved',
      reviewed_at = now(),
      reviewed_by = current_setting('request.jwt.claims', true)::json->>'username',
      allowance_amount = v_allowance
    WHERE id = p_request_id;
    
    -- Add allowance to payroll
    INSERT INTO staff_allowances (
      staff_id,
      allowance_type,
      amount,
      reason,
      approved_by,
      month,
      year
    ) VALUES (
      v_request.staff_id,
      'double_shift',
      v_allowance,
      'Double shift allowance - Covered for ' || 
      (SELECT username FROM staff_profiles WHERE user_id = v_request.covered_staff_id) || 
      ' on ' || v_request.date || ' (' || v_request.total_hours || ' hours)',
      current_setting('request.jwt.claims', true)::json->>'username',
      EXTRACT(MONTH FROM v_request.date)::INTEGER,
      EXTRACT(YEAR FROM v_request.date)::INTEGER
    ) ON CONFLICT DO NOTHING;
  ELSE
    -- Reject request
    UPDATE staff_double_shift_requests
    SET 
      status = 'rejected',
      reviewed_at = now(),
      reviewed_by = current_setting('request.jwt.claims', true)::json->>'username',
      remarks = p_remarks
    WHERE id = p_request_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

