-- ============================================================================
-- Diagnostic: figure out what the DB actually knows about Razorpay payment
-- pay_5h3LuEBYoZAmc4 / confirmation code 5A530C28.
--
-- Run in Supabase SQL Editor. Returns ONE result set with a `section` column
-- so you can see all diagnostics at once (the editor only shows the last
-- statement's output when multiple are run).
-- ============================================================================

WITH

-- 1) Exact match on payment id (as stored by PublicPaymentSuccess / webhook).
exact_match AS (
  SELECT
    '1_exact_payment_txn_id' AS section,
    b.id::text               AS booking_id,
    b.payment_txn_id         AS payment_txn_id,
    b.payment_mode           AS payment_mode,
    b.booking_date::text     AS booking_date,
    b.start_time::text       AS start_time,
    b.end_time::text         AS end_time,
    b.status                 AS status,
    b.final_price            AS final_price,
    b.customer_id::text      AS customer_id,
    b.location_id::text      AS location_id,
    b.notes                  AS notes,
    b.created_at::text       AS created_at
  FROM public.bookings b
  WHERE b.payment_txn_id = 'pay_5h3LuEBYoZAmc4'
),

-- 2) Case/whitespace-insensitive match on the payment id.
fuzzy_match AS (
  SELECT
    '2_fuzzy_payment_txn_id' AS section,
    b.id::text,
    b.payment_txn_id,
    b.payment_mode,
    b.booking_date::text,
    b.start_time::text,
    b.end_time::text,
    b.status,
    b.final_price,
    b.customer_id::text,
    b.location_id::text,
    b.notes,
    b.created_at::text
  FROM public.bookings b
  WHERE b.payment_txn_id ILIKE '%5h3luebyozamc%'
),

-- 3) Confirmation code 5A530C28 (first 8 chars of booking.id, uppercased).
confirmation_code AS (
  SELECT
    '3_confirmation_code_5A530C28' AS section,
    b.id::text,
    b.payment_txn_id,
    b.payment_mode,
    b.booking_date::text,
    b.start_time::text,
    b.end_time::text,
    b.status,
    b.final_price,
    b.customer_id::text,
    b.location_id::text,
    b.notes,
    b.created_at::text
  FROM public.bookings b
  WHERE upper(left(b.id::text, 8)) = '5A530C28'
),

-- 4) Any booking on 2026-04-24 at 11:xx, regardless of payment_txn_id.
same_slot AS (
  SELECT
    '4_same_slot_any_booking' AS section,
    b.id::text,
    b.payment_txn_id,
    b.payment_mode,
    b.booking_date::text,
    b.start_time::text,
    b.end_time::text,
    b.status,
    b.final_price,
    b.customer_id::text,
    b.location_id::text,
    b.notes,
    b.created_at::text
  FROM public.bookings b
  WHERE b.booking_date = DATE '2026-04-24'
    AND b.start_time::text LIKE '11:%'
),

-- 5) Webhook events referencing this payment id.
webhook_events AS (
  SELECT
    '5_webhook_event' AS section,
    event_id          AS booking_id,
    NULL::text        AS payment_txn_id,
    event_type        AS payment_mode,
    received_at::text AS booking_date,
    NULL::text        AS start_time,
    NULL::text        AS end_time,
    (payload::jsonb #>> '{payload,payment,entity,status}') AS status,
    NULL::numeric     AS final_price,
    NULL::text        AS customer_id,
    NULL::text        AS location_id,
    (payload::jsonb #>> '{payload,payment,entity,id}') AS notes,
    received_at::text AS created_at
  FROM public.payment_webhook_events
  WHERE payload::text ILIKE '%pay_5h3LuEBYoZAmc4%'
),

-- 6) Any ₹1-ish Razorpay bill in the recent window (the test amount).
recent_one_rupee AS (
  SELECT
    '6_recent_razorpay_near_1rupee' AS section,
    bl.id::text          AS booking_id,
    bl.payment_method    AS payment_txn_id,
    bl.status            AS payment_mode,
    NULL::text           AS booking_date,
    NULL::text           AS start_time,
    NULL::text           AS end_time,
    bl.status            AS status,
    bl.total             AS final_price,
    bl.customer_id::text AS customer_id,
    bl.location_id::text AS location_id,
    NULL::text           AS notes,
    bl.created_at::text  AS created_at
  FROM public.bills bl
  WHERE bl.payment_method = 'razorpay'
    AND bl.total <= 5
    AND bl.created_at >= (now() - interval '7 days')
)

SELECT * FROM exact_match
UNION ALL
SELECT * FROM fuzzy_match
UNION ALL
SELECT * FROM confirmation_code
UNION ALL
SELECT * FROM same_slot
UNION ALL
SELECT * FROM webhook_events
UNION ALL
SELECT * FROM recent_one_rupee
ORDER BY section, created_at DESC NULLS LAST;
