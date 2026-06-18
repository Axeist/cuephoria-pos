-- Global staff notifications: persisted in DB, synced via Realtime to all POS clients.

CREATE TABLE IF NOT EXISTS public.staff_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  location_id     UUID NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('booking', 'session')),
  alert_type      TEXT NOT NULL,
  dedupe_key      TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT staff_notifications_dedupe_key_unique UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_staff_notifications_location_created
  ON public.staff_notifications (location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_notifications_location_unread
  ON public.staff_notifications (location_id, is_read)
  WHERE is_read = false;

COMMENT ON TABLE public.staff_notifications IS
  'Branch-scoped staff alerts (bookings, session timeouts). Global read state; broadcast via Realtime.';

-- Auto-fill organization_id from location when missing.
DROP TRIGGER IF EXISTS trg_fill_staff_notifications_org ON public.staff_notifications;
CREATE TRIGGER trg_fill_staff_notifications_org
  BEFORE INSERT OR UPDATE OF location_id, organization_id ON public.staff_notifications
  FOR EACH ROW EXECUTE FUNCTION public.fill_organization_id_from_location();

-- ---------------------------------------------------------------------------
-- Booking INSERT → staff notification (payload includes station + customer)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_staff_on_booking_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_station_name  TEXT;
  v_station_type  TEXT;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_customer_email TEXT;
  v_customer_created TIMESTAMPTZ;
  v_org_id        UUID;
  v_is_paid       BOOLEAN;
  v_payload       JSONB;
BEGIN
  IF NEW.location_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT s.name, s.type
    INTO v_station_name, v_station_type
  FROM public.stations s
  WHERE s.id = NEW.station_id;

  SELECT c.name, c.phone, c.email, c.created_at
    INTO v_customer_name, v_customer_phone, v_customer_email, v_customer_created
  FROM public.customers c
  WHERE c.id = NEW.customer_id;

  v_org_id := NEW.organization_id;
  IF v_org_id IS NULL THEN
    SELECT organization_id INTO v_org_id
    FROM public.locations
    WHERE id = NEW.location_id;
  END IF;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_paid := NEW.payment_mode IS NOT NULL
    AND NEW.payment_mode <> 'venue'
    AND NEW.payment_txn_id IS NOT NULL;

  v_payload := jsonb_build_object(
    'isPaid', v_is_paid,
    'booking', jsonb_build_object(
      'id', NEW.id,
      'booking_date', NEW.booking_date,
      'start_time', NEW.start_time,
      'end_time', NEW.end_time,
      'duration', NEW.duration,
      'status', NEW.status,
      'notes', NEW.notes,
      'original_price', NEW.original_price,
      'final_price', NEW.final_price,
      'discount_percentage', NEW.discount_percentage,
      'coupon_code', NEW.coupon_code,
      'booking_group_id', NEW.booking_group_id,
      'status_updated_at', NEW.status_updated_at,
      'status_updated_by', NEW.status_updated_by,
      'payment_mode', NEW.payment_mode,
      'payment_txn_id', NEW.payment_txn_id,
      'location_id', NEW.location_id,
      'created_at', NEW.created_at,
      'booking_views', '[]'::jsonb,
      'station', jsonb_build_object(
        'name', COALESCE(v_station_name, 'Unknown'),
        'type', COALESCE(v_station_type, 'unknown')
      ),
      'customer', jsonb_build_object(
        'name', COALESCE(v_customer_name, 'Unknown'),
        'phone', COALESCE(v_customer_phone, ''),
        'email', v_customer_email,
        'created_at', v_customer_created
      )
    )
  );

  INSERT INTO public.staff_notifications (
    organization_id,
    location_id,
    kind,
    alert_type,
    dedupe_key,
    payload
  )
  VALUES (
    v_org_id,
    NEW.location_id,
    'booking',
    'new_booking',
    'booking:' || NEW.id::text,
    v_payload
  )
  ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_staff_on_booking_insert ON public.bookings;
CREATE TRIGGER trg_notify_staff_on_booking_insert
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_staff_on_booking_insert();

-- ---------------------------------------------------------------------------
-- Session + unsettled checkout alerts (called periodically from POS clients)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_staff_session_notifications(p_location_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row           RECORD;
  v_billable_ms   BIGINT;
  v_remaining_ms  BIGINT;
  v_mins_left     INTEGER;
  v_overdue_min   INTEGER;
  v_waiting_min   INTEGER;
  v_customer_name TEXT;
  v_message       TEXT;
  v_payload       JSONB;
  v_inserted      INTEGER := 0;
  v_org_id        UUID;
  -- Match src/utils/sessionStaffNotifications.ts
  c_ending_soon_ms       CONSTANT BIGINT := 5 * 60 * 1000;
  c_overdue_threshold_ms CONSTANT BIGINT := 10 * 60 * 1000;
  c_unsettled_ms         CONSTANT BIGINT := 10 * 60 * 1000;
BEGIN
  FOR v_row IN
    SELECT
      s.id AS session_id,
      s.station_id,
      s.customer_id,
      s.location_id,
      s.organization_id,
      s.planned_duration_minutes,
      st.name AS station_name,
      COALESCE(c.name, 'Walk-in session') AS customer_name,
      GREATEST(
        0,
        (EXTRACT(EPOCH FROM (now() - s.start_time)) * 1000)::bigint
          - COALESCE(s.total_paused_time, 0)
          - CASE
              WHEN s.is_paused AND s.paused_at IS NOT NULL
              THEN (EXTRACT(EPOCH FROM (now() - s.paused_at)) * 1000)::bigint
              ELSE 0
            END
      ) AS billable_ms
    FROM public.sessions s
    JOIN public.stations st ON st.id = s.station_id
    LEFT JOIN public.customers c ON c.id = s.customer_id
    WHERE s.end_time IS NULL
      AND s.planned_duration_minutes IS NOT NULL
      AND s.planned_duration_minutes > 0
      AND (p_location_id IS NULL OR s.location_id = p_location_id)
  LOOP
    v_billable_ms := v_row.billable_ms;
    v_remaining_ms := (v_row.planned_duration_minutes * 60 * 1000) - v_billable_ms;
    v_org_id := v_row.organization_id;
    IF v_org_id IS NULL THEN
      SELECT organization_id INTO v_org_id
      FROM public.locations
      WHERE id = v_row.location_id;
    END IF;

    IF v_org_id IS NULL OR v_row.location_id IS NULL THEN
      CONTINUE;
    END IF;

    IF v_remaining_ms > 0 AND v_remaining_ms <= c_ending_soon_ms THEN
      v_mins_left := GREATEST(1, CEIL(v_remaining_ms::numeric / 60000));
      v_message := v_row.station_name || ' has ~' || v_mins_left
        || ' min left on a ' || v_row.planned_duration_minutes || ' min session.';
      v_payload := jsonb_build_object(
        'alertType', 'ending_soon',
        'sessionId', v_row.session_id,
        'stationId', v_row.station_id,
        'customerId', v_row.customer_id,
        'stationName', v_row.station_name,
        'customerName', v_row.customer_name,
        'message', v_message
      );

      INSERT INTO public.staff_notifications (
        organization_id, location_id, kind, alert_type, dedupe_key, payload
      )
      VALUES (
        v_org_id,
        v_row.location_id,
        'session',
        'ending_soon',
        'ending_soon:' || v_row.session_id::text,
        v_payload
      )
      ON CONFLICT (dedupe_key) DO NOTHING;

      GET DIAGNOSTICS v_mins_left = ROW_COUNT;
      IF v_mins_left > 0 THEN
        v_inserted := v_inserted + 1;
      END IF;
    END IF;

    IF v_remaining_ms <= -c_overdue_threshold_ms THEN
      v_overdue_min := CEIL(ABS(v_remaining_ms)::numeric / 60000);
      v_message := v_row.station_name || ' is ' || v_overdue_min
        || ' min past planned end — end the session and send to POS.';
      v_payload := jsonb_build_object(
        'alertType', 'overdue_active',
        'sessionId', v_row.session_id,
        'stationId', v_row.station_id,
        'customerId', v_row.customer_id,
        'stationName', v_row.station_name,
        'customerName', v_row.customer_name,
        'message', v_message
      );

      INSERT INTO public.staff_notifications (
        organization_id, location_id, kind, alert_type, dedupe_key, payload
      )
      VALUES (
        v_org_id,
        v_row.location_id,
        'session',
        'overdue_active',
        'overdue_active:' || v_row.session_id::text,
        v_payload
      )
      ON CONFLICT (dedupe_key) DO NOTHING;

      GET DIAGNOSTICS v_mins_left = ROW_COUNT;
      IF v_mins_left > 0 THEN
        v_inserted := v_inserted + 1;
      END IF;
    END IF;
  END LOOP;

  FOR v_row IN
    SELECT
      sc.id,
      sc.location_id,
      sc.organization_id,
      sc.customer_id,
      sc.customer_name,
      sc.updated_at
    FROM public.saved_carts sc
    WHERE (p_location_id IS NULL OR sc.location_id = p_location_id)
      AND sc.updated_at <= now() - (c_unsettled_ms || ' milliseconds')::interval
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(sc.items) elem
        WHERE elem->>'type' = 'session'
      )
  LOOP
    v_org_id := v_row.organization_id;
    IF v_org_id IS NULL THEN
      SELECT organization_id INTO v_org_id
      FROM public.locations
      WHERE id = v_row.location_id;
    END IF;

    IF v_org_id IS NULL OR v_row.location_id IS NULL THEN
      CONTINUE;
    END IF;

    v_waiting_min := FLOOR(EXTRACT(EPOCH FROM (now() - v_row.updated_at)) / 60);
    v_message := v_row.customer_name
      || '''s session bill has waited ' || v_waiting_min
      || ' min — complete checkout on POS.';

    v_payload := jsonb_build_object(
      'alertType', 'unsettled_checkout',
      'customerId', v_row.customer_id,
      'stationName', 'POS checkout',
      'customerName', v_row.customer_name,
      'message', v_message
    );

    INSERT INTO public.staff_notifications (
      organization_id, location_id, kind, alert_type, dedupe_key, payload
    )
    VALUES (
      v_org_id,
      v_row.location_id,
      'session',
      'unsettled_checkout',
      'unsettled_checkout:' || v_row.location_id::text || ':' || v_row.customer_id::text,
      v_payload
    )
    ON CONFLICT (dedupe_key) DO NOTHING;

    GET DIAGNOSTICS v_mins_left = ROW_COUNT;
    IF v_mins_left > 0 THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_staff_session_notifications(UUID) TO anon, authenticated, service_role;

-- RLS (staged permissive — matches saved_carts / bookings pattern)
ALTER TABLE public.staff_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staged_rls_allow_all_staff_notifications ON public.staff_notifications;
CREATE POLICY staged_rls_allow_all_staff_notifications ON public.staff_notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Realtime broadcast to all connected staff clients
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'staff_notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_notifications;
    END IF;
    ALTER TABLE public.staff_notifications REPLICA IDENTITY FULL;
  END IF;
END$$;
