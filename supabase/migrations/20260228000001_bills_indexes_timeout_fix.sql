-- Fix "canceling statement due to statement timeout" (57014) when loading bills.
-- The bills list query orders by created_at DESC and embeds bill_items; indexes make it fast.

CREATE INDEX IF NOT EXISTS idx_bills_created_at_desc
  ON public.bills (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id
  ON public.bill_items (bill_id);
