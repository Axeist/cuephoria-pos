-- Cleanup script to delete test bookings for TODAY
-- KEEPS bookings for: 7708408343, 7355401166, 8754286750, 8189999998
-- DELETES other bookings for today

-- STEP 1: First, review what will be deleted (RUN THIS FIRST TO VERIFY)
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
WHERE b.booking_date = CURRENT_DATE
  AND b.status IN ('confirmed', 'in-progress')
  AND c.phone NOT IN ('7708408343', '7355401166', '8754286750', '8189999998')
ORDER BY b.created_at DESC;

-- STEP 2: Delete the test bookings
-- This will DELETE bookings for today EXCEPT the protected phone numbers
-- Run this query to delete:
DELETE FROM bookings
WHERE id IN (
  SELECT b.id
  FROM bookings b
  JOIN customers c ON b.customer_id = c.id
  WHERE b.booking_date = CURRENT_DATE
    AND b.status IN ('confirmed', 'in-progress')
    AND c.phone NOT IN ('7708408343', '7355401166', '8754286750', '8189999998')
);

-- STEP 3: Verify protected bookings are still there
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
WHERE b.booking_date = CURRENT_DATE
  AND b.status IN ('confirmed', 'in-progress')
  AND c.phone IN ('7708408343', '7355401166', '8754286750', '8189999998')
ORDER BY b.start_time;

