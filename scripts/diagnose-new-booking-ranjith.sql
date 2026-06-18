-- ============================================================================
-- Diagnostic: locate the "Ranjith Kumar S ₹1 Razorpay" transaction's booking
-- and verify why it is not appearing in the Bookings list.
-- ============================================================================

WITH

-- 1) Find the bill (Ranjith, ₹1, razorpay, created today-ish).
target_bill AS (
  SELECT bl.*
  FROM public.bills bl
  JOIN public.customers c ON c.id = bl.customer_id
  WHERE bl.payment_method = 'razorpay'
    AND bl.total <= 5
    AND c.name ILIKE '%ranjith%kumar%'
    AND bl.created_at >= (now() - interval '2 days')
  ORDER BY bl.created_at DESC
  LIMIT 1
),

-- 2) All bill_items for that bill -> gives us booking ids.
bill_items_for_target AS (
  SELECT
    'B_bill_items' AS section,
    bi.bill_id::text        AS ref_id,
    bi.item_id::text        AS booking_id,
    bi.item_type            AS item_type,
    bi.name                 AS name,
    bi.price::text          AS price,
    (SELECT created_at::text FROM target_bill) AS created_at,
    NULL::text              AS location_id,
    NULL::text              AS status,
    NULL::text              AS booking_date,
    NULL::text              AS payment_mode,
    NULL::text              AS payment_txn_id
  FROM public.bill_items bi
  WHERE bi.bill_id = (SELECT id FROM target_bill)
),

-- 3) The bill itself.
bill_row AS (
  SELECT
    'A_bill' AS section,
    bl.id::text               AS ref_id,
    bl.customer_id::text      AS booking_id,
    bl.payment_method         AS item_type,
    bl.status                 AS name,
    bl.total::text            AS price,
    bl.created_at::text       AS created_at,
    bl.location_id::text      AS location_id,
    bl.status                 AS status,
    NULL::text                AS booking_date,
    NULL::text                AS payment_mode,
    NULL::text                AS payment_txn_id
  FROM target_bill bl
),

-- 4) The booking rows referenced by those bill_items.
matched_bookings AS (
  SELECT
    'C_booking' AS section,
    b.id::text               AS ref_id,
    b.id::text               AS booking_id,
    'booking'                AS item_type,
    s.name                   AS name,
    b.final_price::text      AS price,
    b.created_at::text       AS created_at,
    b.location_id::text      AS location_id,
    b.status                 AS status,
    b.booking_date::text     AS booking_date,
    b.payment_mode           AS payment_mode,
    b.payment_txn_id         AS payment_txn_id
  FROM public.bookings b
  LEFT JOIN public.stations s ON s.id = b.station_id
  WHERE b.id IN (
    SELECT item_id FROM public.bill_items
    WHERE bill_id = (SELECT id FROM target_bill)
  )
),

-- 5) Locations overview to understand branch scoping.
locations_summary AS (
  SELECT
    'D_location' AS section,
    l.id::text              AS ref_id,
    NULL::text              AS booking_id,
    l.slug                  AS item_type,
    l.name                  AS name,
    NULL::text              AS price,
    l.created_at::text      AS created_at,
    l.id::text              AS location_id,
    NULL::text              AS status,
    NULL::text              AS booking_date,
    NULL::text              AS payment_mode,
    NULL::text              AS payment_txn_id
  FROM public.locations l
)

SELECT * FROM bill_row
UNION ALL
SELECT * FROM bill_items_for_target
UNION ALL
SELECT * FROM matched_bookings
UNION ALL
SELECT * FROM locations_summary
ORDER BY section;
