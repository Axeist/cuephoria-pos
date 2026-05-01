-- Re-attempt partial unique index after operators dedupe historical duplicates.
-- Safe idempotent: same logic as 20260602100000 §3 — skips with WARNING if dupes remain.

DO $$
DECLARE
  dup_count int;
BEGIN
  SELECT count(*) INTO dup_count FROM (
    SELECT location_id, station_id, booking_date, start_time
      FROM public.bookings
     WHERE status IN ('confirmed','in-progress')
     GROUP BY 1,2,3,4
    HAVING count(*) > 1
  ) t;

  IF dup_count > 0 THEN
    RAISE WARNING
      'bookings_no_double_book_idx still skipped: % duplicate live-slot groups. Run supabase/scripts/dedupe_booking_slot_duplicates.sql then re-apply migrations.',
      dup_count;
  ELSE
    EXECUTE $idx$
      CREATE UNIQUE INDEX IF NOT EXISTS bookings_no_double_book_idx
        ON public.bookings (location_id, station_id, booking_date, start_time)
        WHERE status IN ('confirmed','in-progress')
    $idx$;
  END IF;
END $$;
