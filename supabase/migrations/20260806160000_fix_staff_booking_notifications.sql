-- Fix booking staff notifications: resolve location from station, idempotent RPC fallback.

CREATE OR REPLACE FUNCTION public.ensure_staff_booking_notification(p_booking_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking         public.bookings%ROWTYPE;
  v_location_id     UUID;
  v_station_name    TEXT;
  v_station_type    TEXT;
  v_customer_name   TEXT;
  v_customer_phone  TEXT;
  v_customer_email  TEXT;
  v_customer_created TIMESTAMPTZ;
  v_org_id          UUID;
  v_is_paid         BOOLEAN;
  v_payload         JSONB;
  v_notification_id UUID;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_location_id := v_booking.location_id;
  IF v_location_id IS NULL AND v_booking.station_id IS NOT NULL THEN
    SELECT s.location_id INTO v_location_id
    FROM public.stations s
    WHERE s.id = v_booking.station_id;
  END IF;

  IF v_location_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT s.name, s.type
    INTO v_station_name, v_station_type
  FROM public.stations s
  WHERE s.id = v_booking.station_id;

  SELECT c.name, c.phone, c.email, c.created_at
    INTO v_customer_name, v_customer_phone, v_customer_email, v_customer_created
  FROM public.customers c
  WHERE c.id = v_booking.customer_id;

  v_org_id := v_booking.organization_id;
  IF v_org_id IS NULL THEN
    SELECT organization_id INTO v_org_id
    FROM public.locations
    WHERE id = v_location_id;
  END IF;

  IF v_org_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_is_paid := v_booking.payment_mode IS NOT NULL
    AND v_booking.payment_mode <> 'venue'
    AND v_booking.payment_txn_id IS NOT NULL;

  v_payload := jsonb_build_object(
    'isPaid', v_is_paid,
    'booking', jsonb_build_object(
      'id', v_booking.id,
      'booking_date', v_booking.booking_date,
      'start_time', v_booking.start_time,
      'end_time', v_booking.end_time,
      'duration', v_booking.duration,
      'status', v_booking.status,
      'notes', v_booking.notes,
      'original_price', v_booking.original_price,
      'final_price', v_booking.final_price,
      'discount_percentage', v_booking.discount_percentage,
      'coupon_code', v_booking.coupon_code,
      'booking_group_id', v_booking.booking_group_id,
      'status_updated_at', v_booking.status_updated_at,
      'status_updated_by', v_booking.status_updated_by,
      'payment_mode', v_booking.payment_mode,
      'payment_txn_id', v_booking.payment_txn_id,
      'location_id', v_location_id,
      'created_at', v_booking.created_at,
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
    v_location_id,
    'booking',
    'new_booking',
    'booking:' || v_booking.id::text,
    v_payload
  )
  ON CONFLICT (dedupe_key) DO NOTHING
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_staff_booking_notification(UUID) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.notify_staff_on_booking_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_staff_booking_notification(NEW.id);
  RETURN NEW;
END;
$$;

-- Backfill notifications for bookings from the last 24 hours (idempotent).
DO $$
DECLARE
  v_booking_id UUID;
BEGIN
  FOR v_booking_id IN
    SELECT b.id
    FROM public.bookings b
    WHERE b.created_at >= now() - interval '24 hours'
    ORDER BY b.created_at DESC
    LIMIT 500
  LOOP
    PERFORM public.ensure_staff_booking_notification(v_booking_id);
  END LOOP;
END;
$$;
