-- ============================================================================
-- Ensure public.customers is part of the supabase_realtime publication so the
-- postgres_changes subscription in src/hooks/useCustomers.ts actually fires.
--
-- Context:
--   useCustomers subscribes to INSERT/UPDATE/DELETE on public.customers
--   (filtered by location_id) to keep every device's customer list in sync
--   without a manual refresh. That subscription has never delivered events
--   because `customers` was never added to the supabase_realtime publication
--   (unlike bookings/bills/sessions — see
--   20260424020000_ensure_realtime_publication_bookings.sql).
--
-- This migration mirrors that proven, idempotent pattern:
--   1. Adds public.customers to supabase_realtime if not already a member.
--   2. Sets REPLICA IDENTITY FULL so UPDATE/DELETE events carry full old-row
--      payloads.
--
-- This does NOT touch RLS or any access-control policy on customers — it only
-- governs which row changes are streamed over realtime.
--
-- Rollback:
--   ALTER PUBLICATION supabase_realtime DROP TABLE public.customers;
--   ALTER TABLE public.customers REPLICA IDENTITY DEFAULT;
-- ============================================================================

DO $$
DECLARE
  pub_exists BOOLEAN;
  is_member BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) INTO pub_exists;

  IF NOT pub_exists THEN
    RAISE NOTICE 'supabase_realtime publication not found; skipping realtime wiring.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customers'
  ) THEN
    RAISE NOTICE 'skipping realtime wiring for customers: table does not exist';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'customers'
  ) INTO is_member;

  IF NOT is_member THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;';
    RAISE NOTICE 'added public.customers to supabase_realtime';
  END IF;

  EXECUTE 'ALTER TABLE public.customers REPLICA IDENTITY FULL;';
END
$$;
