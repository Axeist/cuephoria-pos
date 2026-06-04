-- Workspace-level defaults for public booking promotional popups.
-- Per-branch overrides live in booking_settings (key: public_booking_popup_config).

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS public_booking_popup_defaults JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organizations.public_booking_popup_defaults IS
  'Workspace-wide defaults for coupon promos, online payment promo, and Instagram gate on /public/booking.';
