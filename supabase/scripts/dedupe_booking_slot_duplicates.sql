-- Ops: find and resolve duplicate live bookings for the same
-- (location_id, station_id, booking_date, start_time).
-- Run in Supabase SQL editor after review. Refund or rebook customers per venue policy
-- for rows you cancel (rn > 1).
--
-- 1) Inspect duplicates (read-only)
WITH dupes AS (
  SELECT id,
         location_id,
         station_id,
         booking_date,
         start_time,
         end_time,
         customer_id,
         status,
         payment_txn_id,
         notes,
         created_at,
         row_number() OVER (
           PARTITION BY location_id, station_id, booking_date, start_time
           ORDER BY created_at ASC NULLS LAST, id ASC
         ) AS rn
    FROM public.bookings
   WHERE status IN ('confirmed', 'in-progress')
)
SELECT * FROM dupes WHERE rn > 1 ORDER BY booking_date, start_time, rn;
--
-- 2) Cancel extras (keeps oldest row per partition). Uncomment to execute.

/*
WITH dupes AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY location_id, station_id, booking_date, start_time
           ORDER BY created_at ASC NULLS LAST, id ASC
         ) AS rn
    FROM public.bookings
   WHERE status IN ('confirmed', 'in-progress')
)
UPDATE public.bookings b
   SET status = 'cancelled',
       notes = COALESCE(b.notes, '') || ' [auto-cancelled duplicate slot]'
  FROM dupes d
 WHERE b.id = d.id
   AND d.rn > 1;
*/

-- 3) After duplicates are gone, deploy migration 20260606140000_retry_bookings_no_double_book_idx.sql
--    (or run CREATE UNIQUE INDEX from that file’s EXECUTE block) so Postgres enforces uniqueness.
