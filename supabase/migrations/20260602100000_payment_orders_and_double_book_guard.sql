-- =====================================================================
-- Razorpay payment reconciliation foundation
--
-- 1. payment_orders     : durable record of every Razorpay order created
--                         from the public booking flow. Holds the FULL
--                         booking payload so the booking can be
--                         materialized server-side even if the customer
--                         never returns to the success page.
-- 2. claim_payment_orders_for_reconcile RPC : atomically hand a batch
--    of stuck orders to a reconciler invocation (FOR UPDATE SKIP LOCKED).
-- 3. partial unique index on bookings (location_id, station_id,
--    booking_date, start_time) WHERE status IN ('confirmed','in-progress')
--    — last-resort double-booking guard. Created defensively so existing
--    duplicates do NOT block deploy.
-- 4. pg_cron + pg_net schedule firing /api/razorpay/reconcile every 15s.
--
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. payment_orders
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'razorpay'
    CHECK (provider IN ('razorpay','stripe')),
  profile TEXT NOT NULL DEFAULT 'default'
    CHECK (profile IN ('default','lite')),
  kind TEXT NOT NULL DEFAULT 'booking'
    CHECK (kind IN ('booking','tournament')),
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','pending','paid','failed','expired','reconciled')),

  provider_order_id   TEXT NOT NULL,
  provider_payment_id TEXT NULL,

  organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
  location_id     UUID NULL REFERENCES public.locations(id)     ON DELETE SET NULL,
  customer_id     UUID NULL REFERENCES public.customers(id)     ON DELETE SET NULL,

  customer_name  TEXT,
  customer_phone TEXT,
  customer_email TEXT,

  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  currency     TEXT   NOT NULL DEFAULT 'INR',

  -- Full client booking payload, no Razorpay 256-char-per-note limit.
  booking_payload JSONB NOT NULL,
  notes           JSONB,

  materialized_booking_ids UUID[] NOT NULL DEFAULT '{}',
  materialized_bill_id     UUID   NULL,

  reconcile_attempts INT          NOT NULL DEFAULT 0,
  last_reconciled_at TIMESTAMPTZ,
  last_error         TEXT,

  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT payment_orders_provider_order_unique UNIQUE (provider, provider_order_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_status_created
  ON public.payment_orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_orders_provider_payment
  ON public.payment_orders (provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_orders_phone
  ON public.payment_orders (customer_phone)
  WHERE customer_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_orders_location
  ON public.payment_orders (location_id, created_at DESC);

-- Touch updated_at on UPDATE. Function lives in the multi-tenant foundation.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'tenancy_touch_updated_at'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    DROP TRIGGER IF EXISTS payment_orders_touch_updated_at ON public.payment_orders;
    CREATE TRIGGER payment_orders_touch_updated_at
      BEFORE UPDATE ON public.payment_orders
      FOR EACH ROW EXECUTE FUNCTION public.tenancy_touch_updated_at();
  END IF;
END $$;

-- RLS: mirror existing permissive policy used by bookings/bills so the
-- admin UI (anon JWT) can read payment_orders without extra plumbing.
-- Inserts/updates are still service-role only in practice because every
-- mutating path goes through Vercel functions.
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'payment_orders'
      AND policyname = 'payment_orders_all_access'
  ) THEN
    CREATE POLICY "payment_orders_all_access"
      ON public.payment_orders
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE public.payment_orders IS
  'Razorpay payment intents — durable record of order + booking payload so the booking can be materialized via webhook OR reconciler OR success page (any of three converging paths).';

-- Realtime publication wiring (idempotent).
DO $$
DECLARE
  pub_exists BOOLEAN;
  is_member  BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') INTO pub_exists;
  IF NOT pub_exists THEN
    RAISE NOTICE 'supabase_realtime publication not found; skipping realtime wiring.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'payment_orders'
  ) INTO is_member;

  IF NOT is_member THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_orders';
    RAISE NOTICE 'added public.payment_orders to supabase_realtime';
  END IF;

  EXECUTE 'ALTER TABLE public.payment_orders REPLICA IDENTITY FULL';
END $$;

-- ---------------------------------------------------------------------
-- 2. Atomic claim RPC for the reconciler.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_payment_orders_for_reconcile(p_limit int DEFAULT 25)
RETURNS SETOF public.payment_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT id
    FROM public.payment_orders
    WHERE status IN ('created','pending')
      AND created_at < now() - interval '15 seconds'
      AND (last_reconciled_at IS NULL OR last_reconciled_at < now() - interval '10 seconds')
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.payment_orders p
     SET last_reconciled_at = now(),
         reconcile_attempts = p.reconcile_attempts + 1,
         status             = CASE WHEN p.status = 'created' THEN 'pending' ELSE p.status END
    FROM due
   WHERE p.id = due.id
  RETURNING p.*;
END
$$;

REVOKE ALL ON FUNCTION public.claim_payment_orders_for_reconcile(int)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_payment_orders_for_reconcile(int)
  FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_orders_for_reconcile(int)
  TO service_role;

COMMENT ON FUNCTION public.claim_payment_orders_for_reconcile(int) IS
  'Atomically claims a batch of stuck payment_orders for one reconciler invocation. Uses FOR UPDATE SKIP LOCKED so concurrent invocations cannot duplicate work.';

-- ---------------------------------------------------------------------
-- 3. Partial unique index on bookings (defensive — never blocks deploy).
-- ---------------------------------------------------------------------

DO $$
DECLARE
  dup_count int;
BEGIN
  SELECT count(*) INTO dup_count FROM (
    SELECT location_id, station_id, booking_date, start_time
      FROM public.bookings
     WHERE status IN ('confirmed','in-progress')
     GROUP BY 1,2,3,4
    HAVING count(*) > 1
  ) t;

  IF dup_count > 0 THEN
    RAISE WARNING
      'bookings_no_double_book_idx skipped: % duplicate live-slot groups detected. Run dedup query before re-deploying this migration. Application-level guards (slot_blocks + payment_orders) remain active in the meantime.',
      dup_count;
  ELSE
    EXECUTE $idx$
      CREATE UNIQUE INDEX IF NOT EXISTS bookings_no_double_book_idx
        ON public.bookings (location_id, station_id, booking_date, start_time)
        WHERE status IN ('confirmed','in-progress')
    $idx$;
  END IF;
END $$;

-- Dedup query (commented; ops runs manually if the WARNING fires):
--
--   WITH dupes AS (
--     SELECT id,
--            row_number() OVER (
--              PARTITION BY location_id, station_id, booking_date, start_time
--              ORDER BY created_at ASC, id ASC
--            ) AS rn
--       FROM public.bookings
--      WHERE status IN ('confirmed','in-progress')
--   )
--   UPDATE public.bookings
--      SET status = 'cancelled', notes = COALESCE(notes,'') || ' [auto-cancelled duplicate]'
--    WHERE id IN (SELECT id FROM dupes WHERE rn > 1);

-- ---------------------------------------------------------------------
-- 4. pg_cron + pg_net schedule (every 15 seconds).
--
-- One-time setup (run after extension enabled, GUCs hold the URL+secret):
--   ALTER DATABASE postgres SET app.reconcile_url    = 'https://admin.cuephoria.in/api/razorpay/reconcile';
--   ALTER DATABASE postgres SET app.reconcile_secret = '<RECONCILE_CRON_SECRET>';
-- ---------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule any previous version (idempotent re-run safe).
DO $$
BEGIN
  PERFORM cron.unschedule('rzp-reconcile-15s');
EXCEPTION WHEN OTHERS THEN
  -- job did not exist; ignore
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'rzp-reconcile-15s',
    '15 seconds',
    $cron$
      SELECT net.http_post(
        url     := current_setting('app.reconcile_url', true),
        headers := jsonb_build_object(
          'content-type','application/json',
          'x-cron-secret', current_setting('app.reconcile_secret', true)
        ),
        body            := '{"source":"pg_cron"}'::jsonb,
        timeout_milliseconds := 8000
      );
    $cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not schedule rzp-reconcile-15s (pg_cron may not be enabled yet): %', SQLERRM;
END $$;

COMMENT ON EXTENSION pg_cron IS
  'pg_cron — used to fire the Razorpay payment reconciler every 15s. Job: rzp-reconcile-15s.';
