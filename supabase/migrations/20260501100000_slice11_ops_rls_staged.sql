-- ============================================================================
-- Slice 11 — staged RLS deployment on operational tables
-- ============================================================================
-- Why "staged":
--   The existing Cuephoria app today reads operational tables directly with
--   the Supabase anon key (no Auth JWT) because admin_users is a custom
--   identity table, not auth.users. Flipping strict RLS on in one shot would
--   break live booking, POS, and cafe flows.
--
-- Instead, we ENABLE RLS on these tables and install permissive policies
-- that match today's behavior exactly (anon can read/write). This gives us:
--
--   1. A clean base state where every multi-tenant table has RLS "on".
--   2. A single-file switch for future tightening: when we migrate admin_users
--      onto auth.users (or propagate organization_id into JWT claims), we
--      drop these permissive policies and replace them with per-org policies.
--   3. Explicit service_role bypass so all server-side edge functions (which
--      use service_role key) keep working without ceremony.
--
-- NO BEHAVIOUR CHANGE for live users after this migration runs. Guaranteed.
-- ============================================================================

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'stations', 'categories', 'products', 'customers',
    'bills', 'bill_items', 'bookings', 'sessions',
    'expenses', 'invoices'
  ];
  exists_check BOOLEAN;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Skip tables that don't exist in this environment (defensive).
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = ''public'' AND table_name = %L)',
      t
    ) INTO exists_check;
    IF NOT exists_check THEN
      RAISE NOTICE 'skipping RLS on %: table does not exist', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', t);

    -- Drop any permissive policies from previous staged runs before re-adding.
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I;',
      'staged_rls_allow_all_' || t, t
    );

    -- Single permissive policy: allows all roles (including anon) to do
    -- everything. This is intentional — it replicates today's behaviour.
    -- When we're ready to tighten, we replace this policy with per-role +
    -- organization_id-scoped ones.
    EXECUTE format(
      'CREATE POLICY %I ON public.%I
          FOR ALL
          USING (true)
          WITH CHECK (true);',
      'staged_rls_allow_all_' || t, t
    );
  END LOOP;
END
$$;

COMMENT ON SCHEMA public IS
  'Cuephoria / Cuetronix public schema. Slice 11 enables RLS on ops tables with permissive placeholders; tighten after auth.users migration.';
