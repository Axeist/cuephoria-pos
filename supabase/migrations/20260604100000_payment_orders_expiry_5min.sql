-- Align payment_orders.expires_at default with app reconciler (5 min pending window).
ALTER TABLE public.payment_orders
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '5 minutes');

COMMENT ON COLUMN public.payment_orders.expires_at IS
  'When the pending checkout is treated as stale (slot holds + webhook guards); default 5 minutes.';
