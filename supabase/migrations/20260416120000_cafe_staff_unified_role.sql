-- Unified "staff" role for cafe (POS + kitchen + menu in one login). Existing cashier/kitchen rows stay valid.

ALTER TABLE public.cafe_users DROP CONSTRAINT IF EXISTS cafe_users_role_check;
ALTER TABLE public.cafe_users ADD CONSTRAINT cafe_users_role_check
  CHECK (role IN ('cafe_admin', 'cashier', 'kitchen', 'staff'));

COMMENT ON CONSTRAINT cafe_users_role_check ON public.cafe_users IS
  'staff = unified front-of-house (POS, KDS, menu); cashier/kitchen kept for backward compatibility';
