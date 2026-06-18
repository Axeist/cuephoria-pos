-- Preview duplicate Razorpay bills before/after running dedupe migration.
-- True duplicates share the same bookings.payment_txn_id (same pay_* id).
-- Checkout duplicates share the same customer + date + total + slot set even when
-- payment ids differ (e.g. two ₹300 bills for one 2-controller booking).
-- Separate payments for different slots will have different slot_signature values.

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

-- 2) Duplicate checkout bills (same customer + date + total + slots)
WITH bill_slots AS (
  SELECT
    b.id AS bill_id,
    b.created_at,
    b.total AS bill_total,
    b.customer_id,
    c.name AS customer_name,
    c.phone AS customer_phone,
    min(bk.booking_date) AS booking_date,
    string_agg(
      bk.station_id::text || '@' || bk.start_time::text,
      ','
      ORDER BY bk.station_id, bk.start_time
    ) AS slot_signature,
    string_agg(DISTINCT bi.name, '; ' ORDER BY bi.name) AS line_items
  FROM public.bills b
  JOIN public.bill_items bi
    ON bi.bill_id = b.id
   AND bi.item_type = 'session'
  JOIN public.bookings bk
    ON bk.id = bi.item_id
  JOIN public.customers c
    ON c.id = b.customer_id
  WHERE b.payment_method = 'razorpay'
  GROUP BY b.id, b.created_at, b.total, b.customer_id, c.name, c.phone
),
ranked AS (
  SELECT
    *,
    row_number() OVER (
      PARTITION BY customer_id, booking_date, bill_total, slot_signature
      ORDER BY created_at ASC, bill_id ASC
    ) AS rn,
    count(*) OVER (
      PARTITION BY customer_id, booking_date, bill_total, slot_signature
    ) AS group_size
  FROM bill_slots
)
SELECT
  customer_name,
  customer_phone,
  booking_date,
  bill_total,
  bill_id,
  created_at,
  line_items,
  slot_signature,
  CASE WHEN rn = 1 THEN 'KEEP' ELSE 'DELETE (duplicate checkout)' END AS dedupe_action
FROM ranked
WHERE group_size > 1
ORDER BY customer_name, booking_date, bill_total, rn;

-- 3) Detail rows for payment-id duplicates
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
