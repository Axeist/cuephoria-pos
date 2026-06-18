-- Backfill bookings.player_count from payment_orders.booking_payload.stationPlayerCounts
-- for Razorpay checkouts where player count was captured but not persisted.

UPDATE public.bookings b
SET player_count = src.cnt
FROM (
  SELECT
    bk.id AS booking_id,
    GREATEST(
      1,
      COALESCE(
        NULLIF((po.booking_payload -> 'stationPlayerCounts' ->> bk.station_id::text)::int, 0),
        NULLIF((po.booking_payload -> 'spc' ->> bk.station_id::text)::int, 0),
        1
      )
    ) AS cnt
  FROM public.bookings bk
  INNER JOIN public.payment_orders po
    ON po.provider = 'razorpay'
   AND po.provider_payment_id = bk.payment_txn_id
  WHERE bk.payment_mode = 'razorpay'
    AND bk.payment_txn_id IS NOT NULL
    AND po.booking_payload IS NOT NULL
    AND (
      po.booking_payload ? 'stationPlayerCounts'
      OR po.booking_payload ? 'spc'
    )
) src
WHERE b.id = src.booking_id
  AND src.cnt > b.player_count;
