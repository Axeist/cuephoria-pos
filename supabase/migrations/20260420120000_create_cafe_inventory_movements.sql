-- Create cafe_inventory_movements table for stock tracking
CREATE TABLE IF NOT EXISTS public.cafe_inventory_movements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id uuid NOT NULL,
  menu_item_id uuid NOT NULL REFERENCES public.cafe_menu_items(id) ON DELETE CASCADE,
  quantity_delta integer NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('sale', 'adjustment_add', 'adjustment_reduce', 'waste', 'return')),
  order_id uuid REFERENCES public.cafe_orders(id) ON DELETE SET NULL,
  note text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cafe_inv_mov_location ON public.cafe_inventory_movements(location_id);
CREATE INDEX IF NOT EXISTS idx_cafe_inv_mov_item ON public.cafe_inventory_movements(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_cafe_inv_mov_order ON public.cafe_inventory_movements(order_id);

ALTER TABLE public.cafe_inventory_movements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all cafe_inventory_movements"
    ON public.cafe_inventory_movements
    FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
