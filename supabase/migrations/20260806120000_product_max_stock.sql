-- Shelf / storage capacity cap per product (nullable = no cap for legacy rows).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS max_stock INTEGER;

COMMENT ON COLUMN public.products.max_stock IS
  'Maximum on-hand stock capacity. Restock and initial stock must not exceed this when set.';

-- Existing rows: treat current stock as the cap so behavior stays consistent until edited.
UPDATE public.products
SET max_stock = stock
WHERE max_stock IS NULL
  AND category <> 'membership';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_max_stock_non_negative;

ALTER TABLE public.products
  ADD CONSTRAINT products_max_stock_non_negative
  CHECK (max_stock IS NULL OR max_stock >= 0);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_stock_within_max;

ALTER TABLE public.products
  ADD CONSTRAINT products_stock_within_max
  CHECK (max_stock IS NULL OR stock <= max_stock);
