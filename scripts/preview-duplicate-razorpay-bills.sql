-- Preview duplicate Razorpay bills before/after running dedupe migration.
-- True duplicates share the same bookings.payment_txn_id (same pay_* id).
-- Separate payments for different slots (e.g. Controller 1 vs Controller 2)
-- will have different payment_txn_id values and are NOT duplicates.

-- 1) Duplicate bills grouped by Razorpay payment id
WITH bill_per_payment AS (
  SELECT DISTINCT
    bk.payment_txn_id,
    b.id         AS bill_id,
    b.created_at,
    b.total,
    c.name       AS customer_name,
    c.phone      AS customer_phone
  FROM public.bills b
  JOIN public.bill_items bi
    ON bi.bill_id = b.id
   AND bi.item_type = 'session'
  JOIN public.bookings bk
    ON bk.id = bi.item_id
  JOIN public.customers c
    ON c.id = b.customer_id
  WHERE b.payment_method = 'razorpay'
    AND bk.payment_txn_id IS NOT NULL
)
SELECT
  payment_txn_id,
  count(*) AS bill_count,
  array_agg(bill_id ORDER BY created_at, bill_id) AS bill_ids,
  min(created_at) AS first_bill_at,
  max(created_at) AS last_bill_at,
  min(customer_name) AS customer_name,
  min(customer_phone) AS customer_phone,
  sum(total) AS combined_total
FROM bill_per_payment
GROUP BY payment_txn_id
HAVING count(*) > 1
ORDER BY max(created_at) DESC;

-- 2) Detail rows for each duplicate bill (which one would be kept vs deleted)
WITH bill_payments AS (
  SELECT
    b.id AS bill_id,
    b.created_at,
    b.total,
    c.name AS customer_name,
    c.phone AS customer_phone,
    bk.payment_txn_id,
    string_agg(bi.name, '; ' ORDER BY bi.name) AS line_items
  FROM public.bills b
  JOIN public.bill_items bi
    ON bi.bill_id = b.id
   AND bi.item_type = 'session'
  JOIN public.bookings bk
    ON bk.id = bi.item_id
  JOIN public.customers c
    ON c.id = b.customer_id
  WHERE b.payment_method = 'razorpay'
    AND bk.payment_txn_id IS NOT NULL
  GROUP BY b.id, b.created_at, b.total, c.name, c.phone, bk.payment_txn_id
),
ranked AS (
  SELECT
    *,
    row_number() OVER (
      PARTITION BY payment_txn_id
      ORDER BY created_at ASC, bill_id ASC
    ) AS rn
  FROM bill_payments
)
SELECT
  payment_txn_id,
  bill_id,
  created_at,
  total,
  customer_name,
  customer_phone,
  line_items,
  CASE WHEN rn = 1 THEN 'KEEP' ELSE 'DELETE (duplicate)' END AS dedupe_action
FROM ranked
WHERE payment_txn_id IN (
  SELECT payment_txn_id
  FROM ranked
  GROUP BY payment_txn_id
  HAVING count(*) > 1
)
ORDER BY payment_txn_id, rn;
