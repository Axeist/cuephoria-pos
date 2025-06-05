
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CashTransaction {
  id: string;
  amount: number;
  transaction_type: 'sale' | 'deposit' | 'withdrawal' | 'adjustment';
  description?: string;
  bill_id?: string;
  created_at: string;
  created_by: string;
}

interface CashDeposit {
  id: string;
  amount: number;
  deposit_date: string;
  bank_name?: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

interface CashSummary {
  id: string;
  date: string;
  opening_balance: number;
  total_sales: number;
  total_deposits: number;
  total_withdrawals: number;
  closing_balance: number;
  updated_at: string;
}

interface CashContextType {
  cashTransactions: CashTransaction[];
  cashDeposits: CashDeposit[];
  cashSummaries: CashSummary[];
  todayCashOnHand: number;
  loading: boolean;
  addDeposit: (deposit: Omit<CashDeposit, 'id' | 'created_at' | 'created_by'>) => Promise<void>;
  addTransaction: (transaction: Omit<CashTransaction, 'id' | 'created_at' | 'created_by'>) => Promise<void>;
  refreshCashData: () => Promise<void>;
}

const CashContext = createContext<CashContextType | undefined>(undefined);

export const CashProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [cashDeposits, setCashDeposits] = useState<CashDeposit[]>([]);
  const [cashSummaries, setCashSummaries] = useState<CashSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refreshCashData = async () => {
    try {
      setLoading(true);
      
      // Fetch cash transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('cash_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Fetch cash deposits
      const { data: deposits, error: depositsError } = await supabase
        .from('cash_deposits')
        .select('*')
        .order('deposit_date', { ascending: false });

      if (depositsError) throw depositsError;

      // Fetch cash summaries
      const { data: summaries, error: summariesError } = await supabase
        .from('cash_summary')
        .select('*')
        .order('date', { ascending: false });

      if (summariesError) throw summariesError;

      setCashTransactions(transactions || []);
      setCashDeposits(deposits || []);
      setCashSummaries(summaries || []);
    } catch (error) {
      console.error('Error fetching cash data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch cash data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addDeposit = async (deposit: Omit<CashDeposit, 'id' | 'created_at' | 'created_by'>) => {
    try {
      const { error } = await supabase
        .from('cash_deposits')
        .insert({
          ...deposit,
          created_by: 'user'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Bank deposit recorded successfully',
      });

      await refreshCashData();
    } catch (error) {
      console.error('Error adding deposit:', error);
      toast({
        title: 'Error',
        description: 'Failed to record bank deposit',
        variant: 'destructive',
      });
    }
  };

  const addTransaction = async (transaction: Omit<CashTransaction, 'id' | 'created_at' | 'created_by'>) => {
    try {
      const { error } = await supabase
        .from('cash_transactions')
        .insert({
          ...transaction,
          created_by: 'user'
        });

      if (error) throw error;

      await refreshCashData();
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to record cash transaction',
        variant: 'destructive',
      });
    }
  };

  // Calculate today's cash on hand
  const todayCashOnHand = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySummary = cashSummaries.find(s => s.date === today);
    return todaySummary?.closing_balance || 0;
  }, [cashSummaries]);

  useEffect(() => {
    refreshCashData();
  }, []);

  return (
    <CashContext.Provider
      value={{
        cashTransactions,
        cashDeposits,
        cashSummaries,
        todayCashOnHand,
        loading,
        addDeposit,
        addTransaction,
        refreshCashData,
      }}
    >
      {children}
    </CashContext.Provider>
  );
};

export const useCash = () => {
  const context = useContext(CashContext);
  if (context === undefined) {
    throw new Error('useCash must be used within a CashProvider');
  }
  return context;
};
