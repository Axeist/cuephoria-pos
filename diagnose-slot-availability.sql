-- Diagnostic queries to find why all slots show as booked

-- 1. Check what date you're trying to book - see all bookings for next 7 days
SELECT 
  b.booking_date,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN b.status IN ('confirmed', 'in-progress') THEN 1 END) as active_bookings
FROM bookings b
WHERE b.booking_date >= CURRENT_DATE
  AND b.booking_date <= CURRENT_DATE + INTERVAL '7 days'
GROUP BY b.booking_date
ORDER BY b.booking_date;

-- 2. Check for bookings that might span entire day (blocking all slots)
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status,
  c.name as customer_name,
  c.phone as customer_phone,
  s.name as station_name,
  -- Calculate duration in hours
  CASE 
    WHEN b.end_time = '00:00:00' THEN 
      EXTRACT(EPOCH FROM ('24:00:00'::time - b.start_time)) / 3600
    ELSE 
      EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 3600
  END as duration_hours
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN stations s ON b.station_id = s.id
WHERE b.booking_date >= CURRENT_DATE
  AND b.status IN ('confirmed', 'in-progress')
  AND (
    -- Bookings that start at opening (11:00) and end at closing (00:00) - blocks entire day
    (b.start_time = '11:00:00' AND b.end_time = '00:00:00')
    OR
    -- Very long bookings (more than 8 hours)
    CASE 
      WHEN b.end_time = '00:00:00' THEN 
        EXTRACT(EPOCH FROM ('24:00:00'::time - b.start_time)) / 3600
      ELSE 
        EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 3600
    END > 8
  )
ORDER BY b.booking_date, b.start_time;

-- 3. Check active sessions (these block slots for today)
SELECT 
  s.id,
  s.station_id,
  st.name as station_name,
  s.start_time,
  s.end_time,
  DATE(s.start_time) as session_date
FROM sessions s
JOIN stations st ON s.station_id = st.id
WHERE s.end_time IS NULL
ORDER BY s.start_time DESC;

-- 4. Check bookings for a specific station on a specific date
-- Replace 'station-id-here' and '2024-11-13' with actual values
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status,
  c.name as customer_name,
  c.phone as customer_phone
FROM bookings b
JOIN customers c ON b.customer_id = c.id
WHERE b.station_id = 'station-id-here'  -- Replace with actual station ID
  AND b.booking_date = '2024-11-13'  -- Replace with date you're checking
  AND b.status IN ('confirmed', 'in-progress')
ORDER BY b.start_time;

-- 5. Quick check: Are there any confirmed/in-progress bookings at all?
SELECT 
  COUNT(*) as total_active_bookings,
  COUNT(DISTINCT booking_date) as dates_with_bookings,
  MIN(booking_date) as earliest_booking,
  MAX(booking_date) as latest_booking
FROM bookings
WHERE status IN ('confirmed', 'in-progress')
  AND booking_date >= CURRENT_DATE;

