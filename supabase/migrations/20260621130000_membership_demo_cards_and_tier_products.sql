-- Demo NFC cards linked to demo members + tier retail product fields
-- Rollback: revert tier columns

ALTER TABLE public.membership_tiers
  ADD COLUMN IF NOT EXISTS retail_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_credit_on_purchase NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_duration TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS default_membership_hours INT NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.membership_tiers.retail_price IS 'POS product price when tier is synced to products catalog';
COMMENT ON COLUMN public.membership_tiers.wallet_credit_on_purchase IS 'Prepaid wallet credit after POS tier purchase';
