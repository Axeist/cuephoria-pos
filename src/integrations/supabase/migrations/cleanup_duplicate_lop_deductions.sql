-- Cleanup script to remove duplicate LOP deductions
-- This removes duplicate LOP deductions for the same staff and date
-- Keeps only the most recent one (or the one marked by admin if exists)

-- First, identify duplicates
-- Then delete duplicates, keeping the one with the highest priority:
-- 1. Admin-marked (marked_by != 'system')
-- 2. Most recent created_at

DELETE FROM staff_deductions
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY staff_id, deduction_date, deduction_type 
        ORDER BY 
          CASE WHEN marked_by != 'system' THEN 0 ELSE 1 END,
          created_at DESC
      ) as rn
    FROM staff_deductions
    WHERE deduction_type = 'lop'
      AND month = 1  -- January
      AND year = 2026
  ) sub
  WHERE rn > 1
);

-- Note: Update the month and year above to match the period you want to clean up
-- Or remove the month/year filter to clean up all duplicates

