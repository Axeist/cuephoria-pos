-- Rich membership tier branding + POS compare pricing
ALTER TABLE public.membership_tiers
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tagline TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT 'violet',
  ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(12,2);

COMMENT ON COLUMN public.membership_tiers.description IS 'Member-facing benefits blurb; synced to POS product context';
COMMENT ON COLUMN public.membership_tiers.tagline IS 'Short subtitle shown on tier cards';
COMMENT ON COLUMN public.membership_tiers.accent_color IS 'UI accent key: violet, cyan, emerald, amber, rose, gold';
COMMENT ON COLUMN public.membership_tiers.compare_at_price IS 'Optional strikethrough price on POS membership product';
