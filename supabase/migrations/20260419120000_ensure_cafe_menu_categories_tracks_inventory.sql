-- Ensure inventory column exists (some environments skipped 20260416210000 or schema cache was stale).

ALTER TABLE public.cafe_menu_categories
  ADD COLUMN IF NOT EXISTS tracks_inventory BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.cafe_menu_categories.tracks_inventory IS
  'When true, menu items in this category use stock_quantity and inventory movements.';
