-- Shop physical cash: till + piggy bank, append-only ledger (per location).
-- Drops legacy cash_vault mutation triggers so the old incorrect balance logic cannot run.

DROP TRIGGER IF EXISTS trigger_update_cash_vault ON public.cash_vault_transactions;
DROP TRIGGER IF EXISTS trigger_reverse_cash_vault_on_delete ON public.cash_vault_transactions;
DROP FUNCTION IF EXISTS public.update_cash_vault();
DROP FUNCTION IF EXISTS public.reverse_cash_vault_on_delete();

CREATE TABLE IF NOT EXISTS public.shop_cash_balances (
  location_id uuid PRIMARY KEY REFERENCES public.locations (id) ON DELETE CASCADE,
  till_amount numeric NOT NULL DEFAULT 0 CHECK (till_amount >= 0),
  piggy_amount numeric NOT NULL DEFAULT 0 CHECK (piggy_amount >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_shop_cash_balances_updated ON public.shop_cash_balances (updated_at DESC);

INSERT INTO public.shop_cash_balances (location_id, till_amount, piggy_amount, updated_by)
SELECT l.id, 0, 0, 'migration'
FROM public.locations l
WHERE NOT EXISTS (SELECT 1 FROM public.shop_cash_balances b WHERE b.location_id = l.id)
ON CONFLICT (location_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.shop_cash_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  entry_kind text NOT NULL CHECK (entry_kind IN (
    'till_top_up',
    'till_adjustment',
    'till_to_piggy_owner',
    'till_to_piggy_cash_expense',
    'till_bank_deposit',
    'piggy_bank_deposit',
    'piggy_to_till_return',
    'reversal'
  )),
  delta_till numeric NOT NULL,
  delta_piggy numeric NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  notes text,
  bank_reference text,
  owner text,
  reverses_ledger_id uuid REFERENCES public.shop_cash_ledger (id) ON DELETE SET NULL,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system',
  CONSTRAINT shop_cash_ledger_delta_nonzero CHECK (delta_till <> 0 OR delta_piggy <> 0)
);

CREATE INDEX IF NOT EXISTS idx_shop_cash_ledger_location_created ON public.shop_cash_ledger (location_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_cash_ledger_idempotency
  ON public.shop_cash_ledger (location_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.shop_cash_ledger_apply()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cur_t numeric;
  cur_p numeric;
BEGIN
  INSERT INTO public.shop_cash_balances (location_id, till_amount, piggy_amount, updated_at, updated_by)
  VALUES (NEW.location_id, 0, 0, now(), NEW.created_by)
  ON CONFLICT (location_id) DO NOTHING;

  SELECT b.till_amount, b.piggy_amount
  INTO cur_t, cur_p
  FROM public.shop_cash_balances b
  WHERE b.location_id = NEW.location_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'shop_cash: missing balance row for location %', NEW.location_id;
  END IF;

  cur_t := cur_t + NEW.delta_till;
  cur_p := cur_p + NEW.delta_piggy;

  IF cur_t < 0 OR cur_p < 0 THEN
    RAISE EXCEPTION 'shop_cash: insufficient balance (till %, piggy % after movement)', cur_t, cur_p
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.shop_cash_balances
  SET
    till_amount = cur_t,
    piggy_amount = cur_p,
    updated_at = now(),
    updated_by = NEW.created_by
  WHERE location_id = NEW.location_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shop_cash_ledger_apply_trigger ON public.shop_cash_ledger;
CREATE TRIGGER shop_cash_ledger_apply_trigger
  AFTER INSERT ON public.shop_cash_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.shop_cash_ledger_apply();

ALTER TABLE public.shop_cash_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_cash_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Allow all shop_cash_balances"
    ON public.shop_cash_balances FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow all shop_cash_ledger"
    ON public.shop_cash_ledger FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
