-- =====================================================
-- CUEPHORIA COMPLETE DATABASE SCHEMA
-- Generated: 2025-01-23
-- Total Tables: 47 | Functions: 22 | Views: 6
-- =====================================================

-- =====================================================
-- SECTION 1: CORE TABLES
-- =====================================================

-- Active Breaks Table
CREATE TABLE IF NOT EXISTS public.active_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  attendance_id UUID NOT NULL,
  break_start TIMESTAMP WITH TIME ZONE NOT NULL,
  break_end TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Admin Authentication
CREATE TABLE IF NOT EXISTS public.admin_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin TEXT NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID
);

-- Admin Users
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bill Items
CREATE TABLE IF NOT EXISTS public.bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bills
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID,
  subtotal NUMERIC NOT NULL,
  discount NUMERIC NOT NULL DEFAULT 0,
  discount_value NUMERIC NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'percentage'::text,
  loyalty_points_used INTEGER NOT NULL DEFAULT 0,
  loyalty_points_earned INTEGER NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_split_payment BOOLEAN DEFAULT false,
  cash_amount NUMERIC DEFAULT 0,
  upi_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'completed'::text,
  comp_note TEXT
);

-- Bill Edit Audit (for tracking bill changes)
CREATE TABLE IF NOT EXISTS public.bill_edit_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL,
  editor_name TEXT NOT NULL,
  changes TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Booking Views (for public booking access)
CREATE TABLE IF NOT EXISTS public.booking_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  access_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed'::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  status_updated_at TIMESTAMP WITH TIME ZONE,
  status_updated_by TEXT,
  booking_group_id UUID,
  coupon_code TEXT,
  discount_percentage NUMERIC,
  original_price NUMERIC,
  final_price NUMERIC
);

-- =====================================================
-- SECTION 2: CASH MANAGEMENT TABLES
-- =====================================================

-- Cash Bank Deposits
CREATE TABLE IF NOT EXISTS public.cash_bank_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,
  transaction_number TEXT NOT NULL,
  person_name TEXT NOT NULL,
  notes TEXT,
  remarks TEXT,
  deposit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL DEFAULT 'system'::text
);

-- Cash Deposits
CREATE TABLE IF NOT EXISTS public.cash_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,
  deposit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bank_name TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL DEFAULT 'system'::text
);

-- Cash Summary (daily cash summary)
CREATE TABLE IF NOT EXISTS public.cash_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  total_sales NUMERIC NOT NULL DEFAULT 0,
  total_deposits NUMERIC NOT NULL DEFAULT 0,
  total_withdrawals NUMERIC NOT NULL DEFAULT 0,
  closing_balance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cash Transactions
CREATE TABLE IF NOT EXISTS public.cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  bill_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL DEFAULT 'system'::text
);

-- Cash Vault
CREATE TABLE IF NOT EXISTS public.cash_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_amount NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by TEXT NOT NULL
);

-- Cash Vault Transactions
CREATE TABLE IF NOT EXISTS public.cash_vault_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL,
  transaction_number TEXT,
  person_name TEXT NOT NULL,
  notes TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL DEFAULT 'system'::text
);

-- =====================================================
-- SECTION 3: CUSTOMER MANAGEMENT TABLES
-- =====================================================

-- Categories (product categories)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Customer Users (for customer authentication)
CREATE TABLE IF NOT EXISTS public.customer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID,
  customer_id UUID,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  referral_code TEXT,
  reset_pin TEXT,
  reset_pin_expiry TIMESTAMP WITH TIME ZONE,
  pin TEXT
);

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  is_member BOOLEAN NOT NULL DEFAULT false,
  membership_expiry_date TIMESTAMP WITH TIME ZONE,
  membership_start_date TIMESTAMP WITH TIME ZONE,
  membership_plan TEXT,
  membership_hours_left INTEGER,
  membership_duration TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  total_play_time INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  membership_seconds_left BIGINT,
  created_via_tournament BOOLEAN DEFAULT false,
  customer_id TEXT,
  custom_id TEXT NOT NULL UNIQUE
);

-- Loyalty Transactions
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID,
  points INTEGER NOT NULL,
  source TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'::text,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- SECTION 4: PRODUCT & INVENTORY TABLES
-- =====================================================

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL,
  image TEXT,
  original_price NUMERIC,
  offer_price NUMERIC,
  student_price NUMERIC,
  duration TEXT,
  membership_hours INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  buying_price NUMERIC,
  selling_price NUMERIC,
  profit NUMERIC
);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL,
  date TEXT NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =====================================================
-- SECTION 5: STAFF MANAGEMENT TABLES
-- =====================================================

-- Staff Profiles
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  full_name TEXT,
  designation TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  monthly_salary NUMERIC NOT NULL DEFAULT 0,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  default_shift_hours NUMERIC DEFAULT 8,
  is_active BOOLEAN DEFAULT true,
  role TEXT DEFAULT 'staff'::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  joining_date DATE DEFAULT CURRENT_DATE,
  shift_start_time TIME DEFAULT '11:00:00'::time,
  shift_end_time TIME DEFAULT '23:00:00'::time,
  total_break_violations INTEGER DEFAULT 0
);

-- Staff Attendance
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  date DATE NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  break_start_time TIMESTAMP WITH TIME ZONE,
  break_end_time TIMESTAMP WITH TIME ZONE,
  break_duration_minutes INTEGER DEFAULT 0,
  total_working_hours NUMERIC,
  daily_earnings NUMERIC,
  status TEXT DEFAULT 'active'::text,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Staff Break Violations
CREATE TABLE IF NOT EXISTS public.staff_break_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  date DATE NOT NULL,
  break_duration_minutes INTEGER NOT NULL,
  excess_minutes INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Staff Deductions
CREATE TABLE IF NOT EXISTS public.staff_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  deduction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT,
  deduction_date DATE NOT NULL,
  marked_by TEXT,
  month INTEGER,
  year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Staff Allowances
CREATE TABLE IF NOT EXISTS public.staff_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  allowance_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT,
  approved_by TEXT,
  month INTEGER,
  year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Staff Leave Requests
CREATE TABLE IF NOT EXISTS public.staff_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER,
  reason TEXT,
  status TEXT DEFAULT 'pending'::text,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Staff Payroll
CREATE TABLE IF NOT EXISTS public.staff_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_working_days INTEGER DEFAULT 0,
  total_working_hours NUMERIC DEFAULT 0,
  base_salary NUMERIC DEFAULT 0,
  gross_earnings NUMERIC DEFAULT 0,
  total_deductions NUMERIC DEFAULT 0,
  total_allowances NUMERIC DEFAULT 0,
  net_salary NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'pending'::text,
  payment_date DATE,
  payment_method TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  generated_by TEXT,
  notes TEXT,
  UNIQUE(staff_id, month, year)
);

-- Staff Work Schedules
CREATE TABLE IF NOT EXISTS public.staff_work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- SECTION 6: STATION & SESSION MANAGEMENT
-- =====================================================

-- Stations
CREATE TABLE IF NOT EXISTS public.stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  hourly_rate NUMERIC NOT NULL,
  is_occupied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  consolidated_name TEXT,
  is_controller BOOLEAN DEFAULT false,
  parent_station_id UUID,
  currentsession JSONB
);

-- Sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL,
  customer_id UUID,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  status TEXT DEFAULT 'active'::text,
  price NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_paused BOOLEAN DEFAULT false,
  paused_at TIMESTAMP WITH TIME ZONE,
  total_paused_time BIGINT DEFAULT 0,
  hourly_rate NUMERIC,
  original_rate NUMERIC,
  coupon_code TEXT,
  discount_amount NUMERIC
);

-- =====================================================
-- SECTION 7: TOURNAMENT MANAGEMENT
-- =====================================================

-- Tournaments
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  game_type TEXT NOT NULL,
  game_variant TEXT,
  game_title TEXT,
  date TEXT NOT NULL,
  players JSONB DEFAULT '[]'::jsonb NOT NULL,
  matches JSONB DEFAULT '[]'::jsonb NOT NULL,
  status TEXT NOT NULL,
  budget NUMERIC,
  winner_prize NUMERIC,
  runner_up_prize NUMERIC,
  winner JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tournament History
CREATE TABLE IF NOT EXISTS public.tournament_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL,
  match_id TEXT NOT NULL,
  player1_name TEXT NOT NULL,
  player2_name TEXT NOT NULL,
  winner_name TEXT NOT NULL,
  match_date DATE NOT NULL,
  match_stage TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tournament Winners
CREATE TABLE IF NOT EXISTS public.tournament_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL,
  winner_name TEXT NOT NULL,
  runner_up_name TEXT,
  prize_amount NUMERIC,
  tournament_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tournament Winner Images
CREATE TABLE IF NOT EXISTS public.tournament_winner_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tournament Public Registrations
CREATE TABLE IF NOT EXISTS public.tournament_public_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  registration_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  entry_fee NUMERIC DEFAULT 250,
  status TEXT NOT NULL DEFAULT 'registered'::text,
  payment_status TEXT DEFAULT 'pending'::text
);

-- Tournament Registrations (legacy)
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  registration_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  entry_fee NUMERIC DEFAULT 250,
  status TEXT NOT NULL DEFAULT 'registered'::text
);

-- =====================================================
-- SECTION 8: MARKETING & PROMOTIONS
-- =====================================================

-- Promotions
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL,
  discount_value NUMERIC NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Offers
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  discount_type TEXT DEFAULT 'percentage'::text,
  discount_value NUMERIC,
  validity_days INTEGER DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  target_audience TEXT DEFAULT 'all'::text,
  min_spend NUMERIC DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- SECTION 9: REWARDS & NOTIFICATIONS
-- =====================================================

-- Rewards
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Reward Redemptions
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID,
  reward_id UUID NOT NULL,
  points_spent INTEGER NOT NULL,
  redemption_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  staff_id TEXT,
  redeemed_at TIMESTAMP WITH TIME ZONE
);

-- Email Templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notification Templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'info',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- =====================================================
-- SECTION 10: INVESTMENT & PARTNERSHIP
-- =====================================================

-- Investment Partners
CREATE TABLE IF NOT EXISTS public.investment_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  investment_amount NUMERIC NOT NULL DEFAULT 0,
  investment_date DATE NOT NULL,
  equity_percentage NUMERIC,
  partnership_type TEXT NOT NULL DEFAULT 'investor'::text,
  status TEXT NOT NULL DEFAULT 'active'::text,
  notes TEXT,
  contact_person TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  initial_investment_amount NUMERIC DEFAULT 0
);

-- Investment Transactions
CREATE TABLE IF NOT EXISTS public.investment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  transaction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT,
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'completed'::text,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SECTION 11: LOGIN & SECURITY
-- =====================================================

-- Login Logs
CREATE TABLE IF NOT EXISTS public.login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL,
  ip_address TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  timezone TEXT,
  isp TEXT,
  browser TEXT,
  browser_version TEXT,
  os TEXT,
  os_version TEXT,
  device_type TEXT,
  device_model TEXT,
  device_vendor TEXT,
  user_agent TEXT,
  login_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  login_success BOOLEAN DEFAULT true,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_accuracy DOUBLE PRECISION,
  selfie_url TEXT,
  screen_resolution TEXT,
  color_depth INTEGER,
  pixel_ratio DOUBLE PRECISION,
  cpu_cores INTEGER,
  device_memory DOUBLE PRECISION,
  touch_support BOOLEAN,
  connection_type TEXT,
  battery_level DOUBLE PRECISION,
  canvas_fingerprint TEXT,
  installed_fonts TEXT
);

-- User Preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- SECTION 12: DATABASE FUNCTIONS
-- =====================================================

-- Function: Calculate Product Profit
CREATE OR REPLACE FUNCTION public.calculate_product_profit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.buying_price IS NOT NULL 
     AND NEW.selling_price IS NOT NULL
     AND NEW.category NOT IN ('membership', 'challenges') THEN
    NEW.profit = NEW.selling_price - NEW.buying_price;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update Updated At Column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate Attendance Earnings
CREATE OR REPLACE FUNCTION public.calculate_attendance_earnings()
RETURNS TRIGGER AS $$
DECLARE
  v_monthly_salary DECIMAL(10, 2);
  v_days_in_month INTEGER;
  v_daily_rate DECIMAL(10, 2);
  v_hourly_rate DECIMAL(10, 2);
  v_shift_hours DECIMAL(5, 2);
BEGIN
  IF NEW.clock_out IS NOT NULL AND NEW.clock_in IS NOT NULL THEN
    SELECT 
      monthly_salary,
      EXTRACT(EPOCH FROM (shift_end_time - shift_start_time)) / 3600
    INTO v_monthly_salary, v_shift_hours
    FROM staff_profiles 
    WHERE user_id = NEW.staff_id;
    
    v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', NEW.date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE);
    v_daily_rate := v_monthly_salary / v_days_in_month;
    v_hourly_rate := v_daily_rate / v_shift_hours;
    
    NEW.total_working_hours := GREATEST(
      EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600 - 
      COALESCE(NEW.break_duration_minutes, 0) / 60.0,
      0
    );
    
    NEW.daily_earnings := NEW.total_working_hours * v_hourly_rate;
    NEW.status := 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Check Break Violation
CREATE OR REPLACE FUNCTION public.check_break_violation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL AND NEW.break_duration_minutes > 60 THEN
    INSERT INTO staff_break_violations (
      staff_id, date, break_duration_minutes, excess_minutes
    ) VALUES (
      NEW.staff_id, NEW.date, NEW.break_duration_minutes, NEW.break_duration_minutes - 60
    );
    
    UPDATE staff_profiles 
    SET total_break_violations = total_break_violations + 1
    WHERE user_id = NEW.staff_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate Leave Days
CREATE OR REPLACE FUNCTION public.calculate_leave_days()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_days := (NEW.end_date - NEW.start_date) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate Monthly Payroll
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
BEGIN
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
    AND status = 'completed';
  
  v_gross_earnings := COALESCE(
    (SELECT SUM(daily_earnings) FROM staff_attendance
     WHERE staff_id = p_staff_id
       AND EXTRACT(MONTH FROM date) = p_month
       AND EXTRACT(YEAR FROM date) = p_year
       AND status = 'completed'), 0
  );
  
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deductions
  FROM staff_deductions
  WHERE staff_id = p_staff_id AND month = p_month AND year = p_year;
  
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

-- Function: Update Cash Vault
CREATE OR REPLACE FUNCTION public.update_cash_vault()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'addition' THEN
    UPDATE public.cash_vault 
    SET current_amount = current_amount + NEW.amount,
        updated_at = now(),
        updated_by = NEW.created_by
    WHERE id = (SELECT id FROM public.cash_vault ORDER BY updated_at DESC LIMIT 1);
  ELSIF NEW.transaction_type = 'deposit' THEN
    UPDATE public.cash_vault 
    SET current_amount = 0,
        updated_at = now(),
        updated_by = NEW.created_by
    WHERE id = (SELECT id FROM public.cash_vault ORDER BY updated_at DESC LIMIT 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Reverse Cash Vault on Delete
CREATE OR REPLACE FUNCTION public.reverse_cash_vault_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.transaction_type = 'addition' THEN
    UPDATE public.cash_vault 
    SET current_amount = current_amount - OLD.amount,
        updated_at = now(),
        updated_by = 'system'
    WHERE id = (SELECT id FROM public.cash_vault ORDER BY updated_at DESC LIMIT 1);
  ELSIF OLD.transaction_type = 'deposit' THEN
    UPDATE public.cash_vault 
    SET current_amount = current_amount + OLD.amount,
        updated_at = now(),
        updated_by = 'system'
    WHERE id = (SELECT id FROM public.cash_vault ORDER BY updated_at DESC LIMIT 1);
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function: Update Partner Investment Amount
CREATE OR REPLACE FUNCTION public.update_partner_investment_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_type = 'investment' THEN
      UPDATE investment_partners 
      SET investment_amount = investment_amount + NEW.amount, updated_at = now()
      WHERE id = NEW.partner_id;
    ELSIF NEW.transaction_type = 'withdrawal' THEN
      UPDATE investment_partners 
      SET investment_amount = investment_amount - NEW.amount, updated_at = now()
      WHERE id = NEW.partner_id;
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    IF OLD.transaction_type = 'investment' THEN
      UPDATE investment_partners 
      SET investment_amount = investment_amount - OLD.amount, updated_at = now()
      WHERE id = OLD.partner_id;
    ELSIF OLD.transaction_type = 'withdrawal' THEN
      UPDATE investment_partners 
      SET investment_amount = investment_amount + OLD.amount, updated_at = now()
      WHERE id = OLD.partner_id;
    END IF;
    
    IF NEW.transaction_type = 'investment' THEN
      UPDATE investment_partners 
      SET investment_amount = investment_amount + NEW.amount, updated_at = now()
      WHERE id = NEW.partner_id;
    ELSIF NEW.transaction_type = 'withdrawal' THEN
      UPDATE investment_partners 
      SET investment_amount = investment_amount - NEW.amount, updated_at = now()
      WHERE id = NEW.partner_id;
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    IF OLD.transaction_type = 'investment' THEN
      UPDATE investment_partners 
      SET investment_amount = investment_amount - OLD.amount, updated_at = now()
      WHERE id = OLD.partner_id;
    ELSIF OLD.transaction_type = 'withdrawal' THEN
      UPDATE investment_partners 
      SET investment_amount = investment_amount + OLD.amount, updated_at = now()
      WHERE id = OLD.partner_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function: Create Cash Transaction on Bill
CREATE OR REPLACE FUNCTION public.create_cash_transaction_on_bill()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_method = 'cash' OR (NEW.is_split_payment = true AND NEW.cash_amount > 0) THEN
    INSERT INTO public.cash_transactions (
      amount, transaction_type, description, bill_id, created_by
    ) VALUES (
      CASE WHEN NEW.payment_method = 'cash' THEN NEW.total ELSE NEW.cash_amount END,
      'sale',
      'Cash sale - Bill #' || NEW.id,
      NEW.id,
      'system'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate Booking Access Code
CREATE OR REPLACE FUNCTION public.generate_booking_access_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function: Create Booking View on New Booking
CREATE OR REPLACE FUNCTION public.create_booking_view_on_new_booking()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO booking_views(booking_id, access_code)
  VALUES(NEW.id, generate_booking_access_code());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Get Available Slots
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_date DATE,
  p_station_id UUID,
  p_slot_duration INTEGER
)
RETURNS TABLE(start_time TIME, end_time TIME, is_available BOOLEAN) AS $$
DECLARE
  opening_time TIME := '11:00:00';
  closing_time TIME := '23:00:00';
  curr_time TIME;
  slot_end_time TIME;
  now_ist_ts TIMESTAMP := (now() AT TIME ZONE 'Asia/Kolkata')::timestamp;
  today_ist DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  next_hour_time TIME := (date_trunc('hour', now_ist_ts) + interval '1 hour')::time;
BEGIN
  curr_time := opening_time;
  
  WHILE curr_time < closing_time LOOP
    slot_end_time := curr_time + (p_slot_duration || ' minutes')::interval;
    IF slot_end_time > closing_time THEN EXIT; END IF;
    
    is_available := NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.station_id = p_station_id
        AND b.booking_date = p_date
        AND lower(b.status) IN ('confirmed','completed')
        AND (
          (b.start_time <= curr_time AND b.end_time > curr_time) OR
          (b.start_time < slot_end_time AND b.end_time >= slot_end_time) OR
          (b.start_time >= curr_time AND b.end_time <= slot_end_time)
        )
    );
    
    IF p_date = today_ist AND curr_time < next_hour_time THEN
      is_available := FALSE;
    END IF;
    
    RETURN QUERY SELECT curr_time, slot_end_time, is_available;
    curr_time := curr_time + (p_slot_duration || ' minutes')::interval;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function: Check Stations Availability
CREATE OR REPLACE FUNCTION public.check_stations_availability(
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_station_ids UUID[]
)
RETURNS TABLE(station_id UUID, is_available BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  WITH booking_conflicts AS (
    SELECT b.station_id
    FROM public.bookings b
    WHERE b.booking_date = p_date
      AND b.status IN ('confirmed', 'in-progress')
      AND b.station_id = ANY(p_station_ids)
      AND (
        (b.start_time <= p_start_time AND b.end_time > p_start_time) OR
        (b.start_time < p_end_time AND b.end_time >= p_end_time) OR
        (b.start_time >= p_start_time AND b.end_time <= p_end_time) OR
        (b.start_time <= p_start_time AND b.end_time >= p_end_time)
      )
  ),
  session_conflicts AS (
    SELECT s.station_id
    FROM public.sessions s
    WHERE s.end_time IS NULL
      AND DATE(s.start_time) = p_date
      AND s.station_id = ANY(p_station_ids)
  )
  SELECT 
    s.id AS station_id,
    NOT EXISTS (SELECT 1 FROM booking_conflicts bc WHERE bc.station_id = s.id)
    AND NOT EXISTS (SELECT 1 FROM session_conflicts sc WHERE sc.station_id = s.id) AS is_available
  FROM unnest(p_station_ids) AS s(id);
END;
$$ LANGUAGE plpgsql;

-- Function: Save Bill Edit Audit
CREATE OR REPLACE FUNCTION public.save_bill_edit_audit(
  p_bill_id UUID,
  p_editor_name TEXT,
  p_changes TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO bill_edit_audit (bill_id, editor_name, changes)
  VALUES (p_bill_id, p_editor_name, p_changes);
END;
$$ LANGUAGE plpgsql;

-- Function: Update Missed Bookings
CREATE OR REPLACE FUNCTION public.update_missed_bookings()
RETURNS VOID AS $$
BEGIN
  UPDATE public.bookings
  SET status = 'no-show'
  WHERE status = 'confirmed'
    AND (
      booking_date < CURRENT_DATE OR
      (booking_date = CURRENT_DATE AND (start_time::time + INTERVAL '30 minutes') < CURRENT_TIME)
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 13: TRIGGERS
-- =====================================================

-- Trigger: Calculate product profit before insert/update
CREATE TRIGGER trigger_calculate_product_profit
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_product_profit();

-- Trigger: Update products updated_at timestamp
CREATE TRIGGER trigger_update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Calculate staff attendance earnings
CREATE TRIGGER trigger_calculate_attendance_earnings
  BEFORE UPDATE ON public.staff_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_attendance_earnings();

-- Trigger: Check break violations
CREATE TRIGGER trigger_check_break_violation
  AFTER UPDATE ON public.staff_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.check_break_violation();

-- Trigger: Calculate leave days
CREATE TRIGGER trigger_calculate_leave_days
  BEFORE INSERT OR UPDATE ON public.staff_leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_leave_days();

-- Trigger: Update cash vault on transaction
CREATE TRIGGER trigger_update_cash_vault
  AFTER INSERT ON public.cash_vault_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cash_vault();

-- Trigger: Reverse cash vault on delete
CREATE TRIGGER trigger_reverse_cash_vault_on_delete
  AFTER DELETE ON public.cash_vault_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_cash_vault_on_delete();

-- Trigger: Update investment partner amount
CREATE TRIGGER trigger_update_partner_investment
  AFTER INSERT OR UPDATE OR DELETE ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_partner_investment_amount();

-- Trigger: Create cash transaction on bill
CREATE TRIGGER trigger_create_cash_transaction_on_bill
  AFTER INSERT ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.create_cash_transaction_on_bill();

-- Trigger: Create booking view on new booking
CREATE TRIGGER trigger_create_booking_view
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_booking_view_on_new_booking();

-- =====================================================
-- SECTION 14: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_edit_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_bank_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_vault_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_public_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_winner_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Admin full access policies
CREATE POLICY "Admin full access" ON public.admin_users FOR ALL USING (true);
CREATE POLICY "Admin full access" ON public.bill_items FOR ALL USING (true);
CREATE POLICY "Admin full access" ON public.bills FOR ALL USING (true);
CREATE POLICY "Admin full access" ON public.bill_edit_audit FOR ALL USING (true);
CREATE POLICY "Admin full access" ON public.products FOR ALL USING (true);
CREATE POLICY "Admin full access" ON public.customers FOR ALL USING (true);
CREATE POLICY "Admin full access" ON public.stations FOR ALL USING (true);

-- Booking policies
CREATE POLICY "Allow all operations" ON public.bookings FOR ALL USING (true);
CREATE POLICY "Allow public booking creation" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anyone to view booking views" ON public.booking_views FOR SELECT USING (true);
CREATE POLICY "Allow public booking views access" ON public.booking_views FOR ALL USING (true);

-- Cash management policies
CREATE POLICY "Allow all operations" ON public.cash_bank_deposits FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.cash_deposits FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.cash_summary FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.cash_transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.cash_vault FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.cash_vault_transactions FOR ALL USING (true);

-- Category policies
CREATE POLICY "Allow all operations" ON public.categories FOR ALL USING (true);

-- Customer policies
CREATE POLICY "New users can be created" ON public.customer_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own data" ON public.customer_users FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY "Allow public customer creation" ON public.customers FOR INSERT WITH CHECK (true);

-- Email & notification policies
CREATE POLICY "Anyone can view" ON public.email_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can view" ON public.notification_templates FOR SELECT USING (true);
CREATE POLICY "Allow all operations" ON public.notifications FOR ALL USING (true);

-- Expense policies
CREATE POLICY "Allow all operations" ON public.expenses FOR ALL USING (true);

-- Investment policies
CREATE POLICY "Allow all operations" ON public.investment_partners FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.investment_transactions FOR ALL USING (true);

-- Login log policies
CREATE POLICY "Allow all operations" ON public.login_logs FOR ALL USING (true);

-- Loyalty policies
CREATE POLICY "Users can view own transactions" ON public.loyalty_transactions 
  FOR SELECT USING (
    (SELECT customer_id FROM customer_users WHERE auth_id = auth.uid()) = customer_id
  );

-- Offer policies
CREATE POLICY "Allow full access" ON public.offers FOR ALL USING (true);
CREATE POLICY "Allow read access" ON public.offers FOR SELECT USING (true);

-- Session policies
CREATE POLICY "Allow all operations" ON public.sessions FOR ALL USING (true);

-- Tournament policies
CREATE POLICY "Allow all operations" ON public.tournament_history FOR ALL USING (true);
CREATE POLICY "Anyone can view" ON public.tournament_history FOR SELECT USING (true);
CREATE POLICY "Allow public registration" ON public.tournament_public_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view" ON public.tournament_public_registrations FOR SELECT USING (true);
CREATE POLICY "Allow all operations" ON public.tournament_winners FOR ALL USING (true);
CREATE POLICY "Anyone can view" ON public.tournament_winners FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users" ON public.tournament_winner_images FOR ALL USING (true);
CREATE POLICY "Anyone can view" ON public.tournament_winner_images FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Allow full access for authenticated" ON public.tournaments FOR ALL USING (auth.role() = 'authenticated');

-- User preference policies
CREATE POLICY "Users can view own" ON public.user_preferences FOR SELECT 
  USING ((user_id)::text = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text));
CREATE POLICY "Users can insert own" ON public.user_preferences FOR INSERT 
  WITH CHECK ((user_id)::text = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text));
CREATE POLICY "Users can update own" ON public.user_preferences FOR UPDATE 
  USING ((user_id)::text = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text));

-- =====================================================
-- SECTION 15: STORAGE BUCKETS
-- =====================================================

-- Storage Bucket: Tournament Images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tournament-images', 'tournament-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage Bucket: Login Selfies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('login-selfies', 'login-selfies', true, 5242880, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for Tournament Images
CREATE POLICY "Anyone can view tournament images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tournament-images');

CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tournament-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'tournament-images' AND auth.role() = 'authenticated');

-- Storage Policies for Login Selfies
CREATE POLICY "Anyone can view selfies"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'login-selfies');

CREATE POLICY "Anyone can upload selfies"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'login-selfies');

-- =====================================================
-- SECTION 16: SEED DATA
-- =====================================================

-- Insert default categories
INSERT INTO public.categories (name) VALUES 
  ('food'), ('drinks'), ('tobacco'), ('challenges'), ('membership')
ON CONFLICT (name) DO NOTHING;

-- SECURITY NOTE:
-- Do NOT seed hardcoded admin credentials in schema files.
-- Create admin users out-of-band (Supabase SQL Editor / secure admin tooling),
-- and store only hashed secrets.

-- Initialize cash vault
INSERT INTO public.cash_vault (current_amount, updated_by) VALUES 
  (0, 'system')
ON CONFLICT DO NOTHING;

-- =====================================================
-- SECTION 17: INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON public.bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON public.bills(created_at);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON public.bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_edit_audit_bill_id ON public.bill_edit_audit(bill_id);
CREATE INDEX IF NOT EXISTS idx_bookings_station_id ON public.bookings(station_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON public.bookings(booking_date, status);
CREATE INDEX IF NOT EXISTS idx_sessions_station_id ON public.sessions(station_id);
CREATE INDEX IF NOT EXISTS idx_sessions_customer_id ON public.sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_id ON public.staff_attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON public.staff_attendance(date);
CREATE INDEX IF NOT EXISTS idx_login_logs_username ON public.login_logs(username);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON public.login_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_custom_id ON public.customers(custom_id);

-- =====================================================
-- DEPLOYMENT COMPLETE
-- Database Schema Created Successfully!
-- =====================================================
