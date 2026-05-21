-- Collapse duplicate Razorpay checkout bills (e.g. two ₹300 bills for one 2-controller
-- booking) by order id and by identical slot fingerprint on the same day.

BEGIN;

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS provider_order_id TEXT NULL;

COMMENT ON COLUMN public.bills.provider_order_id IS
  'Razorpay order_* id for online booking bills. One bill per checkout order.';

-- Backfill order id from linked booking notes.
UPDATE public.bills b
   SET provider_order_id = src.provider_order_id
  FROM (
    SELECT DISTINCT ON (bi.bill_id)
      bi.bill_id,
      substring(bk.notes from 'Razorpay Order: (order_[A-Za-z0-9]+)') AS provider_order_id
    FROM public.bill_items bi
    JOIN public.bookings bk ON bk.id = bi.item_id
    WHERE bi.item_type = 'session'
      AND bk.notes LIKE 'Razorpay Order: order_%'
  ) src
 WHERE b.id = src.bill_id
   AND b.payment_method = 'razorpay'
   AND src.provider_order_id IS NOT NULL
   AND b.provider_order_id IS DISTINCT FROM src.provider_order_id;

-- Cancel duplicate live bookings for the same slot (keep earliest).
WITH ranked_bookings AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY location_id, station_id, booking_date, start_time, customer_id
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.bookings
  WHERE payment_mode = 'razorpay'
    AND status IN ('confirmed', 'in-progress')
)
UPDATE public.bookings b
   SET status = 'cancelled',
       notes  = COALESCE(b.notes, '') || ' [auto-cancelled duplicate slot]'
  FROM ranked_bookings r
 WHERE b.id = r.id
   AND r.rn > 1;

-- Fingerprint each Razorpay bill by customer + date + total + slot set.
CREATE TEMP TABLE tmp_bill_checkout_rank ON COMMIT DROP AS
WITH bill_slots AS (
  SELECT
    b.id AS bill_id,
    b.created_at,
    b.total AS bill_total,
    b.customer_id,
    min(bk.booking_date) AS booking_date,
    string_agg(
      bk.station_id::text || '@' || bk.start_time::text,
      ','
      ORDER BY bk.station_id, bk.start_time
    ) AS slot_signature
  FROM public.bills b
  JOIN public.bill_items bi
    ON bi.bill_id = b.id
   AND bi.item_type = 'session'
  JOIN public.bookings bk
    ON bk.id = bi.item_id
  WHERE b.payment_method = 'razorpay'
    AND bk.status IN ('confirmed', 'in-progress', 'cancelled')
  GROUP BY b.id, b.created_at, b.total, b.customer_id
),
ranked AS (
  SELECT
    bill_id,
    created_at,
    bill_total,
    customer_id,
    booking_date,
    slot_signature,
    row_number() OVER (
      PARTITION BY customer_id, booking_date, bill_total, slot_signature
      ORDER BY created_at ASC NULLS LAST, bill_id ASC
    ) AS checkout_rn
  FROM bill_slots
),
order_rank AS (
  SELECT
    b.id AS bill_id,
    b.created_at,
    b.total AS bill_total,
    b.customer_id,
    b.provider_order_id,
    row_number() OVER (
      PARTITION BY b.provider_order_id
      ORDER BY b.created_at ASC NULLS LAST, b.id ASC
    ) AS order_rn
  FROM public.bills b
  WHERE b.payment_method = 'razorpay'
    AND b.provider_order_id IS NOT NULL
)
SELECT
  bs.bill_id,
  bs.created_at,
  bs.bill_total,
  bs.customer_id,
  bs.booking_date,
  bs.slot_signature,
  bs.checkout_rn,
  COALESCE(orank.order_rn, 1) AS order_rn,
  CASE
    WHEN COALESCE(orank.order_rn, 1) > 1 THEN true
    WHEN bs.checkout_rn > 1 THEN true
    ELSE false
  END AS is_duplicate
FROM ranked bs
LEFT JOIN order_rank orank ON orank.bill_id = bs.bill_id;

UPDATE public.customers c
   SET total_spent = GREATEST(
         0,
         COALESCE(c.total_spent, 0) - dup.duplicate_total
       )
  FROM (
    SELECT customer_id, SUM(bill_total) AS duplicate_total
      FROM tmp_bill_checkout_rank
     WHERE is_duplicate
     GROUP BY customer_id
  ) dup
 WHERE c.id = dup.customer_id;

UPDATE public.payment_orders po
   SET materialized_bill_id = keeper.bill_id
  FROM tmp_bill_checkout_rank keeper
  JOIN tmp_bill_checkout_rank duplicate
    ON duplicate.is_duplicate
   AND duplicate.customer_id = keeper.customer_id
   AND duplicate.booking_date = keeper.booking_date
   AND duplicate.slot_signature = keeper.slot_signature
   AND duplicate.bill_total = keeper.bill_total
   AND NOT keeper.is_duplicate
 WHERE po.provider = 'razorpay'
   AND po.materialized_bill_id = duplicate.bill_id;

DELETE FROM public.bill_items bi
 USING tmp_bill_checkout_rank r
 WHERE bi.bill_id = r.bill_id
   AND r.is_duplicate;

DELETE FROM public.bills b
 USING tmp_bill_checkout_rank r
 WHERE b.id = r.bill_id
   AND r.is_duplicate;

-- Backfill surviving bills again after cleanup.
UPDATE public.bills b
   SET provider_payment_id = COALESCE(b.provider_payment_id, bk.payment_txn_id),
       provider_order_id   = COALESCE(
         b.provider_order_id,
         substring(bk.notes from 'Razorpay Order: (order_[A-Za-z0-9]+)')
       )
  FROM public.bill_items bi
  JOIN public.bookings bk ON bk.id = bi.item_id
 WHERE b.id = bi.bill_id
   AND bi.item_type = 'session'
   AND b.payment_method = 'razorpay'
   AND bk.payment_mode = 'razorpay';

DO $$
DECLARE
  order_dup_count int;
BEGIN
  SELECT count(*) INTO order_dup_count FROM (
    SELECT provider_order_id
      FROM public.bills
     WHERE payment_method = 'razorpay'
       AND provider_order_id IS NOT NULL
     GROUP BY provider_order_id
    HAVING count(*) > 1
  ) t;

  IF order_dup_count = 0 THEN
    EXECUTE $idx$
      CREATE UNIQUE INDEX IF NOT EXISTS bills_razorpay_order_unique_idx
        ON public.bills (provider_order_id)
        WHERE payment_method = 'razorpay'
          AND provider_order_id IS NOT NULL
    $idx$;
  ELSE
    RAISE WARNING
      'bills_razorpay_order_unique_idx skipped: % duplicate provider_order_id groups remain.',
      order_dup_count;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bills_provider_order_id
  ON public.bills (provider_order_id)
  WHERE provider_order_id IS NOT NULL;

COMMIT;
