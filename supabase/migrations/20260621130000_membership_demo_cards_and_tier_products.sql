-- Demo NFC cards linked to demo members + tier retail product fields
-- Rollback: revert tier columns; DELETE demo customers/cards by phone 900000000%

ALTER TABLE public.membership_tiers
  ADD COLUMN IF NOT EXISTS retail_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_credit_on_purchase NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_duration TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS default_membership_hours INT NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products (id) ON DELETE SET NULL;

UPDATE public.membership_settings
SET feature_flags = feature_flags
  || jsonb_build_object(
    'nfc_cards_enabled', true,
    'nfc_simulation_enabled', true,
    'card_balance_enabled', true,
    'card_balance_payments_enabled', true
  )
WHERE COALESCE((feature_flags->>'module_enabled')::boolean, false) = true;

DO $$
DECLARE
  org_rec RECORD;
  cust_id UUID;
  tier_uuid UUID;
  loc_uuid UUID;
  card_row UUID;
  now_ts TIMESTAMPTZ := now();
  demo_uids TEXT[] := ARRAY['SIM-UID-001', 'AABBCCDD', 'SIM-UID-002', '11223344', 'DEADBEEF'];
  demo_phones TEXT[] := ARRAY['9000000001', '9000000002', '9000000003', '9000000004', '9000000005'];
  demo_names TEXT[] := ARRAY[
    'Demo Member Alpha',
    'Demo Member Beta',
    'Demo Member Gamma',
    'Demo Member Delta',
    'Demo Member Epsilon'
  ];
  demo_ids TEXT[] := ARRAY['DEMOALPHA', 'DEMOBETA', 'DEMOGAMMA', 'DEMODELTA', 'DEMOEPSLN'];
  balances NUMERIC[] := ARRAY[500, 250, 100, 100, 100];
  i INT;
BEGIN
  FOR org_rec IN
    SELECT DISTINCT ms.organization_id
    FROM public.membership_settings ms
    WHERE COALESCE((ms.feature_flags->>'module_enabled')::boolean, false) = true
  LOOP
    SELECT l.id INTO loc_uuid
    FROM public.locations l
    WHERE l.organization_id = org_rec.organization_id
    ORDER BY l.created_at ASC NULLS LAST, l.id ASC
    LIMIT 1;

    IF loc_uuid IS NULL THEN
      RAISE NOTICE 'Skipping demo seed for org % — no location', org_rec.organization_id;
      CONTINUE;
    END IF;

    SELECT id INTO tier_uuid
    FROM public.membership_tiers
    WHERE organization_id = org_rec.organization_id
    ORDER BY sort_order ASC, created_at ASC
    LIMIT 1;

    FOR i IN 1..5 LOOP
      INSERT INTO public.customers (
        organization_id,
        location_id,
        name,
        phone,
        custom_id,
        membership_tier_id,
        card_balance,
        created_at
      )
      SELECT
        org_rec.organization_id,
        loc_uuid,
        demo_names[i],
        demo_phones[i],
        demo_ids[i],
        tier_uuid,
        balances[i],
        now_ts
      WHERE NOT EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.organization_id = org_rec.organization_id
          AND c.location_id = loc_uuid
          AND c.phone = demo_phones[i]
      );

      SELECT c.id INTO cust_id
      FROM public.customers c
      WHERE c.organization_id = org_rec.organization_id
        AND c.location_id = loc_uuid
        AND c.phone = demo_phones[i]
      LIMIT 1;

      IF cust_id IS NULL THEN
        CONTINUE;
      END IF;

      -- Mirror display ID into customer_id when that optional column exists
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'customers'
          AND column_name = 'customer_id'
      ) THEN
        UPDATE public.customers
        SET customer_id = demo_ids[i]
        WHERE id = cust_id
          AND (customer_id IS NULL OR customer_id = '');
      END IF;

      IF tier_uuid IS NOT NULL THEN
        UPDATE public.customers
        SET membership_tier_id = tier_uuid
        WHERE id = cust_id AND membership_tier_id IS NULL;
      END IF;

      INSERT INTO public.membership_cards (
        organization_id,
        location_id,
        uid,
        status,
        customer_id,
        assigned_at,
        created_at,
        updated_at
      )
      VALUES (
        org_rec.organization_id,
        loc_uuid,
        demo_uids[i],
        'assigned',
        cust_id,
        now_ts,
        now_ts,
        now_ts
      )
      ON CONFLICT (organization_id, uid) DO UPDATE
      SET
        status = 'assigned',
        customer_id = EXCLUDED.customer_id,
        location_id = EXCLUDED.location_id,
        assigned_at = now_ts,
        updated_at = now_ts;

      SELECT mc.id INTO card_row
      FROM public.membership_cards mc
      WHERE mc.organization_id = org_rec.organization_id
        AND mc.uid = demo_uids[i]
      LIMIT 1;

      IF card_row IS NOT NULL THEN
        UPDATE public.customers
        SET active_card_id = card_row
        WHERE id = cust_id;
      END IF;
    END LOOP;
  END LOOP;
END $$;

COMMENT ON COLUMN public.membership_tiers.retail_price IS 'POS product price when tier is synced to products catalog';
COMMENT ON COLUMN public.membership_tiers.wallet_credit_on_purchase IS 'Prepaid wallet credit after POS tier purchase';
