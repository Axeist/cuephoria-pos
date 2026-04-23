-- ============================================================================
-- One-off backfill: create the missing Razorpay bill for payment
-- pay_5h3LuEBYoZAmc4 (booking confirmation id 5A530C28).
--
-- Context
-- -------
-- The public booking success page inserted a `bookings` row for this payment
-- but the Razorpay webhook did not create the corresponding `bills` +
-- `bill_items` rows, so the transaction never appeared on the dashboard.
--
-- This script reconstructs the bill from the existing booking rows. It is
-- safe to run multiple times — it exits early if a bill_item for any of the
-- bookings already exists.
--
-- Run in Supabase SQL editor (service-role connection).
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_payment_txn_id   TEXT := 'pay_Sh3LuEBYoZAmc4';
  v_customer_id      UUID;
  v_location_id      UUID;
  v_booking_date     DATE;
  v_subtotal         NUMERIC := 0;
  v_total            NUMERIC := 0;
  v_discount_value   NUMERIC := 0;
  v_discount_pct     NUMERIC := 0;
  v_bill_id          UUID;
  v_exists_count     INT := 0;
BEGIN
  -- 1) Guard: do nothing if a bill_item for any of these bookings already exists.
  SELECT COUNT(*)
    INTO v_exists_count
  FROM public.bill_items bi
  JOIN public.bookings   b ON b.id = bi.item_id
  WHERE b.payment_txn_id = v_payment_txn_id
    AND bi.item_type = 'session';

  IF v_exists_count > 0 THEN
    RAISE NOTICE 'Bill already exists for payment %, skipping backfill.', v_payment_txn_id;
    RETURN;
  END IF;

  -- 2) Gather totals/metadata from the existing booking rows for this payment.
  --    MIN() is not defined for UUID, so pick a representative row for the
  --    id-typed fields and aggregate the numerics separately.
  SELECT customer_id, location_id, booking_date
    INTO v_customer_id, v_location_id, v_booking_date
  FROM public.bookings
  WHERE payment_txn_id = v_payment_txn_id
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  SELECT
    COALESCE(SUM(COALESCE(original_price, final_price)), 0),
    COALESCE(SUM(final_price), 0)
    INTO v_subtotal, v_total
  FROM public.bookings
  WHERE payment_txn_id = v_payment_txn_id;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'No bookings found for payment %', v_payment_txn_id;
  END IF;

  v_discount_value := GREATEST(0, v_subtotal - v_total);
  v_discount_pct   := CASE WHEN v_subtotal > 0
                           THEN (v_discount_value / v_subtotal) * 100
                           ELSE 0 END;

  -- 3) Insert the bill.
  INSERT INTO public.bills (
    customer_id,
    subtotal,
    discount,
    discount_value,
    discount_type,
    loyalty_points_used,
    loyalty_points_earned,
    total,
    payment_method,
    status,
    is_split_payment,
    cash_amount,
    upi_amount,
    location_id
  ) VALUES (
    v_customer_id,
    v_subtotal,
    v_discount_pct,
    v_discount_value,
    'fixed',
    0,
    0,
    v_total,
    'razorpay',
    'completed',
    FALSE,
    0,
    0,
    v_location_id
  )
  RETURNING id INTO v_bill_id;

  -- 4) Insert one bill_item per booking row (item_type 'session',
  --    item_id = booking.id — same convention the webhook uses).
  INSERT INTO public.bill_items (
    bill_id,
    item_id,
    name,
    price,
    quantity,
    total,
    item_type,
    location_id
  )
  SELECT
    v_bill_id,
    b.id,
    COALESCE(s.name, 'Station') || ' - ' ||
      to_char(b.booking_date, 'DD Mon YYYY') ||
      ' (' || b.start_time::text || ' - ' || b.end_time::text || ')',
    b.final_price,
    1,
    b.final_price,
    'session',
    v_location_id
  FROM public.bookings b
  LEFT JOIN public.stations s ON s.id = b.station_id
  WHERE b.payment_txn_id = v_payment_txn_id;

  -- 5) Best-effort customer total_spent bump.
  UPDATE public.customers
     SET total_spent = COALESCE(total_spent, 0) + v_total
   WHERE id = v_customer_id;

  RAISE NOTICE 'Backfilled bill % for payment % (customer %, total %).',
               v_bill_id, v_payment_txn_id, v_customer_id, v_total;
END
$$;

COMMIT;
