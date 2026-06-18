-- Fix migrate_station_data: dedupe slot_blocks (and conflicting bookings) before repointing.

CREATE OR REPLACE FUNCTION public.migrate_station_data(
  p_old_ids UUID[],
  p_new_station_id UUID,
  p_migrated_by TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_location_id UUID;
  v_new_org_id UUID;
  v_old_id UUID;
  v_old_name TEXT;
  v_old_location_id UUID;
  v_migrated_count INT := 0;
  v_sessions_updated INT := 0;
  v_bookings_updated INT := 0;
  v_slot_blocks_updated INT := 0;
  v_slot_blocks_dropped INT := 0;
BEGIN
  IF p_old_ids IS NULL OR array_length(p_old_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Select at least one legacy station to migrate';
  END IF;

  IF p_new_station_id = ANY(p_old_ids) THEN
    RAISE EXCEPTION 'Target station cannot also be in the legacy list';
  END IF;

  SELECT location_id, organization_id
  INTO v_new_location_id, v_new_org_id
  FROM public.stations
  WHERE id = p_new_station_id;

  IF v_new_location_id IS NULL THEN
    RAISE EXCEPTION 'Target station not found';
  END IF;

  IF v_new_org_id IS NULL THEN
    SELECT organization_id INTO v_new_org_id
    FROM public.locations
    WHERE id = v_new_location_id;
  END IF;

  IF v_new_org_id IS NULL THEN
    RAISE EXCEPTION 'Could not resolve organization for target station';
  END IF;

  FOREACH v_old_id IN ARRAY p_old_ids LOOP
    SELECT name, location_id INTO v_old_name, v_old_location_id
    FROM public.stations WHERE id = v_old_id;

    IF v_old_name IS NULL THEN
      RAISE EXCEPTION 'Legacy station not found: %', v_old_id;
    END IF;

    IF v_old_location_id IS DISTINCT FROM v_new_location_id THEN
      RAISE EXCEPTION
        'Station "%" belongs to a different branch than the target. Switch to that branch or pick stations from the same location.',
        v_old_name;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.sessions s
      WHERE s.station_id = v_old_id
        AND s.end_time IS NULL
    ) THEN
      RAISE EXCEPTION
        'Station "%" still has an active session — end it before migrating',
        v_old_name;
    END IF;
  END LOOP;

  UPDATE public.stations st
  SET is_occupied = false, currentsession = NULL
  WHERE st.id = ANY(p_old_ids)
    AND st.is_occupied = true
    AND NOT EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.station_id = st.id AND s.end_time IS NULL
    );

  UPDATE public.sessions
  SET station_id = p_new_station_id
  WHERE station_id = ANY(p_old_ids);
  GET DIAGNOSTICS v_sessions_updated = ROW_COUNT;

  -- Drop legacy live bookings that would collide on the target station.
  DELETE FROM public.bookings b
  WHERE b.station_id = ANY(p_old_ids)
    AND b.status IN ('confirmed', 'in-progress')
    AND EXISTS (
      SELECT 1
      FROM public.bookings existing
      WHERE existing.station_id = p_new_station_id
        AND existing.location_id = b.location_id
        AND existing.booking_date = b.booking_date
        AND existing.start_time = b.start_time
        AND existing.status IN ('confirmed', 'in-progress')
    );

  WITH ranked AS (
    SELECT b.id,
      ROW_NUMBER() OVER (
        PARTITION BY b.location_id, b.booking_date, b.start_time
        ORDER BY
          CASE b.status
            WHEN 'confirmed' THEN 1
            WHEN 'in-progress' THEN 2
            ELSE 3
          END,
          b.created_at DESC NULLS LAST,
          b.id DESC
      ) AS rn
    FROM public.bookings b
    WHERE b.station_id = ANY(p_old_ids)
      AND b.status IN ('confirmed', 'in-progress')
  )
  DELETE FROM public.bookings b
  USING ranked r
  WHERE b.id = r.id
    AND r.rn > 1;

  UPDATE public.bookings
  SET station_id = p_new_station_id
  WHERE station_id = ANY(p_old_ids);
  GET DIAGNOSTICS v_bookings_updated = ROW_COUNT;

  IF to_regclass('public.slot_blocks') IS NOT NULL THEN
    -- Expired holds on legacy rows are safe to discard.
    DELETE FROM public.slot_blocks
    WHERE station_id = ANY(p_old_ids)
      AND is_confirmed = false
      AND expires_at < now();

    -- Drop legacy blocks that duplicate an existing target block.
    DELETE FROM public.slot_blocks old_sb
    WHERE old_sb.station_id = ANY(p_old_ids)
      AND EXISTS (
        SELECT 1
        FROM public.slot_blocks existing
        WHERE existing.station_id = p_new_station_id
          AND existing.booking_date = old_sb.booking_date
          AND existing.start_time = old_sb.start_time
          AND existing.end_time = old_sb.end_time
      );
    GET DIAGNOSTICS v_slot_blocks_dropped = ROW_COUNT;

    -- Collapse duplicate legacy blocks (multiple controllers, same slot key).
    WITH ranked AS (
      SELECT sb.id,
        ROW_NUMBER() OVER (
          PARTITION BY sb.booking_date, sb.start_time, sb.end_time
          ORDER BY
            sb.is_confirmed DESC,
            sb.blocked_at DESC NULLS LAST,
            sb.id DESC
        ) AS rn
      FROM public.slot_blocks sb
      WHERE sb.station_id = ANY(p_old_ids)
    )
    DELETE FROM public.slot_blocks sb
    USING ranked r
    WHERE sb.id = r.id
      AND r.rn > 1;

    UPDATE public.slot_blocks
    SET station_id = p_new_station_id
    WHERE station_id = ANY(p_old_ids);
    GET DIAGNOSTICS v_slot_blocks_updated = ROW_COUNT;
  END IF;

  IF to_regclass('public.cafe_orders') IS NOT NULL THEN
    UPDATE public.cafe_orders
    SET station_id = p_new_station_id
    WHERE station_id = ANY(p_old_ids);
  END IF;

  FOREACH v_old_id IN ARRAY p_old_ids LOOP
    SELECT name INTO v_old_name FROM public.stations WHERE id = v_old_id;

    INSERT INTO public.station_id_migrations (
      organization_id, location_id, old_station_id, new_station_id,
      old_station_name, migrated_by
    ) VALUES (
      v_new_org_id, v_new_location_id, v_old_id, p_new_station_id,
      v_old_name, p_migrated_by
    );

    DELETE FROM public.stations WHERE id = v_old_id;
    v_migrated_count := v_migrated_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'migrated_stations', v_migrated_count,
    'sessions_updated', v_sessions_updated,
    'bookings_updated', v_bookings_updated,
    'slot_blocks_updated', v_slot_blocks_updated,
    'slot_blocks_dropped', v_slot_blocks_dropped,
    'new_station_id', p_new_station_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.migrate_station_data(UUID[], UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.migrate_station_data(UUID[], UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.migrate_station_data(UUID[], UUID, TEXT) TO service_role;
