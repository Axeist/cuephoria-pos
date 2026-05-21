-- Prevent duplicate Razorpay bills for the same payment and stop auto-recreation
-- after an admin deliberately deletes a bill.

-- 1) Link each Razorpay bill to its payment id (one bill per payment).
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS provider_payment_id TEXT NULL;

COMMENT ON COLUMN public.bills.provider_payment_id IS
  'Razorpay pay_* id for online booking bills. Enforces one bill per captured payment.';

-- Backfill from bookings linked via bill_items (keep earliest bill per payment).
WITH bill_payment AS (
  SELECT
    bi.bill_id,
    bk.payment_txn_id AS provider_payment_id,
    row_number() OVER (
      PARTITION BY bk.payment_txn_id
      ORDER BY b.created_at ASC NULLS LAST, b.id ASC
    ) AS rn
  FROM public.bill_items bi
  JOIN public.bookings bk ON bk.id = bi.item_id
  JOIN public.bills b ON b.id = bi.bill_id
  WHERE bi.item_type = 'session'
    AND bk.payment_txn_id IS NOT NULL
    AND b.payment_method = 'razorpay'
    AND b.provider_payment_id IS NULL
)
UPDATE public.bills b
   SET provider_payment_id = bp.provider_payment_id
  FROM bill_payment bp
 WHERE b.id = bp.bill_id
   AND bp.rn = 1;

-- 2) One session booking can only appear on one bill.
DO $$
DECLARE
  dup_count int;
BEGIN
  SELECT count(*) INTO dup_count FROM (
    SELECT item_id
      FROM public.bill_items
     WHERE item_type = 'session'
     GROUP BY item_id
    HAVING count(*) > 1
  ) t;

  IF dup_count > 0 THEN
    RAISE WARNING
      'bill_items_session_item_unique_idx skipped: % duplicate session item_id groups detected.',
      dup_count;
  ELSE
    EXECUTE $idx$
      CREATE UNIQUE INDEX IF NOT EXISTS bill_items_session_item_unique_idx
        ON public.bill_items (item_id)
        WHERE item_type = 'session'
    $idx$;
  END IF;
END $$;

-- 3) One Razorpay bill per payment id.
DO $$
DECLARE
  dup_count int;
BEGIN
  SELECT count(*) INTO dup_count FROM (
    SELECT provider_payment_id
      FROM public.bills
     WHERE payment_method = 'razorpay'
       AND provider_payment_id IS NOT NULL
     GROUP BY provider_payment_id
    HAVING count(*) > 1
  ) t;

  IF dup_count > 0 THEN
    RAISE WARNING
      'bills_razorpay_payment_unique_idx skipped: % duplicate provider_payment_id groups detected.',
      dup_count;
  ELSE
    EXECUTE $idx$
      CREATE UNIQUE INDEX IF NOT EXISTS bills_razorpay_payment_unique_idx
        ON public.bills (provider_payment_id)
        WHERE payment_method = 'razorpay'
          AND provider_payment_id IS NOT NULL
    $idx$;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bills_provider_payment_id
  ON public.bills (provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- 4) When an admin deletes a Razorpay bill, set this so materializers do not recreate it.
ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS bill_suppressed_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.payment_orders.bill_suppressed_at IS
  'Set when staff delete the materialized Razorpay bill; blocks automatic bill recreation.';
