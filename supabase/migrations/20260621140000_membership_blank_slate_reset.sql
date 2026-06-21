-- Membership blank slate: clear all member assignments, wallets, cards, and demo data.
-- Keeps tier plans, settings, coupons, and recharge tier config — only wipes live member state.
-- Rollback: not reversible without backup.

-- Detach cards from customers first (FK)
UPDATE public.customers
SET active_card_id = NULL;

-- Clear membership + wallet on every customer
UPDATE public.customers
SET
  membership_tier_id = NULL,
  card_balance = 0,
  membership_expiry_date = NULL,
  membership_start_date = NULL,
  membership_hours_left = NULL,
  membership_duration = NULL;

-- Legacy columns if still present (pre-20260621120000 soak)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'is_member'
  ) THEN
    EXECUTE 'UPDATE public.customers SET is_member = false';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'membership_plan'
  ) THEN
    EXECUTE 'UPDATE public.customers SET membership_plan = NULL';
  END IF;
END $$;

-- Wallet transaction history
DELETE FROM public.membership_ledger;

-- All NFC card records (inventory, assigned, retired)
DELETE FROM public.membership_cards;

-- Demo seed customers from membership migrations
DELETE FROM public.customers
WHERE phone ~ '^900000000[0-9]$'
   OR custom_id IN ('DEMOALPHA', 'DEMOBETA', 'DEMOGAMMA', 'DEMODELTA', 'DEMOEPSLN');

-- Turn off NFC simulation everywhere
UPDATE public.membership_settings
SET feature_flags = feature_flags || jsonb_build_object('nfc_simulation_enabled', false);
