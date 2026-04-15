-- Add stock_quantity column to cafe_menu_items if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cafe_menu_items'
      AND column_name = 'stock_quantity'
  ) THEN
    ALTER TABLE public.cafe_menu_items
      ADD COLUMN stock_quantity integer NOT NULL DEFAULT 0;
  END IF;
END $$;
