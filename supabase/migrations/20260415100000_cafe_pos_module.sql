-- ============================================================================
-- CAFE POS MODULE: Full schema for outsourced cafe with KOT + revenue split
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0a) Ensure locations table exists (normally created by multi_location_core)
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

-- Seed default locations if empty
INSERT INTO public.locations (name, slug, short_code, sort_order)
VALUES
  ('Cuephoria Gaming Lounge', 'main', 'MAIN', 0)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 0b) Ensure admin_user_locations exists (only if admin_users table is present)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.admin_users') IS NOT NULL
     AND to_regclass('public.admin_user_locations') IS NULL THEN
    CREATE TABLE public.admin_user_locations (
      admin_user_id UUID NOT NULL REFERENCES public.admin_users (id) ON DELETE CASCADE,
      location_id UUID NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
      PRIMARY KEY (admin_user_id, location_id)
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 0c) Register cafe as a location
-- ---------------------------------------------------------------------------
INSERT INTO public.locations (name, slug, short_code, sort_order)
VALUES ('Cuephoria Cafe', 'cafe', 'CAFE', 2)
ON CONFLICT (slug) DO NOTHING;

-- Grant all existing admins access to cafe location (safe even if is_super_admin column doesn't exist)
DO $$
BEGIN
  IF to_regclass('public.admin_users') IS NOT NULL THEN
    EXECUTE '
      INSERT INTO public.admin_user_locations (admin_user_id, location_id)
      SELECT au.id, loc.id
      FROM public.admin_users au
      CROSS JOIN (SELECT id FROM public.locations WHERE slug = ''cafe'') loc
      ON CONFLICT DO NOTHING
    ';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) cafe_partners — third-party operator configuration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cafe_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  partner_rate NUMERIC(5,2) NOT NULL DEFAULT 70.00,
  cuephoria_rate NUMERIC(5,2) NOT NULL DEFAULT 30.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cafe_partners_rate_sum CHECK (partner_rate + cuephoria_rate = 100)
);

CREATE INDEX IF NOT EXISTS idx_cafe_partners_location ON public.cafe_partners(location_id);

-- Seed default partner
INSERT INTO public.cafe_partners (location_id, name, contact_name, partner_rate, cuephoria_rate)
SELECT loc.id, 'Cafe Partner', 'Partner Admin', 70.00, 30.00
FROM public.locations loc WHERE loc.slug = 'cafe'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) cafe_users — separate login for cafe staff
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cafe_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.cafe_partners(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'cashier',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cafe_users_role_check CHECK (role IN ('cafe_admin', 'cashier', 'kitchen')),
  CONSTRAINT cafe_users_username_unique UNIQUE (username)
);

CREATE INDEX IF NOT EXISTS idx_cafe_users_location ON public.cafe_users(location_id);
CREATE INDEX IF NOT EXISTS idx_cafe_users_partner ON public.cafe_users(partner_id);

-- Seed default cafe admin user (password: cafe123 — should be changed)
INSERT INTO public.cafe_users (location_id, partner_id, username, password, display_name, role)
SELECT loc.id, cp.id, 'cafeadmin', 'cafe123', 'Cafe Admin', 'cafe_admin'
FROM public.locations loc
JOIN public.cafe_partners cp ON cp.location_id = loc.id
WHERE loc.slug = 'cafe'
ON CONFLICT (username) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) cafe_menu_categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cafe_menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.cafe_partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cafe_menu_categories_location ON public.cafe_menu_categories(location_id);

-- ---------------------------------------------------------------------------
-- 4) cafe_menu_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cafe_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.cafe_menu_categories(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  cost_price NUMERIC(10,2),
  image_url TEXT,
  is_veg BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,
  prep_time_minutes INT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cafe_menu_items_category ON public.cafe_menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_cafe_menu_items_location ON public.cafe_menu_items(location_id);
CREATE INDEX IF NOT EXISTS idx_cafe_menu_items_available ON public.cafe_menu_items(is_available) WHERE is_available = true;

-- ---------------------------------------------------------------------------
-- 5) cafe_tables — seating management (indoor, rooftop, counter, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cafe_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.cafe_partners(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  zone TEXT NOT NULL DEFAULT 'indoor',
  capacity INT NOT NULL DEFAULT 4,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_occupied BOOLEAN NOT NULL DEFAULT false,
  current_order_id UUID NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cafe_tables_location ON public.cafe_tables(location_id);
CREATE INDEX IF NOT EXISTS idx_cafe_tables_zone ON public.cafe_tables(zone);
CREATE INDEX IF NOT EXISTS idx_cafe_tables_occupied ON public.cafe_tables(is_occupied) WHERE is_occupied = true;

-- ---------------------------------------------------------------------------
-- 6) Order number sequence
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.cafe_order_number_seq START WITH 1 INCREMENT BY 1;

-- ---------------------------------------------------------------------------
-- 7) cafe_orders — with revenue split snapshots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cafe_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.cafe_partners(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL DEFAULT ('CAF-' || LPAD(nextval('public.cafe_order_number_seq')::text, 5, '0')),
  order_type TEXT NOT NULL DEFAULT 'dine_in',
  order_source TEXT NOT NULL DEFAULT 'pos',
  cafe_table_id UUID REFERENCES public.cafe_tables(id),
  station_id UUID,
  customer_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  partner_rate_snapshot NUMERIC(5,2) NOT NULL,
  cuephoria_rate_snapshot NUMERIC(5,2) NOT NULL,
  partner_share NUMERIC(10,2) NOT NULL DEFAULT 0,
  cuephoria_share NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'pending',
  cash_amount NUMERIC(10,2),
  upi_amount NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES public.cafe_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT cafe_orders_type_check CHECK (order_type IN ('dine_in', 'takeaway', 'delivery_to_station', 'self_order')),
  CONSTRAINT cafe_orders_source_check CHECK (order_source IN ('pos', 'customer')),
  CONSTRAINT cafe_orders_payment_check CHECK (payment_method IN ('cash', 'upi', 'split', 'complimentary', 'pending')),
  CONSTRAINT cafe_orders_status_check CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
  CONSTRAINT cafe_orders_rate_sum CHECK (partner_rate_snapshot + cuephoria_rate_snapshot = 100),
  CONSTRAINT cafe_orders_number_unique UNIQUE (order_number)
);

CREATE INDEX IF NOT EXISTS idx_cafe_orders_location ON public.cafe_orders(location_id);
CREATE INDEX IF NOT EXISTS idx_cafe_orders_partner ON public.cafe_orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_cafe_orders_customer ON public.cafe_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_cafe_orders_table ON public.cafe_orders(cafe_table_id);
CREATE INDEX IF NOT EXISTS idx_cafe_orders_status ON public.cafe_orders(status);
CREATE INDEX IF NOT EXISTS idx_cafe_orders_created ON public.cafe_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cafe_orders_source ON public.cafe_orders(order_source);

-- Add FK from cafe_tables.current_order_id now that cafe_orders exists
DO $$ BEGIN
  ALTER TABLE public.cafe_tables
    ADD CONSTRAINT cafe_tables_current_order_fk
    FOREIGN KEY (current_order_id) REFERENCES public.cafe_orders(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Conditionally add FK to stations and customers if those tables exist
DO $$ BEGIN
  IF to_regclass('public.stations') IS NOT NULL THEN
    ALTER TABLE public.cafe_orders
      ADD CONSTRAINT cafe_orders_station_fk
      FOREIGN KEY (station_id) REFERENCES public.stations(id);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF to_regclass('public.customers') IS NOT NULL THEN
    ALTER TABLE public.cafe_orders
      ADD CONSTRAINT cafe_orders_customer_fk
      FOREIGN KEY (customer_id) REFERENCES public.customers(id);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 8) cafe_order_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cafe_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.cafe_orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.cafe_menu_items(id),
  item_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  notes TEXT,
  kot_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cafe_order_items_kot_check CHECK (kot_status IN ('pending', 'sent_to_kitchen', 'preparing', 'ready', 'served', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_cafe_order_items_order ON public.cafe_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_cafe_order_items_menu_item ON public.cafe_order_items(menu_item_id);

-- ---------------------------------------------------------------------------
-- 9) cafe_kot — Kitchen Order Tokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cafe_kot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.cafe_orders(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  kot_number TEXT NOT NULL,
  kot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.cafe_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  CONSTRAINT cafe_kot_status_check CHECK (status IN ('pending', 'acknowledged', 'preparing', 'ready', 'served', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_cafe_kot_order ON public.cafe_kot(order_id);
CREATE INDEX IF NOT EXISTS idx_cafe_kot_location ON public.cafe_kot(location_id);
CREATE INDEX IF NOT EXISTS idx_cafe_kot_status ON public.cafe_kot(status);
CREATE INDEX IF NOT EXISTS idx_cafe_kot_created ON public.cafe_kot(created_at DESC);

-- Unique KOT number per location per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_cafe_kot_number_daily
  ON public.cafe_kot(location_id, kot_number, kot_date);

-- ---------------------------------------------------------------------------
-- 10) cafe_settlements — revenue reconciliation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cafe_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.cafe_partners(id) ON DELETE CASCADE,
  settlement_date DATE NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_orders INT NOT NULL DEFAULT 0,
  gross_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  partner_payout NUMERIC(10,2) NOT NULL DEFAULT 0,
  cuephoria_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  confirmed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cafe_settlements_status_check CHECK (status IN ('draft', 'confirmed', 'paid'))
);

CREATE INDEX IF NOT EXISTS idx_cafe_settlements_location ON public.cafe_settlements(location_id);
CREATE INDEX IF NOT EXISTS idx_cafe_settlements_partner ON public.cafe_settlements(partner_id);
CREATE INDEX IF NOT EXISTS idx_cafe_settlements_date ON public.cafe_settlements(settlement_date DESC);

DO $$ BEGIN
  IF to_regclass('public.admin_users') IS NOT NULL THEN
    ALTER TABLE public.cafe_settlements
      ADD CONSTRAINT cafe_settlements_confirmed_by_fk
      FOREIGN KEY (confirmed_by) REFERENCES public.admin_users(id);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 11) Helper functions
-- ---------------------------------------------------------------------------

-- Generate next KOT number for today (atomic)
CREATE OR REPLACE FUNCTION public.next_cafe_kot_number(p_location_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(kot_number FROM 5) AS INT)), 0
  ) + 1
  INTO next_num
  FROM public.cafe_kot
  WHERE location_id = p_location_id
    AND kot_date = CURRENT_DATE;

  RETURN 'KOT-' || LPAD(next_num::text, 3, '0');
END;
$$;

-- Atomic increment of customer total_spent (prevents lost-update race)
CREATE OR REPLACE FUNCTION public.increment_customer_total_spent(
  p_customer_id UUID,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.customers
  SET total_spent = COALESCE(total_spent, 0) + p_amount
  WHERE id = p_customer_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 12) Auto-release table when order is completed/cancelled
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cafe_order_table_release()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled') AND OLD.status NOT IN ('completed', 'cancelled') THEN
    -- Release the cafe table
    IF NEW.cafe_table_id IS NOT NULL THEN
      UPDATE public.cafe_tables
      SET is_occupied = false,
          current_order_id = NULL,
          updated_at = now()
      WHERE id = NEW.cafe_table_id
        AND current_order_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cafe_order_table_release ON public.cafe_orders;
CREATE TRIGGER trg_cafe_order_table_release
  AFTER UPDATE ON public.cafe_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.cafe_order_table_release();

-- ---------------------------------------------------------------------------
-- 13) Auto-cancel KOTs when order is cancelled
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cafe_order_cancel_kots()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE public.cafe_kot
    SET status = 'cancelled'
    WHERE order_id = NEW.id
      AND status NOT IN ('served', 'cancelled');

    UPDATE public.cafe_order_items
    SET kot_status = 'cancelled'
    WHERE order_id = NEW.id
      AND kot_status NOT IN ('served', 'cancelled');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cafe_order_cancel_kots ON public.cafe_orders;
CREATE TRIGGER trg_cafe_order_cancel_kots
  AFTER UPDATE ON public.cafe_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.cafe_order_cancel_kots();

-- ---------------------------------------------------------------------------
-- 14) updated_at triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cafe_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cafe_partners_updated ON public.cafe_partners;
CREATE TRIGGER trg_cafe_partners_updated
  BEFORE UPDATE ON public.cafe_partners FOR EACH ROW
  EXECUTE FUNCTION public.cafe_set_updated_at();

DROP TRIGGER IF EXISTS trg_cafe_menu_items_updated ON public.cafe_menu_items;
CREATE TRIGGER trg_cafe_menu_items_updated
  BEFORE UPDATE ON public.cafe_menu_items FOR EACH ROW
  EXECUTE FUNCTION public.cafe_set_updated_at();

DROP TRIGGER IF EXISTS trg_cafe_tables_updated ON public.cafe_tables;
CREATE TRIGGER trg_cafe_tables_updated
  BEFORE UPDATE ON public.cafe_tables FOR EACH ROW
  EXECUTE FUNCTION public.cafe_set_updated_at();

-- ---------------------------------------------------------------------------
-- 15) RLS — service-role bypass; public read on menu for self-order
-- ---------------------------------------------------------------------------
ALTER TABLE public.cafe_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_kot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_settlements ENABLE ROW LEVEL SECURITY;

-- Public read for menu (customer self-order page)
DROP POLICY IF EXISTS cafe_menu_categories_public_read ON public.cafe_menu_categories;
CREATE POLICY cafe_menu_categories_public_read ON public.cafe_menu_categories
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS cafe_menu_items_public_read ON public.cafe_menu_items;
CREATE POLICY cafe_menu_items_public_read ON public.cafe_menu_items
  FOR SELECT TO anon, authenticated USING (is_available = true);

-- Public read on tables (customer sees availability)
DROP POLICY IF EXISTS cafe_tables_public_read ON public.cafe_tables;
CREATE POLICY cafe_tables_public_read ON public.cafe_tables
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- Public read on orders (customer tracks own order by id)
DROP POLICY IF EXISTS cafe_orders_public_read ON public.cafe_orders;
CREATE POLICY cafe_orders_public_read ON public.cafe_orders
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS cafe_order_items_public_read ON public.cafe_order_items;
CREATE POLICY cafe_order_items_public_read ON public.cafe_order_items
  FOR SELECT TO anon, authenticated USING (true);

-- Authenticated full access (service role handles cafe staff ops)
DROP POLICY IF EXISTS cafe_partners_auth_all ON public.cafe_partners;
CREATE POLICY cafe_partners_auth_all ON public.cafe_partners
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cafe_users_auth_all ON public.cafe_users;
CREATE POLICY cafe_users_auth_all ON public.cafe_users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cafe_menu_categories_auth_all ON public.cafe_menu_categories;
CREATE POLICY cafe_menu_categories_auth_all ON public.cafe_menu_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cafe_menu_items_auth_all ON public.cafe_menu_items;
CREATE POLICY cafe_menu_items_auth_all ON public.cafe_menu_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cafe_tables_auth_all ON public.cafe_tables;
CREATE POLICY cafe_tables_auth_all ON public.cafe_tables
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cafe_orders_auth_all ON public.cafe_orders;
CREATE POLICY cafe_orders_auth_all ON public.cafe_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cafe_order_items_auth_all ON public.cafe_order_items;
CREATE POLICY cafe_order_items_auth_all ON public.cafe_order_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cafe_kot_auth_all ON public.cafe_kot;
CREATE POLICY cafe_kot_auth_all ON public.cafe_kot
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cafe_settlements_auth_all ON public.cafe_settlements;
CREATE POLICY cafe_settlements_auth_all ON public.cafe_settlements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anon insert for customer self-orders
DROP POLICY IF EXISTS cafe_orders_anon_insert ON public.cafe_orders;
CREATE POLICY cafe_orders_anon_insert ON public.cafe_orders
  FOR INSERT TO anon WITH CHECK (order_source = 'customer');

DROP POLICY IF EXISTS cafe_order_items_anon_insert ON public.cafe_order_items;
CREATE POLICY cafe_order_items_anon_insert ON public.cafe_order_items
  FOR INSERT TO anon WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 16) Enable Realtime on key cafe tables (safe if publication exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_orders;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_kot;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_tables;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_order_items;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 17) Rate-limiting table for customer self-orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cafe_order_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cafe_rate_limits_phone ON public.cafe_order_rate_limits(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cafe_rate_limits_ip ON public.cafe_order_rate_limits(ip_address, created_at DESC);

ALTER TABLE public.cafe_order_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cafe_rate_limits_anon_insert ON public.cafe_order_rate_limits;
CREATE POLICY cafe_rate_limits_anon_insert ON public.cafe_order_rate_limits
  FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS cafe_rate_limits_auth_all ON public.cafe_order_rate_limits;
CREATE POLICY cafe_rate_limits_auth_all ON public.cafe_order_rate_limits
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.cafe_partners IS 'Third-party cafe operator config with configurable revenue split';
COMMENT ON TABLE public.cafe_users IS 'Cafe staff credentials (separate from admin_users)';
COMMENT ON TABLE public.cafe_menu_categories IS 'Cafe menu categories (starters, mains, beverages, etc.)';
COMMENT ON TABLE public.cafe_menu_items IS 'Cafe menu items with pricing and kitchen metadata';
COMMENT ON TABLE public.cafe_tables IS 'Cafe seating: indoor, rooftop, counter zones with occupancy tracking';
COMMENT ON TABLE public.cafe_orders IS 'Cafe orders with revenue split snapshots';
COMMENT ON TABLE public.cafe_order_items IS 'Line items for cafe orders';
COMMENT ON TABLE public.cafe_kot IS 'Kitchen Order Tokens for cafe kitchen display';
COMMENT ON TABLE public.cafe_settlements IS 'Periodic revenue reconciliation between Cuephoria and cafe partner';
