-- Cleanup past AI bookings (bookings with past dates)
-- Use with caution - review before deleting!

-- 1. First, see what will be deleted (REVIEW THIS FIRST!)
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status,
  b.created_at,
  c.name as customer_name,
  c.phone as customer_phone,
  s.name as station_name,
  b.final_price
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN stations s ON b.station_id = s.id
WHERE b.payment_mode = 'venue'
  AND b.booking_date < CURRENT_DATE
ORDER BY b.created_at DESC;

-- 2. Count how many will be deleted
SELECT 
  COUNT(*) as bookings_to_delete,
  COUNT(DISTINCT b.customer_id) as affected_customers,
  SUM(b.final_price) as total_revenue_affected
FROM bookings b
WHERE b.payment_mode = 'venue'
  AND b.booking_date < CURRENT_DATE;

-- 3. DELETE past AI bookings (UNCOMMENT TO EXECUTE)
-- WARNING: This will permanently delete past AI bookings!
-- Make sure you've reviewed query #1 first!

/*
DELETE FROM bookings
WHERE payment_mode = 'venue'
  AND booking_date < CURRENT_DATE;
*/

-- 4. Alternative: Cancel past bookings instead of deleting
-- This preserves the record but marks them as cancelled
UPDATE bookings
SET status = 'cancelled',
    notes = COALESCE(notes || '; ', '') || 'Auto-cancelled: Past date booking'
WHERE payment_mode = 'venue'
  AND booking_date < CURRENT_DATE
  AND status = 'confirmed';

-- 5. Check specific past bookings (like the 2024-11-09 ones)
SELECT 
  b.*,
  c.name as customer_name,
  c.phone as customer_phone,
  s.name as station_name
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN stations s ON b.station_id = s.id
WHERE b.booking_date = '2024-11-09'
  AND b.payment_mode = 'venue'
ORDER BY b.created_at DESC;

