-- Add status and comp_note to bills if missing (fixes 500 when loading bills/Reports)
-- The app inserts and selects these columns; missing columns can cause PostgREST 500.

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed'
    CHECK (status IN ('completed', 'complimentary'));

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS comp_note TEXT;

COMMENT ON COLUMN public.bills.status IS 'Bill status: completed or complimentary';
COMMENT ON COLUMN public.bills.comp_note IS 'Optional note for complimentary bills';
