-- Fix the create_cash_transaction_on_bill trigger function to include location_id.
-- The multi-location migration added location_id NOT NULL to cash_transactions, but the
-- original trigger function did not pass location_id, causing a NOT NULL violation on
-- every cash or split-cash bill.

CREATE OR REPLACE FUNCTION public.create_cash_transaction_on_bill()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_method = 'cash' OR (NEW.is_split_payment = true AND NEW.cash_amount > 0) THEN
    INSERT INTO public.cash_transactions (
      amount, transaction_type, description, bill_id, created_by, location_id
    ) VALUES (
      CASE WHEN NEW.payment_method = 'cash' THEN NEW.total ELSE NEW.cash_amount END,
      'sale',
      'Cash sale - Bill #' || NEW.id,
      NEW.id,
      'system',
      NEW.location_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
