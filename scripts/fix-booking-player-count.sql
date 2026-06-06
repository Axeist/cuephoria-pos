-- Fix Pulkit (and similar) venue bookings: pay-at-venue path omitted player_count.
-- Adjust customer name / date / station as needed before running.

-- Preview rows that likely should be multi-player (PS5 per-player pricing, default player_count=1):
-- SELECT b.id, c.name, s.name AS station, b.booking_date, b.start_time, b.final_price, b.player_count
-- FROM public.bookings b
-- JOIN public.customers c ON c.id = b.customer_id
-- JOIN public.stations s ON s.id = b.station_id
-- WHERE c.name ILIKE '%Pulkit%'
--   AND b.booking_date >= CURRENT_DATE
-- ORDER BY b.created_at DESC;

-- Example: set correct player count for a specific booking (replace id and count):
-- UPDATE public.bookings SET player_count = 2 WHERE id = '5cc9c399-....';
