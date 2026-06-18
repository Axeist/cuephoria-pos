-- Multi-location (Main + Cuephoria Lite): core schema
-- Adds locations, admin_user_locations, location_settings; location_id on operational tables;
-- splits booking_settings per location; refreshes tournament_public_view.

-- ---------------------------------------------------------------------------
-- 1) Locations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  short_code TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT locations_slug_unique UNIQUE (slug),
  CONSTRAINT locations_short_code_unique UNIQUE (short_code)
);

INSERT INTO public.locations (name, slug, short_code, sort_order)
VALUES
  ('Cuephoria Gaming Lounge', 'main', 'MAIN', 0),
  ('Cuephoria Lite', 'lite', 'LITE', 1)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Admin users ↔ locations (access control)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_user_locations (
  admin_user_id UUID NOT NULL REFERENCES public.admin_users (id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  PRIMARY KEY (admin_user_id, location_id)
);

INSERT INTO public.admin_user_locations (admin_user_id, location_id)
SELECT au.id, loc.id
FROM public.admin_users au
CROSS JOIN public.locations loc
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Per-location settings (mirrors app_settings shape per venue)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.location_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT location_settings_location_key UNIQUE (location_id, key)
);

CREATE INDEX IF NOT EXISTS idx_location_settings_location_id ON public.location_settings (location_id);

INSERT INTO public.location_settings (location_id, key, value, description)
SELECT l.id, a.key, a.value, a.description
FROM public.app_settings a
CROSS JOIN (
  SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1
) l
ON CONFLICT (location_id, key) DO NOTHING;

INSERT INTO public.location_settings (location_id, key, value, description)
SELECT l_lite.id, ls.key, ls.value, ls.description
FROM public.location_settings ls
CROSS JOIN (SELECT id FROM public.locations WHERE slug = 'lite' LIMIT 1) l_lite
WHERE ls.location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1)
ON CONFLICT (location_id, key) DO NOTHING;

UPDATE public.location_settings
SET value = jsonb_set(value, '{name}', '"Cuephoria Lite"', true)
WHERE location_id = (SELECT id FROM public.locations WHERE slug = 'lite' LIMIT 1)
  AND key = 'business_info';

-- Triggers for updated_at on location_settings
CREATE OR REPLACE FUNCTION public.update_location_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS location_settings_updated_at ON public.location_settings;
CREATE TRIGGER location_settings_updated_at
  BEFORE UPDATE ON public.location_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_location_settings_updated_at();

-- ---------------------------------------------------------------------------
-- 4) booking_settings: per location
-- ---------------------------------------------------------------------------
ALTER TABLE public.booking_settings
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);

UPDATE public.booking_settings
SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1)
WHERE location_id IS NULL;

ALTER TABLE public.booking_settings
  ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.booking_settings DROP CONSTRAINT IF EXISTS booking_settings_setting_key_key;

ALTER TABLE public.booking_settings
  ADD CONSTRAINT booking_settings_location_setting_key UNIQUE (location_id, setting_key);

INSERT INTO public.booking_settings (setting_key, setting_value, description, location_id)
SELECT bs.setting_key, bs.setting_value, bs.description,
       (SELECT id FROM public.locations WHERE slug = 'lite' LIMIT 1)
FROM public.booking_settings bs
WHERE bs.location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1)
ON CONFLICT (location_id, setting_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5) Attach location_id to operational tables (backfill to Main)
-- ---------------------------------------------------------------------------
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.stations SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.stations ALTER COLUMN location_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stations_location_id ON public.stations (location_id);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.categories SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.categories ALTER COLUMN location_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_location_id ON public.categories (location_id);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.products SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.products ALTER COLUMN location_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_location_id ON public.products (location_id);

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.customers SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.customers ALTER COLUMN location_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_location_id ON public.customers (location_id);

ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.bills SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.bills ALTER COLUMN location_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bills_location_id ON public.bills (location_id);

ALTER TABLE public.bill_items ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.bill_items SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.bill_items ALTER COLUMN location_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bill_items_location_id ON public.bill_items (location_id);

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.bookings SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.bookings ALTER COLUMN location_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_location_id ON public.bookings (location_id);

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.sessions SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.sessions ALTER COLUMN location_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_location_id ON public.sessions (location_id);

ALTER TABLE public.slot_blocks ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.slot_blocks SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.slot_blocks ALTER COLUMN location_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_slot_blocks_location_id ON public.slot_blocks (location_id);

ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.offers SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.offers ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.promotions SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.promotions ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.rewards SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.rewards ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.reward_redemptions ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.reward_redemptions SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.reward_redemptions ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.referrals SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.referrals ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.loyalty_transactions SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.loyalty_transactions ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.expenses SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.expenses ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.tournaments SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.tournaments ALTER COLUMN location_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tournaments_location_id ON public.tournaments (location_id);

ALTER TABLE public.tournament_registrations ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.tournament_registrations SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.tournament_registrations ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.tournament_public_registrations ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.tournament_public_registrations SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.tournament_public_registrations ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.tournament_history ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.tournament_history SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.tournament_history ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.tournament_winners ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.tournament_winners SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.tournament_winners ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.tournament_winner_images ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.tournament_winner_images SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.tournament_winner_images ALTER COLUMN location_id SET NOT NULL;

-- Cash / vault (one row per location; app uses .eq('location_id', …))
ALTER TABLE public.cash_vault ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.cash_vault SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.cash_vault ALTER COLUMN location_id SET NOT NULL;
DELETE FROM public.cash_vault a
USING public.cash_vault b
WHERE a.ctid < b.ctid
  AND a.location_id IS NOT DISTINCT FROM b.location_id;
CREATE UNIQUE INDEX IF NOT EXISTS cash_vault_location_id_key ON public.cash_vault (location_id);
INSERT INTO public.cash_vault (current_amount, updated_by, location_id)
SELECT 0, 'system', l.id
FROM public.locations l
WHERE l.slug = 'lite'
  AND NOT EXISTS (SELECT 1 FROM public.cash_vault v WHERE v.location_id = l.id);

ALTER TABLE public.cash_transactions ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
-- First, try to inherit location_id from the associated bill
UPDATE public.cash_transactions ct
SET location_id = b.location_id
FROM public.bills b
WHERE ct.bill_id = b.id AND ct.location_id IS NULL;
-- Fallback: assign remaining rows to Main
UPDATE public.cash_transactions
SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1)
WHERE location_id IS NULL;
ALTER TABLE public.cash_transactions ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.cash_deposits ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.cash_deposits SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.cash_deposits ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.cash_bank_deposits ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.cash_bank_deposits SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.cash_bank_deposits ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.cash_vault_transactions ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.cash_vault_transactions SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.cash_vault_transactions ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.cash_summary ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.cash_summary SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.cash_summary ALTER COLUMN location_id SET NOT NULL;
ALTER TABLE public.cash_summary DROP CONSTRAINT IF EXISTS cash_summary_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS cash_summary_location_date_key ON public.cash_summary (location_id, date);

-- Investments
ALTER TABLE public.investment_partners ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.investment_partners SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.investment_partners ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.investment_transactions ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.investment_transactions SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.investment_transactions ALTER COLUMN location_id SET NOT NULL;

-- Notifications / templates
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.notifications SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.notifications ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.email_templates SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.email_templates ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.notification_templates ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.notification_templates SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.notification_templates ALTER COLUMN location_id SET NOT NULL;

-- Staff (schedules & attendance scoped; profiles stay global — optional column for home site)
ALTER TABLE public.staff_work_schedules ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.staff_work_schedules SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.staff_work_schedules ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.staff_attendance ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.staff_attendance SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.staff_attendance ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.staff_leave_requests ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.staff_leave_requests SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.staff_leave_requests ALTER COLUMN location_id SET NOT NULL;

-- Optional tables (only if present in DB)
DO $loc$
DECLARE
  main_id uuid := (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1);
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'staff_payroll', 'staff_allowances', 'staff_deductions',
    'active_breaks', 'staff_break_violations', 'bill_edit_audit'
  ]
  LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id)',
        tbl
      );
      EXECUTE format(
        'UPDATE public.%I SET location_id = $1 WHERE location_id IS NULL',
        tbl
      ) USING main_id;
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN location_id SET NOT NULL',
        tbl
      );
    END IF;
  END LOOP;
END
$loc$;

-- Customer offers (if present)
ALTER TABLE public.customer_offers ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.customer_offers SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.customer_offers ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.customer_offer_assignments ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.customer_offer_assignments SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.customer_offer_assignments ALTER COLUMN location_id SET NOT NULL;

-- Drop global unique on customer_offers.offer_code if exists; replace with per-location
ALTER TABLE public.customer_offers DROP CONSTRAINT IF EXISTS customer_offers_offer_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS customer_offers_location_offer_code_key
  ON public.customer_offers (location_id, offer_code)
  WHERE offer_code IS NOT NULL;

-- booking_views: derive via booking
ALTER TABLE public.booking_views ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);
UPDATE public.booking_views bv
SET location_id = b.location_id
FROM public.bookings b
WHERE bv.booking_id = b.id AND bv.location_id IS NULL;
UPDATE public.booking_views SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1) WHERE location_id IS NULL;
ALTER TABLE public.booking_views ALTER COLUMN location_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 6) Public read for locations (booking / public pages)
-- ---------------------------------------------------------------------------
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS locations_public_read ON public.locations;
CREATE POLICY locations_public_read ON public.locations
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS locations_authenticated_all ON public.locations;
CREATE POLICY locations_authenticated_all ON public.locations
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 7) Refresh tournament_public_view (include location_id)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.tournament_public_view;

CREATE VIEW public.tournament_public_view AS
SELECT
  t.id,
  t.location_id,
  t.name,
  t.game_type,
  t.game_variant,
  t.game_title,
  t.date,
  t.status,
  t.budget,
  t.winner_prize,
  t.runner_up_prize,
  t.third_prize,
  t.winner_prize_text,
  t.runner_up_prize_text,
  t.third_prize_text,
  t.winner,
  t.runner_up,
  t.third_place,
  t.max_players,
  t.tournament_format,
  t.entry_fee,
  t.discount_coupons,
  t.players,
  t.matches,
  COALESCE(
    (SELECT COUNT(*)::int FROM public.tournament_public_registrations r WHERE r.tournament_id = t.id),
    0
  ) AS total_registrations
FROM public.tournaments t;

GRANT SELECT ON public.tournament_public_view TO anon, authenticated;

COMMENT ON TABLE public.locations IS 'Physical branches (Main, Lite, …) for multi-location POS';
COMMENT ON TABLE public.location_settings IS 'Per-location app settings JSON (business_info, tax, …)';
COMMENT ON TABLE public.admin_user_locations IS 'Which branch(es) each admin/staff user may access';
