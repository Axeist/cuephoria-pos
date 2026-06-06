-- Product category accent colors + quick shop visibility
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS accent_color TEXT,
  ADD COLUMN IF NOT EXISTS quick_shop_enabled BOOLEAN NOT NULL DEFAULT true;

-- Optional per-station color tint override
ALTER TABLE public.stations
  ADD COLUMN IF NOT EXISTS accent_color TEXT;

COMMENT ON COLUMN public.categories.accent_color IS 'Hex accent for product cards and quick shop (e.g. #F97316)';
COMMENT ON COLUMN public.categories.quick_shop_enabled IS 'When false, category is hidden from station quick shop';
COMMENT ON COLUMN public.stations.accent_color IS 'Optional hex tint override for station card theme';
