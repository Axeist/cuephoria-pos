ALTER TABLE public.staff_hr_audit_log
  ADD COLUMN IF NOT EXISTS actor_staff_id UUID REFERENCES public.staff_profiles (user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS idx_staff_hr_audit_log_staff_created
  ON public.staff_hr_audit_log (organization_id, actor_staff_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_hr_audit_log_category
  ON public.staff_hr_audit_log (organization_id, category, created_at DESC);

ALTER TABLE public.staff_hr_settings
  ADD COLUMN IF NOT EXISTS employee_pin_protection_enabled BOOLEAN NOT NULL DEFAULT false;
