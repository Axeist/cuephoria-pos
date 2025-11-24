-- Add/Update Admin Credentials
-- Username: admin
-- Password: Cuephoriagaming@2025
-- Password Reset PIN: 2101

-- Insert or update admin user
INSERT INTO public.admin_users (username, password, is_admin) 
VALUES ('admin', 'Cuephoriagaming@2025', true)
ON CONFLICT (username) 
DO UPDATE SET 
  password = EXCLUDED.password,
  is_admin = EXCLUDED.is_admin;

-- Set password reset PIN to 2101
-- Insert if doesn't exist, update if exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_auth LIMIT 1) THEN
    INSERT INTO public.admin_auth (pin, last_updated)
    VALUES ('2101', now());
  ELSE
    UPDATE public.admin_auth 
    SET pin = '2101', last_updated = now();
  END IF;
END $$;

