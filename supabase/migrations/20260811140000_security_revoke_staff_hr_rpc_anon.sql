-- Revoke staff HR / payroll RPC EXECUTE from anon (browser publishable key).
-- These RPCs are now invoked only server-side via service role through the
-- /api/admin/staff-hr and /api/admin/staff-portal proxies. The browser callers
-- (useStaffRequests, usePayroll, and the 4 staff portal request dialogs) were
-- migrated off the anon Supabase client, so anon no longer needs EXECUTE.
--
-- Signature-agnostic: revokes every overload of each function by name so we do
-- not have to hardcode argument types (these functions live in the live DB and
-- are not defined in this repo's migration history).
--
-- Rollback: re-GRANT EXECUTE on each function to anon, e.g.
--   GRANT EXECUTE ON FUNCTION public.process_leave_approval(uuid, text) TO anon;
-- (or run the same DO loop with GRANT instead of REVOKE).

DO $$
DECLARE
  fn RECORD;
  fn_names TEXT[] := ARRAY[
    'process_leave_approval',
    'process_regularization',
    'process_ot_request',
    'process_double_shift_request',
    'generate_monthly_payroll',
    'check_regularization_limit',
    'calculate_double_shift_allowance'
  ];
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(fn_names)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon;', fn.sig);
    RAISE NOTICE 'revoked anon EXECUTE on %', fn.sig;
  END LOOP;
END
$$;
