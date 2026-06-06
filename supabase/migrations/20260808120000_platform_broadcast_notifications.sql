-- Platform admin broadcasts → fan-out to staff_notifications (Realtime to all workspaces).

CREATE TABLE IF NOT EXISTS public.platform_broadcasts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  message             TEXT NOT NULL,
  severity            TEXT NOT NULL DEFAULT 'info'
                        CHECK (severity IN ('info', 'warning', 'critical', 'success')),
  target_type         TEXT NOT NULL CHECK (target_type IN ('all', 'organization')),
  organization_id     UUID REFERENCES public.organizations (id) ON DELETE SET NULL,
  organization_name   TEXT,
  location_count      INT NOT NULL DEFAULT 0,
  created_by_admin_id UUID REFERENCES public.platform_admins (id) ON DELETE SET NULL,
  created_by_email    TEXT NOT NULL,
  created_by_name     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_platform_broadcasts_created
  ON public.platform_broadcasts (created_at DESC);

COMMENT ON TABLE public.platform_broadcasts IS
  'Cuetronix platform admin push notifications; each row fans out to staff_notifications per branch.';

-- Extend staff notification kinds for platform broadcasts.
ALTER TABLE public.staff_notifications
  DROP CONSTRAINT IF EXISTS staff_notifications_kind_check;

ALTER TABLE public.staff_notifications
  ADD CONSTRAINT staff_notifications_kind_check
  CHECK (kind IN ('booking', 'session', 'platform'));

ALTER TABLE public.staff_notifications ENABLE ROW LEVEL SECURITY;
