-- Per-category inventory tracking + stock on items + movement ledger for reports/audit

ALTER TABLE public.cafe_menu_categories
  ADD COLUMN IF NOT EXISTS tracks_inventory BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.cafe_menu_items
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.cafe_inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.cafe_menu_items(id) ON DELETE CASCADE,
  quantity_delta INTEGER NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('adjustment_add', 'adjustment_reduce', 'sale')),
  order_id UUID REFERENCES public.cafe_orders(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.cafe_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cafe_inventory_movements_location ON public.cafe_inventory_movements(location_id);
CREATE INDEX IF NOT EXISTS idx_cafe_inventory_movements_item ON public.cafe_inventory_movements(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_cafe_inventory_movements_created ON public.cafe_inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cafe_inventory_movements_order ON public.cafe_inventory_movements(order_id) WHERE order_id IS NOT NULL;

ALTER TABLE public.cafe_inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cafe_inventory_movements_anon_all ON public.cafe_inventory_movements;
CREATE POLICY cafe_inventory_movements_anon_all ON public.cafe_inventory_movements
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cafe_inventory_movements_auth_all ON public.cafe_inventory_movements;
CREATE POLICY cafe_inventory_movements_auth_all ON public.cafe_inventory_movements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON COLUMN public.cafe_menu_categories.tracks_inventory IS 'When true, menu items in this category use stock_quantity and inventory movements.';
COMMENT ON TABLE public.cafe_inventory_movements IS 'Stock changes: manual adjustments and sales from completed orders.';
