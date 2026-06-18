-- Staff-facing profile: job title shown in app shell (sidebar footer).
-- display_name already exists (slice14); designation is new.

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS designation TEXT;

COMMENT ON COLUMN public.admin_users.designation IS
  'Human-readable job title (e.g. Front desk, Manager) for staff sidebar and directory.';
