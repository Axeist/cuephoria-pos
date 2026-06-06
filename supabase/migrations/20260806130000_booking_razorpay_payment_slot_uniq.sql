-- Prevent duplicate Razorpay checkout rows for the same station + slot + payment.
-- Skips safely if historical duplicates still exist (run dedupe first).

DO $$
DECLARE
  dup_count int;
BEGIN
  SELECT count(*) INTO dup_count FROM (
    SELECT payment_txn_id, station_id, booking_date, start_time
      FROM public.bookings
     WHERE payment_mode = 'razorpay'
       AND payment_txn_id IS NOT NULL
       AND status IN ('confirmed', 'in-progress')
     GROUP BY 1, 2, 3, 4
    HAVING count(*) > 1
  ) t;

  IF dup_count > 0 THEN
    RAISE WARNING
      'bookings_razorpay_payment_slot_uniq skipped: % duplicate payment+slot groups. Dedupe before re-applying.',
      dup_count;
  ELSE
    EXECUTE $idx$
      CREATE UNIQUE INDEX IF NOT EXISTS bookings_razorpay_payment_slot_uniq
        ON public.bookings (payment_txn_id, station_id, booking_date, start_time)
        WHERE payment_mode = 'razorpay'
          AND payment_txn_id IS NOT NULL
          AND status IN ('confirmed', 'in-progress')
    $idx$;
  END IF;
END $$;
