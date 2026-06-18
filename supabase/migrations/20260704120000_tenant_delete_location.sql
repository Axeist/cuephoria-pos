-- Tenant branch deletion: purge all branch data or migrate to the org's main branch.
-- Called from /api/tenant/locations (service role) after owner/admin confirmation.

CREATE OR REPLACE FUNCTION public._resolve_org_main_location_id(p_org_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT id FROM public.locations
      WHERE organization_id = p_org_id AND slug = 'main'
      ORDER BY sort_order ASC
      LIMIT 1),
    (SELECT id FROM public.locations
      WHERE organization_id = p_org_id
      ORDER BY sort_order ASC, created_at ASC
      LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public._merge_branch_customers_into_main(
  p_source_location_id UUID,
  p_main_location_id UUID
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_pair RECORD;
  v_merged INT := 0;
  v_dup_loyalty INT;
  v_dup_spent NUMERIC;
  v_dup_play INT;
BEGIN
  FOR v_pair IN
    SELECT c.id AS dup_id, m.id AS keep_id
    FROM public.customers c
    INNER JOIN public.customers m
      ON m.phone = c.phone AND m.location_id = p_main_location_id
    WHERE c.location_id = p_source_location_id
  LOOP
    SELECT loyalty_points, total_spent, total_play_time
      INTO v_dup_loyalty, v_dup_spent, v_dup_play
    FROM public.customers
    WHERE id = v_pair.dup_id;

    UPDATE public.bookings SET customer_id = v_pair.keep_id WHERE customer_id = v_pair.dup_id;
    UPDATE public.bills SET customer_id = v_pair.keep_id WHERE customer_id = v_pair.dup_id;
    UPDATE public.sessions SET customer_id = v_pair.keep_id WHERE customer_id = v_pair.dup_id;
    UPDATE public.saved_carts SET customer_id = v_pair.keep_id WHERE customer_id = v_pair.dup_id;
    UPDATE public.loyalty_transactions SET customer_id = v_pair.keep_id WHERE customer_id = v_pair.dup_id;
    UPDATE public.reward_redemptions SET customer_id = v_pair.keep_id WHERE customer_id = v_pair.dup_id;
    UPDATE public.referrals SET customer_id = v_pair.keep_id WHERE customer_id = v_pair.dup_id;

    IF to_regclass('public.payment_orders') IS NOT NULL THEN
      EXECUTE 'UPDATE public.payment_orders SET customer_id = $1 WHERE customer_id = $2'
        USING v_pair.keep_id, v_pair.dup_id;
    END IF;

    UPDATE public.customers
    SET
      loyalty_points = COALESCE(loyalty_points, 0) + COALESCE(v_dup_loyalty, 0),
      total_spent = COALESCE(total_spent, 0) + COALESCE(v_dup_spent, 0),
      total_play_time = COALESCE(total_play_time, 0) + COALESCE(v_dup_play, 0),
      is_member = is_member OR (SELECT is_member FROM public.customers WHERE id = v_pair.dup_id)
    WHERE id = v_pair.keep_id;

    DELETE FROM public.customers WHERE id = v_pair.dup_id;
    v_merged := v_merged + 1;
  END LOOP;

  UPDATE public.customers
  SET location_id = p_main_location_id
  WHERE location_id = p_source_location_id;

  RETURN v_merged;
END;
$$;

CREATE OR REPLACE FUNCTION public._purge_location_operational_data(p_location_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_tbl TEXT;
  v_deleted INT;
  v_counts JSONB := '{}'::JSONB;
  v_delete_order TEXT[] := ARRAY[
    'booking_views',
    'bill_items',
    'cash_transactions',
    'saved_carts',
    'loyalty_transactions',
    'reward_redemptions',
    'referrals',
    'customer_offer_assignments',
    'tournament_winner_images',
    'tournament_winners',
    'tournament_history',
    'tournament_public_registrations',
    'tournament_registrations',
    'bookings',
    'sessions',
    'slot_blocks',
    'bills',
    'cafe_order_items',
    'cafe_kot',
    'cafe_settlements',
    'cafe_orders',
    'cafe_menu_items',
    'cafe_menu_categories',
    'cafe_tables',
    'cafe_users',
    'cafe_partners',
    'payment_orders',
    'customers',
    'products',
    'station_id_migrations',
    'station_types',
    'stations',
    'categories',
    'expenses',
    'cash_vault_transactions',
    'cash_bank_deposits',
    'cash_deposits',
    'cash_summary',
    'cash_vault',
    'shop_cash_ledger',
    'shop_cash_balances',
    'investment_transactions',
    'investment_partners',
    'tournaments',
    'offers',
    'promotions',
    'rewards',
    'customer_offers',
    'staff_attendance',
    'staff_leave_requests',
    'staff_work_schedules',
    'notifications',
    'email_templates',
    'notification_templates',
    'booking_settings',
    'location_settings'
  ];
BEGIN
  FOREACH v_tbl IN ARRAY v_delete_order LOOP
    IF to_regclass(format('public.%I', v_tbl)) IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = v_tbl AND column_name = 'location_id'
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('WITH d AS (DELETE FROM public.%I WHERE location_id = $1 RETURNING 1) SELECT COUNT(*) FROM d', v_tbl)
      INTO v_deleted
      USING p_location_id;

    IF v_deleted > 0 THEN
      v_counts := v_counts || jsonb_build_object(v_tbl, v_deleted);
    END IF;
  END LOOP;

  IF to_regclass('public.staff_profiles') IS NOT NULL THEN
    UPDATE public.staff_profiles
    SET location_id = public._resolve_org_main_location_id(
      (SELECT organization_id FROM public.locations WHERE id = p_location_id)
    )
    WHERE location_id = p_location_id;
  END IF;

  DELETE FROM public.admin_user_locations WHERE location_id = p_location_id;

  RETURN v_counts;
END;
$$;

CREATE OR REPLACE FUNCTION public._migrate_location_data_to_main(
  p_source_location_id UUID,
  p_main_location_id UUID,
  p_branch_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_tbl TEXT;
  v_updated INT;
  v_counts JSONB := '{}'::JSONB;
  v_merged_customers INT;
  v_migrate_tables TEXT[] := ARRAY[
    'booking_views',
    'bill_items',
    'cash_transactions',
    'loyalty_transactions',
    'reward_redemptions',
    'referrals',
    'customer_offer_assignments',
    'tournament_winner_images',
    'tournament_winners',
    'tournament_history',
    'tournament_public_registrations',
    'tournament_registrations',
    'bookings',
    'sessions',
    'slot_blocks',
    'bills',
    'payment_orders',
    'products',
    'station_id_migrations',
    'station_types',
    'stations',
    'categories',
    'expenses',
    'cash_vault_transactions',
    'cash_bank_deposits',
    'cash_deposits',
    'cash_summary',
    'shop_cash_ledger',
    'investment_transactions',
    'investment_partners',
    'tournaments',
    'offers',
    'promotions',
    'rewards',
    'customer_offers',
    'staff_attendance',
    'staff_leave_requests',
    'staff_work_schedules',
    'notifications',
    'email_templates',
    'notification_templates',
    'cafe_menu_items',
    'cafe_menu_categories',
    'cafe_tables',
    'cafe_orders',
    'cafe_partners',
    'cafe_users'
  ];
BEGIN
  v_merged_customers := public._merge_branch_customers_into_main(p_source_location_id, p_main_location_id);
  v_counts := v_counts || jsonb_build_object('customers_merged', v_merged_customers);

  -- One row per branch: merge balances into main, then drop the source row.
  IF to_regclass('public.shop_cash_balances') IS NOT NULL THEN
    UPDATE public.shop_cash_balances main
    SET
      till_amount = COALESCE(main.till_amount, 0) + COALESCE(src.till_amount, 0),
      piggy_amount = COALESCE(main.piggy_amount, 0) + COALESCE(src.piggy_amount, 0),
      updated_at = now()
    FROM public.shop_cash_balances src
    WHERE main.location_id = p_main_location_id
      AND src.location_id = p_source_location_id;
    DELETE FROM public.shop_cash_balances WHERE location_id = p_source_location_id;
  END IF;

  IF to_regclass('public.cash_vault') IS NOT NULL THEN
    UPDATE public.cash_vault main
    SET current_amount = COALESCE(main.current_amount, 0) + COALESCE(src.current_amount, 0)
    FROM public.cash_vault src
    WHERE main.location_id = p_main_location_id
      AND src.location_id = p_source_location_id;
    DELETE FROM public.cash_vault WHERE location_id = p_source_location_id;
  END IF;

  IF to_regclass('public.saved_carts') IS NOT NULL THEN
    DELETE FROM public.saved_carts WHERE location_id = p_source_location_id;
  END IF;

  -- Resolve category name collisions before moving rows to main.
  UPDATE public.categories c
  SET name = LEFT(c.name || ' (' || LEFT(p_branch_name, 40) || ')', 200)
  WHERE c.location_id = p_source_location_id
    AND EXISTS (
      SELECT 1 FROM public.categories m
      WHERE m.location_id = p_main_location_id AND m.name = c.name
    );

  UPDATE public.station_types st
  SET slug = st.slug || '-migrated'
  WHERE st.location_id = p_source_location_id
    AND EXISTS (
      SELECT 1 FROM public.station_types m
      WHERE m.location_id = p_main_location_id AND m.slug = st.slug
    );

  FOREACH v_tbl IN ARRAY v_migrate_tables LOOP
    IF to_regclass(format('public.%I', v_tbl)) IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = v_tbl AND column_name = 'location_id'
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'WITH u AS (UPDATE public.%I SET location_id = $1 WHERE location_id = $2 RETURNING 1) SELECT COUNT(*) FROM u',
      v_tbl
    )
      INTO v_updated
      USING p_main_location_id, p_source_location_id;

    IF v_updated > 0 THEN
      v_counts := v_counts || jsonb_build_object(v_tbl, v_updated);
    END IF;
  END LOOP;

  IF to_regclass('public.staff_profiles') IS NOT NULL THEN
    UPDATE public.staff_profiles
    SET location_id = p_main_location_id
    WHERE location_id = p_source_location_id;
  END IF;

  DELETE FROM public.booking_settings WHERE location_id = p_source_location_id;
  DELETE FROM public.location_settings WHERE location_id = p_source_location_id;
  DELETE FROM public.admin_user_locations WHERE location_id = p_source_location_id;

  RETURN v_counts;
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_delete_location(
  p_org_id UUID,
  p_location_id UUID,
  p_mode TEXT,
  p_confirm_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loc public.locations%ROWTYPE;
  v_main_id UUID;
  v_location_count INT;
  v_counts JSONB;
BEGIN
  IF p_mode NOT IN ('delete_all', 'migrate_to_main') THEN
    RAISE EXCEPTION 'Invalid mode. Use delete_all or migrate_to_main.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_loc
  FROM public.locations
  WHERE id = p_location_id AND organization_id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Branch not found for this workspace.' USING ERRCODE = 'no_data_found';
  END IF;

  IF lower(trim(p_confirm_name)) <> lower(trim(v_loc.name)) THEN
    RAISE EXCEPTION 'Confirmation name does not match branch name "%".', v_loc.name
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COUNT(*) INTO v_location_count
  FROM public.locations
  WHERE organization_id = p_org_id;

  IF v_location_count <= 1 THEN
    RAISE EXCEPTION 'Cannot delete the only branch in this workspace.' USING ERRCODE = 'check_violation';
  END IF;

  v_main_id := public._resolve_org_main_location_id(p_org_id);
  IF v_main_id IS NULL THEN
    RAISE EXCEPTION 'No main branch found for this workspace.' USING ERRCODE = 'check_violation';
  END IF;

  IF p_location_id = v_main_id THEN
    RAISE EXCEPTION 'The main branch cannot be deleted. Delete another branch or contact support.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_mode = 'migrate_to_main' THEN
    v_counts := public._migrate_location_data_to_main(p_location_id, v_main_id, v_loc.name);
  ELSE
    v_counts := public._purge_location_operational_data(p_location_id);
  END IF;

  DELETE FROM public.locations WHERE id = p_location_id AND organization_id = p_org_id;

  RETURN jsonb_build_object(
    'location_id', p_location_id,
    'location_name', v_loc.name,
    'mode', p_mode,
    'main_location_id', v_main_id,
    'counts', v_counts
  );
END;
$$;

COMMENT ON FUNCTION public.tenant_delete_location(UUID, UUID, TEXT, TEXT) IS
  'Owner/admin branch deletion: delete_all wipes branch data; migrate_to_main moves rows to the org main branch (merging duplicate customers by phone).';

REVOKE ALL ON FUNCTION public.tenant_delete_location(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tenant_delete_location(UUID, UUID, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.tenant_delete_location(UUID, UUID, TEXT, TEXT) FROM authenticated;
