-- Allow deleting cafe_users; historical created_by pointers are cleared instead of blocking DELETE.
ALTER TABLE public.cafe_orders
  DROP CONSTRAINT IF EXISTS cafe_orders_created_by_fkey;

ALTER TABLE public.cafe_orders
  ADD CONSTRAINT cafe_orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.cafe_users (id) ON DELETE SET NULL;

ALTER TABLE public.cafe_kot
  DROP CONSTRAINT IF EXISTS cafe_kot_created_by_fkey;

ALTER TABLE public.cafe_kot
  ADD CONSTRAINT cafe_kot_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.cafe_users (id) ON DELETE SET NULL;
