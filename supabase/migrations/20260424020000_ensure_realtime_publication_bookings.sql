-- ============================================================================
-- Ensure the bookings / bills / bill_items tables are part of the
-- supabase_realtime publication so postgres_changes subscriptions fire.
--
-- Context:
--   A previous, untimestamped migration (supabase/migrations/enable_bookings_realtime.sql)
--   tried to run `ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;`
--   but Supabase CLI only picks up migrations whose filename starts with a
--   14-digit timestamp, so that file may never have been applied. Even if it
--   was applied, a second invocation would fail because ALTER PUBLICATION ADD
--   errors with "relation is already member of publication" — so we also have
--   to make this idempotent.
--
-- This migration:
--   1. Idempotently adds public.bookings, public.bills, public.bill_items,
--      and public.sessions to the supabase_realtime publication if the
--      publication exists.
--   2. Sets REPLICA IDENTITY FULL on those tables so UPDATE/DELETE events
--      carry full "old" row payloads (needed by some UI update paths).
-- ============================================================================

DO $$
DECLARE
  pub_exists BOOLEAN;
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'bookings',
    'bills',
    'bill_items',
    'sessions'
  ];
  is_member BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) INTO pub_exists;

  IF NOT pub_exists THEN
    RAISE NOTICE 'supabase_realtime publication not found; skipping realtime wiring.';
    RETURN;
  END IF;

  FOREACH tbl IN ARRAY tables LOOP
    -- Skip if the table doesn't exist in this environment.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      RAISE NOTICE 'skipping realtime wiring for %: table does not exist', tbl;
      CONTINUE;
    END IF;

    -- Check whether the table is already part of the publication.
    SELECT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) INTO is_member;

    IF NOT is_member THEN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;',
        tbl
      );
      RAISE NOTICE 'added %.% to supabase_realtime', 'public', tbl;
    END IF;

    -- Ensure full row payloads are available on change events.
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', tbl);
  END LOOP;
END
$$;
