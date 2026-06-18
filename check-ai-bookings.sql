-- Check all bookings created by AI (ElevenLabs)
-- AI bookings are identified by payment_mode = 'venue' and typically have notes or specific patterns

-- 1. All AI bookings (venue payment mode)
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status,
  b.payment_mode,
  b.notes,
  b.created_at,
  c.name as customer_name,
  c.phone as customer_phone,
  s.name as station_name,
  s.type as station_type,
  b.final_price
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN stations s ON b.station_id = s.id
WHERE b.payment_mode = 'venue'
ORDER BY b.created_at DESC;

-- 2. Count AI bookings by date
SELECT 
  b.booking_date,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed,
  COUNT(CASE WHEN b.status = 'in-progress' THEN 1 END) as in_progress,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled,
  SUM(b.final_price) as total_revenue
FROM bookings b
WHERE b.payment_mode = 'venue'
GROUP BY b.booking_date
ORDER BY b.booking_date DESC;

-- 3. AI bookings for today
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status,
  c.name as customer_name,
  c.phone as customer_phone,
  s.name as station_name,
  b.final_price,
  b.created_at
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN stations s ON b.station_id = s.id
WHERE b.payment_mode = 'venue'
  AND b.booking_date = CURRENT_DATE
ORDER BY b.start_time;

-- 4. AI bookings for a specific date range (last 7 days)
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status,
  c.name as customer_name,
  c.phone as customer_phone,
  s.name as station_name,
  b.final_price,
  b.created_at
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN stations s ON b.station_id = s.id
WHERE b.payment_mode = 'venue'
  AND b.booking_date >= CURRENT_DATE - INTERVAL '7 days'
  AND b.booking_date <= CURRENT_DATE
ORDER BY b.booking_date DESC, b.start_time;

-- 5. AI bookings with potential issues (past dates, overlapping, etc.)
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status,
  CASE 
    WHEN b.booking_date < CURRENT_DATE THEN 'Past Date'
    WHEN b.booking_date = CURRENT_DATE AND b.start_time::time < CURRENT_TIME THEN 'Past Time Today'
    ELSE 'OK'
  END as issue_type,
  c.name as customer_name,
  c.phone as customer_phone,
  s.name as station_name,
  b.created_at
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN stations s ON b.station_id = s.id
WHERE b.payment_mode = 'venue'
  AND (
    b.booking_date < CURRENT_DATE 
    OR (b.booking_date = CURRENT_DATE AND b.start_time::time < CURRENT_TIME)
  )
ORDER BY b.booking_date DESC, b.start_time;

-- 6. Summary statistics for AI bookings
SELECT 
  COUNT(*) as total_ai_bookings,
  COUNT(DISTINCT b.customer_id) as unique_customers,
  COUNT(DISTINCT b.station_id) as unique_stations,
  SUM(b.final_price) as total_revenue,
  AVG(b.final_price) as avg_booking_price,
  MIN(b.booking_date) as earliest_booking,
  MAX(b.booking_date) as latest_booking,
  COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_count,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_count
FROM bookings b
WHERE b.payment_mode = 'venue';

-- 7. AI bookings by station
SELECT 
  s.name as station_name,
  s.type as station_type,
  COUNT(*) as booking_count,
  SUM(b.final_price) as total_revenue,
  COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed
FROM bookings b
JOIN stations s ON b.station_id = s.id
WHERE b.payment_mode = 'venue'
GROUP BY s.id, s.name, s.type
ORDER BY booking_count DESC;

-- 8. Recent AI bookings (last 24 hours)
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status,
  c.name as customer_name,
  c.phone as customer_phone,
  s.name as station_name,
  b.final_price,
  b.created_at,
  NOW() - b.created_at as time_since_creation
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN stations s ON b.station_id = s.id
WHERE b.payment_mode = 'venue'
  AND b.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY b.created_at DESC;

