-- =====================================================
-- SECURITY: Lock down admin tables from public access
-- Date: 2026-02-01
--
-- Rationale:
-- - The frontend must never be able to read `admin_users.password`.
-- - Login logs contain sensitive metadata and must be server-only.
--
-- Note:
-- - Server-side code should use the Supabase Service Role key.
-- =====================================================

-- admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access" ON public.admin_users;
DROP POLICY IF EXISTS "Allow all operations" ON public.admin_users;

CREATE POLICY "Deny all access (server-only)" ON public.admin_users
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- login_logs
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON public.login_logs;
DROP POLICY IF EXISTS "Admin full access" ON public.login_logs;

CREATE POLICY "Deny all access (server-only)" ON public.login_logs
  FOR ALL
  USING (false)
  WITH CHECK (false);

