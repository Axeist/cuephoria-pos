-- Enable Row Level Security on tables that are missing it
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_bank_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_vault_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_summary ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies for these tables
CREATE POLICY "Allow all operations on categories" ON public.categories FOR ALL USING (true);
CREATE POLICY "Allow all operations on cash_vault" ON public.cash_vault FOR ALL USING (true);
CREATE POLICY "Allow all operations on cash_bank_deposits" ON public.cash_bank_deposits FOR ALL USING (true);
CREATE POLICY "Allow all operations on sessions" ON public.sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on expenses" ON public.expenses FOR ALL USING (true);
CREATE POLICY "Allow all operations on cash_vault_transactions" ON public.cash_vault_transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on tournament_stats" ON public.tournament_stats FOR ALL USING (true);