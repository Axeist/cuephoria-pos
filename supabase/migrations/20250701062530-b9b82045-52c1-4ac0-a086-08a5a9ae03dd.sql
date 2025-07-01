
-- Create investment_partners table
CREATE TABLE public.investment_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  investment_amount numeric NOT NULL DEFAULT 0,
  investment_date date NOT NULL,
  equity_percentage numeric,
  partnership_type text NOT NULL DEFAULT 'investor',
  status text NOT NULL DEFAULT 'active',
  notes text,
  contact_person text,
  address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create investment_transactions table
CREATE TABLE public.investment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.investment_partners(id) ON DELETE CASCADE,
  transaction_type text NOT NULL, -- 'investment', 'dividend', 'withdrawal', 'return'
  amount numeric NOT NULL,
  transaction_date date NOT NULL,
  description text,
  reference_number text,
  status text NOT NULL DEFAULT 'completed',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_investment_partners_status ON public.investment_partners(status);
CREATE INDEX idx_investment_partners_type ON public.investment_partners(partnership_type);
CREATE INDEX idx_investment_transactions_partner_id ON public.investment_transactions(partner_id);
CREATE INDEX idx_investment_transactions_type ON public.investment_transactions(transaction_type);
CREATE INDEX idx_investment_transactions_date ON public.investment_transactions(transaction_date);

-- Add RLS policies (though this appears to be an admin-only system based on the existing structure)
ALTER TABLE public.investment_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations for now (since this seems to be admin-only)
CREATE POLICY "Allow all operations on investment_partners" ON public.investment_partners
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on investment_transactions" ON public.investment_transactions
  FOR ALL USING (true) WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_investment_partners_updated_at 
  BEFORE UPDATE ON public.investment_partners 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_transactions_updated_at 
  BEFORE UPDATE ON public.investment_transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
