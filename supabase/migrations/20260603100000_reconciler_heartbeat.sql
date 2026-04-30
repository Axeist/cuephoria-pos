-- ---------------------------------------------------------------------
-- Reconciler heartbeat
--
-- Single-row table the Razorpay reconciler upserts after each sweep so
-- that the UI can show whether pg_cron is firing. If `last_run_at`
-- becomes stale (> 60s), the booking-management Reconciliation tab
-- surfaces a warning.
--
-- Why a dedicated table instead of cron.job_run_details:
--   - cron.job_run_details lives in the cron schema and is not exposed
--     to the anon role by default. A plain table with RLS gives the UI
--     a safe, narrow view without granting cron access.
--   - We also record the per-run tally (scanned/paid/pending/...) so
--     operators can see at a glance whether the sweep has work to do.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reconciler_heartbeat (
  id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_run_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_source     TEXT,
  last_scanned    INT NOT NULL DEFAULT 0,
  last_paid       INT NOT NULL DEFAULT 0,
  last_pending    INT NOT NULL DEFAULT 0,
  last_expired    INT NOT NULL DEFAULT 0,
  last_failed     INT NOT NULL DEFAULT 0,
  last_errors     INT NOT NULL DEFAULT 0,
  last_elapsed_ms INT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.reconciler_heartbeat (id, last_run_at, last_source)
VALUES (1, '1970-01-01T00:00:00Z', 'never')
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.tg_reconciler_heartbeat_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS reconciler_heartbeat_touch ON public.reconciler_heartbeat;
CREATE TRIGGER reconciler_heartbeat_touch
  BEFORE UPDATE ON public.reconciler_heartbeat
  FOR EACH ROW EXECUTE FUNCTION public.tg_reconciler_heartbeat_touch();

ALTER TABLE public.reconciler_heartbeat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reconciler_heartbeat_read_all" ON public.reconciler_heartbeat;
CREATE POLICY "reconciler_heartbeat_read_all"
  ON public.reconciler_heartbeat
  FOR SELECT
  TO anon, authenticated, service_role
  USING (true);

DROP POLICY IF EXISTS "reconciler_heartbeat_write_service" ON public.reconciler_heartbeat;
CREATE POLICY "reconciler_heartbeat_write_service"
  ON public.reconciler_heartbeat
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.reconciler_heartbeat IS
  'Single-row heartbeat updated by /api/razorpay/reconcile after every sweep. UI uses last_run_at to detect a stale pg_cron job.';
