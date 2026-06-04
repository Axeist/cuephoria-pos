-- Platform-only backdoor login per workspace (hidden from tenant staff UI).

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS is_platform_backdoor boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.admin_users.is_platform_backdoor IS
  'Cuephoria platform support account. Hidden from tenant staff lists; credentials shown only in platform console.';

CREATE TABLE IF NOT EXISTS public.workspace_backdoor_access (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations (id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES public.admin_users (id) ON DELETE CASCADE,
  username text NOT NULL,
  password_plaintext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_backdoor_admin_user
  ON public.workspace_backdoor_access (admin_user_id);

COMMENT ON TABLE public.workspace_backdoor_access IS
  'Stores platform operator credentials per workspace. Service-role / platform API only — never expose to tenants.';

ALTER TABLE public.workspace_backdoor_access ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_admin_users_platform_backdoor
  ON public.admin_users (id)
  WHERE is_platform_backdoor = true;
