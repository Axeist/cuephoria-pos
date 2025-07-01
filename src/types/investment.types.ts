
export interface InvestmentPartner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  investment_amount: number;
  investment_date: string;
  equity_percentage?: number;
  partnership_type: 'investor' | 'partner' | 'advisor' | 'other';
  status: 'active' | 'inactive' | 'pending' | 'exited';
  notes?: string;
  contact_person?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface InvestmentTransaction {
  id: string;
  partner_id: string;
  transaction_type: 'investment' | 'dividend' | 'withdrawal' | 'return';
  amount: number;
  transaction_date: string;
  description?: string;
  reference_number?: string;
  status: 'completed' | 'pending' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvestmentSummary {
  totalInvestment: number;
  totalReturns: number;
  activePartners: number;
  totalEquity: number;
  monthlyGrowth: number;
  averageInvestment: number;
}
