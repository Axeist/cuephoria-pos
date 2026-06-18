-- Align payment_orders.expires_at default with app checkout window (4 minutes).
ALTER TABLE public.payment_orders
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '4 minutes');

COMMENT ON COLUMN public.payment_orders.expires_at IS
  'When pending checkout is stale (slot holds + reconciler); default 4 minutes — see src/lib/payment-checkout-ttl.ts';
