-- Cleanup script to remove ONLY test bookings from webhook testing
-- WARNING: Review bookings first using check-test-bookings.sql
-- This script is designed to ONLY target test bookings, NOT real customer bookings

-- STEP 1: First, identify test bookings by checking for:
-- - Test customer names (like "Test", "Ranjit" from testing, etc.)
-- - Test phone numbers used during webhook testing
-- - Bookings created via webhook (payment_mode = 'venue' AND specific time range)

-- View test bookings before deleting (REVIEW THIS FIRST):
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
  AND b.payment_mode = 'venue'
  AND (
    -- Test customer names (add more if needed)
    LOWER(c.name) LIKE '%test%' 
    OR LOWER(c.name) LIKE '%ranjit%'  -- Only if this was a test booking
    OR c.phone IN ('8667637565', '9876543210')  -- Test phone numbers from webhook testing
    -- Add more test phone numbers here if you used others
  )
ORDER BY b.created_at DESC;

-- STEP 2: Cancel test bookings (SAFER - doesn't delete, just marks as cancelled)
-- Only run this after reviewing the query above and confirming these are test bookings
-- Replace the phone numbers and names with your actual test data:
/*
UPDATE bookings
SET status = 'cancelled',
    status_updated_at = NOW()
WHERE id IN (
  SELECT b.id
  FROM bookings b
  JOIN customers c ON b.customer_id = c.id
  WHERE b.status IN ('confirmed', 'in-progress')
    AND b.payment_mode = 'venue'
    AND (
      LOWER(c.name) LIKE '%test%'
      OR c.phone IN ('8667637565', '9876543210')  -- Your test phone numbers
    )
);
*/

-- STEP 3: If you want to delete instead of cancel (more permanent):
-- Only use this if you're 100% sure these are test bookings
-- Replace phone numbers with your actual test numbers:
/*
DELETE FROM bookings
WHERE id IN (
  SELECT b.id
  FROM bookings b
  JOIN customers c ON b.customer_id = c.id
  WHERE b.status IN ('confirmed', 'in-progress')
    AND b.payment_mode = 'venue'
    AND (
      LOWER(c.name) LIKE '%test%'
      OR c.phone IN ('8667637565', '9876543210')  -- Your test phone numbers
    )
);
*/

-- STEP 4: Alternative - Cancel bookings created in a specific time window (if you know when you tested)
-- This targets bookings created during your testing session:
/*
UPDATE bookings
SET status = 'cancelled',
    status_updated_at = NOW()
WHERE status IN ('confirmed', 'in-progress')
  AND payment_mode = 'venue'
  AND created_at >= '2024-11-13 09:00:00'  -- Adjust to your testing time
  AND created_at <= '2024-11-13 10:00:00'  -- Adjust to your testing time
  AND booking_date >= '2024-11-14';  -- Future dates that were test bookings
*/

