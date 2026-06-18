
-- This migration file has been kept for documentation purposes,
-- but we've decided not to use extended staff fields in the application.

-- If you need to add these fields in the future, you can uncomment the SQL below:

/*
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS salary NUMERIC,
ADD COLUMN IF NOT EXISTS joining_date DATE,
ADD COLUMN IF NOT EXISTS shift_start TIME,
ADD COLUMN IF NOT EXISTS shift_end TIME;
*/

