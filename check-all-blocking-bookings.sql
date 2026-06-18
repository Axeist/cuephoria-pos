-- Check for ALL bookings that might be blocking slots
-- This will help identify what's causing all slots to show as booked

-- 1. Check bookings for today and future dates
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status,
  b.payment_mode,
  b.created_at,
  c.name as customer_name,
  c.phone as customer_phone,
  s.name as station_name
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN stations s ON b.station_id = s.id
WHERE b.booking_date >= CURRENT_DATE
  AND b.status IN ('confirmed', 'in-progress')
ORDER BY b.booking_date, b.start_time;

-- 2. Count bookings by date
SELECT 
  booking_date,
  status,
  COUNT(*) as booking_count
FROM bookings
WHERE booking_date >= CURRENT_DATE
  AND status IN ('confirmed', 'in-progress')
GROUP BY booking_date, status
ORDER BY booking_date;

-- 3. Check for bookings with unusual time ranges (might be blocking everything)
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status,
  c.name as customer_name,
  c.phone as customer_phone,
  s.name as station_name
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN stations s ON b.station_id = s.id
WHERE b.booking_date >= CURRENT_DATE
  AND b.status IN ('confirmed', 'in-progress')
  AND (
    -- Check for bookings that span entire day (11:00 to 00:00)
    (b.start_time = '11:00:00' AND b.end_time = '00:00:00')
    OR
    -- Check for very long bookings (more than 6 hours)
    EXTRACT(EPOCH FROM (CASE WHEN b.end_time = '00:00:00' THEN '24:00:00'::time - b.start_time ELSE b.end_time - b.start_time END)) / 3600 > 6
  )
ORDER BY b.booking_date, b.start_time;

-- 4. Check active sessions that might be blocking slots
SELECT 
  s.id,
  s.station_id,
  s.start_time,
  s.end_time,
  st.name as station_name
FROM sessions s
JOIN stations st ON s.station_id = st.id
WHERE s.end_time IS NULL
  AND DATE(s.start_time) >= CURRENT_DATE
ORDER BY s.start_time;

