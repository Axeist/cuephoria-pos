-- Check for test bookings that might be blocking slots
-- Run this in your Supabase SQL editor to see what bookings exist

-- View all confirmed bookings with customer info
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status,
  b.payment_mode,
  b.created_at,
  c.name as customer_name,
  c.phone as customer_phone
FROM bookings b
JOIN customers c ON b.customer_id = c.id
WHERE b.status IN ('confirmed', 'in-progress')
ORDER BY b.booking_date DESC, b.start_time DESC
LIMIT 50;

-- Count bookings by status
SELECT 
  status,
  COUNT(*) as count
FROM bookings
GROUP BY status;

-- Check for bookings created today (likely test bookings)
SELECT 
  id,
  booking_date,
  start_time,
  end_time,
  status,
  customer_id,
  station_id,
  created_at
FROM bookings
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- Check for bookings with "venue" payment mode (AI/webhook bookings default to this)
-- This helps identify webhook-created bookings
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status,
  b.payment_mode,
  b.created_at,
  c.name as customer_name,
  c.phone as customer_phone
FROM bookings b
JOIN customers c ON b.customer_id = c.id
WHERE b.payment_mode = 'venue'
  AND b.status IN ('confirmed', 'in-progress')
ORDER BY b.booking_date DESC, b.start_time DESC;

-- Check for potential test bookings (by name or phone patterns)
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status,
  b.payment_mode,
  b.created_at,
  c.name as customer_name,
  c.phone as customer_phone
FROM bookings b
JOIN customers c ON b.customer_id = c.id
WHERE b.status IN ('confirmed', 'in-progress')
  AND (
    LOWER(c.name) LIKE '%test%'
    OR c.phone IN ('8667637565', '9876543210')  -- Add your test phone numbers here
  )
ORDER BY b.created_at DESC;

