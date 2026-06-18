-- Remove existing duplicate Razorpay bills (same pay_* payment id) so the unique
-- indexes from 20260622100000 can be applied and the Bills UI stops showing
-- repeated rows for one payment.
--
-- Keeps the earliest bill per payment_txn_id. Deletes later duplicates and
-- reverses their total from customers.total_spent.
--
-- Safe to re-run: only deletes bills where rn > 1 within a payment group.

BEGIN;

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS provider_payment_id TEXT NULL;

CREATE TEMP TABLE tmp_razorpay_bill_rank ON COMMIT DROP AS
WITH bill_payments AS (
  SELECT DISTINCT
    b.id         AS bill_id,
    b.created_at AS bill_created_at,
    b.total      AS bill_total,
    b.customer_id,
    bk.payment_txn_id
  FROM public.bills b
  JOIN public.bill_items bi
    ON bi.bill_id = b.id
   AND bi.item_type = 'session'
  JOIN public.bookings bk
    ON bk.id = bi.item_id
  WHERE b.payment_method = 'razorpay'
    AND bk.payment_txn_id IS NOT NULL
),
ranked AS (
  SELECT
    bill_id,
    bill_created_at,
    bill_total,
    customer_id,
    payment_txn_id,
    row_number() OVER (
      PARTITION BY payment_txn_id
      ORDER BY bill_created_at ASC NULLS LAST, bill_id ASC
    ) AS rn
  FROM bill_payments
)
SELECT * FROM ranked;

UPDATE public.bills b
   SET provider_payment_id = r.payment_txn_id
  FROM tmp_razorpay_bill_rank r
 WHERE b.id = r.bill_id
   AND r.rn = 1
   AND b.payment_method = 'razorpay'
   AND b.provider_payment_id IS DISTINCT FROM r.payment_txn_id;

UPDATE public.customers c
   SET total_spent = GREATEST(
         0,
         COALESCE(c.total_spent, 0) - dup.duplicate_total
       )
  FROM (
    SELECT customer_id, SUM(bill_total) AS duplicate_total
      FROM tmp_razorpay_bill_rank
     WHERE rn > 1
     GROUP BY customer_id
  ) dup
 WHERE c.id = dup.customer_id;

UPDATE public.payment_orders po
   SET materialized_bill_id = keeper.bill_id,
       provider_payment_id  = keeper.payment_txn_id
  FROM tmp_razorpay_bill_rank keeper
  JOIN tmp_razorpay_bill_rank duplicate
    ON duplicate.payment_txn_id = keeper.payment_txn_id
   AND duplicate.rn > 1
 WHERE keeper.rn = 1
   AND po.provider = 'razorpay'
   AND (
     po.materialized_bill_id = duplicate.bill_id
     OR po.provider_payment_id = keeper.payment_txn_id
   );

DELETE FROM public.bill_items bi
 USING tmp_razorpay_bill_rank r
 WHERE bi.bill_id = r.bill_id
   AND r.rn > 1;

DELETE FROM public.bills b
 USING tmp_razorpay_bill_rank r
 WHERE b.id = r.bill_id
   AND r.rn > 1;

DO $$
DECLARE
  session_dup_count int;
  payment_dup_count int;
BEGIN
  SELECT count(*) INTO session_dup_count FROM (
    SELECT item_id
      FROM public.bill_items
     WHERE item_type = 'session'
     GROUP BY item_id
    HAVING count(*) > 1
  ) t;

  IF session_dup_count = 0 THEN
    EXECUTE $idx$
      CREATE UNIQUE INDEX IF NOT EXISTS bill_items_session_item_unique_idx
        ON public.bill_items (item_id)
        WHERE item_type = 'session'
    $idx$;
  ELSE
    RAISE WARNING
      'bill_items_session_item_unique_idx still skipped: % duplicate session item_id groups remain.',
      session_dup_count;
  END IF;

  SELECT count(*) INTO payment_dup_count FROM (
    SELECT provider_payment_id
      FROM public.bills
     WHERE payment_method = 'razorpay'
       AND provider_payment_id IS NOT NULL
     GROUP BY provider_payment_id
    HAVING count(*) > 1
  ) t;

  IF payment_dup_count = 0 THEN
    EXECUTE $idx$
      CREATE UNIQUE INDEX IF NOT EXISTS bills_razorpay_payment_unique_idx
        ON public.bills (provider_payment_id)
        WHERE payment_method = 'razorpay'
          AND provider_payment_id IS NOT NULL
    $idx$;
  ELSE
    RAISE WARNING
      'bills_razorpay_payment_unique_idx still skipped: % duplicate provider_payment_id groups remain.',
      payment_dup_count;
  END IF;
END $$;

COMMIT;
