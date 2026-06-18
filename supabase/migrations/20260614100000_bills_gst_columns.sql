-- Add GST tracking columns to bills for receipts and filing exports.
-- Rollback:
--   ALTER TABLE public.bills
--     DROP COLUMN IF EXISTS taxable_amount,
--     DROP COLUMN IF EXISTS tax_amount,
--     DROP COLUMN IF EXISTS tax_rate,
--     DROP COLUMN IF EXISTS gstin_snapshot;

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS taxable_amount numeric,
  ADD COLUMN IF NOT EXISTS tax_amount numeric,
  ADD COLUMN IF NOT EXISTS tax_rate numeric,
  ADD COLUMN IF NOT EXISTS gstin_snapshot text;

COMMENT ON COLUMN public.bills.taxable_amount IS 'Pre-tax value after discount and loyalty redemption.';
COMMENT ON COLUMN public.bills.tax_amount IS 'GST amount collected on this bill.';
COMMENT ON COLUMN public.bills.tax_rate IS 'GST rate (%) snapshot at time of sale.';
COMMENT ON COLUMN public.bills.gstin_snapshot IS 'GSTIN from branch settings at time of sale.';
