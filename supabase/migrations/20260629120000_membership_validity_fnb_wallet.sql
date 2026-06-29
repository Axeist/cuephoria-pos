-- Membership tier validity modes, F&B benefits toggle, wallet card_amount on bills
-- Rollback:
--   ALTER TABLE public.membership_tiers DROP COLUMN IF EXISTS fnb_benefits_enabled;
--   ALTER TABLE public.membership_tiers DROP COLUMN IF EXISTS default_validity_days;
--   ALTER TABLE public.bills DROP COLUMN IF EXISTS card_amount;

ALTER TABLE public.membership_tiers
  ADD COLUMN IF NOT EXISTS fnb_benefits_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_validity_days INT;

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS card_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.membership_tiers.fnb_benefits_enabled IS
  'When false, tier F&B discounts are not applied regardless of fnb_discount_pct.';
COMMENT ON COLUMN public.membership_tiers.default_validity_days IS
  'Custom validity length when default_duration = custom_days.';
COMMENT ON COLUMN public.bills.card_amount IS
  'Member wallet (card balance) portion when payment includes card redemption.';
