-- Razorpay reconciler: slower + conditional pg_cron (Supabase-side) to cut Vercel Fluid CPU.
--
-- Before: HTTP to Vercel every 15s (~240/hr) even when no checkout in progress.
-- After:  check every 60s; call reconcile URL only when pending payment_orders exist.
--
-- reconcile URL can stay on Vercel OR move to a Supabase Edge Function on Pro:
--   https://<project-ref>.supabase.co/functions/v1/razorpay-reconcile
-- Set via: ALTER DATABASE postgres SET app.reconcile_url = '...';
--
-- Rollback: reschedule rzp-reconcile-15s from 20260602100000_payment_orders migration.

DO $$
BEGIN
  PERFORM cron.unschedule('rzp-reconcile-15s');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('rzp-reconcile-60s');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'rzp-reconcile-60s',
    '60 seconds',
    $cron$
      DO $job$
      DECLARE
        v_url text := current_setting('app.reconcile_url', true);
        v_secret text := current_setting('app.reconcile_secret', true);
        v_has_work boolean;
      BEGIN
        SELECT EXISTS (
          SELECT 1
          FROM public.payment_orders
          WHERE status IN ('created', 'pending')
            AND created_at > now() - interval '35 minutes'
          LIMIT 1
        ) INTO v_has_work;

        IF NOT v_has_work THEN
          UPDATE public.reconciler_heartbeat
          SET
            last_run_at = now(),
            last_source = 'pg_cron_skipped',
            last_scanned = 0
          WHERE id = 1;
          RETURN;
        END IF;

        IF v_url IS NULL OR v_url = '' OR v_secret IS NULL OR v_secret = '' THEN
          RETURN;
        END IF;

        PERFORM net.http_post(
          url     := v_url,
          headers := jsonb_build_object(
            'content-type', 'application/json',
            'x-cron-secret', v_secret
          ),
          body    := '{"source":"pg_cron"}'::jsonb,
          timeout_milliseconds := 8000
        );
      END $job$;
    $cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not schedule rzp-reconcile-60s: %', SQLERRM;
END $$;

COMMENT ON EXTENSION pg_cron IS
  'pg_cron — conditional Razorpay reconciler every 60s when pending payment_orders exist. Job: rzp-reconcile-60s.';
