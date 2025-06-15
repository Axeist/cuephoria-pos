
-- 1. Table: staff_profiles
CREATE TABLE public.staff_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NULL, -- Optional: can link to auth.users if needed in the future
  username text NOT NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  role text DEFAULT 'staff', -- staff, admin
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Table: staff_attendance
CREATE TABLE public.staff_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  clock_in timestamptz,
  clock_out timestamptz,
  duration_minutes integer,
  status text NOT NULL DEFAULT 'present', -- present, absent, late, on_leave
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_attendance_staff_date ON public.staff_attendance (staff_id, date);

-- 3. Table: staff_work_schedules
CREATE TABLE public.staff_work_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  weekday int NOT NULL, -- 0=Sunday, 6=Saturday
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Table: staff_leave_requests
CREATE TABLE public.staff_leave_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, canceled
  remarks text,
  created_by uuid, -- for audit/admins
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

-- RLS: Enable and permit access for admins only (starter, will extend for UI logic)
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_leave_requests ENABLE ROW LEVEL SECURITY;

-- Allow admin to view and manage all
CREATE POLICY "Allow all for admin (starter)" ON public.staff_profiles
  FOR ALL
  USING (true);

CREATE POLICY "Allow all for admin (starter)" ON public.staff_attendance
  FOR ALL
  USING (true);

CREATE POLICY "Allow all for admin (starter)" ON public.staff_work_schedules
  FOR ALL
  USING (true);

CREATE POLICY "Allow all for admin (starter)" ON public.staff_leave_requests
  FOR ALL
  USING (true);

-- TODO: Extend policies to restrict staff to their own rows only if/when user_id available

