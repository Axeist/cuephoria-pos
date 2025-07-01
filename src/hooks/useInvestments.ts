
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InvestmentPartner, InvestmentTransaction } from '@/types/investment.types';
import { toast } from 'sonner';

export const useInvestments = () => {
  const [partners, setPartners] = useState<InvestmentPartner[]>([]);
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('investment_partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type assertion to ensure the data matches our interface
      const typedData = (data || []).map(partner => ({
        ...partner,
        partnership_type: partner.partnership_type as 'investor' | 'partner' | 'advisor' | 'other',
        status: partner.status as 'active' | 'inactive' | 'pending' | 'exited'
      }));
      
      setPartners(typedData);
    } catch (error) {
      console.error('Error fetching partners:', error);
      toast.error('Failed to fetch investment partners');
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('investment_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      
      // Type assertion to ensure the data matches our interface
      const typedData = (data || []).map(transaction => ({
        ...transaction,
        transaction_type: transaction.transaction_type as 'investment' | 'dividend' | 'withdrawal' | 'return',
        status: transaction.status as 'completed' | 'pending' | 'cancelled'
      }));
      
      setTransactions(typedData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch investment transactions');
    }
  };

  const addPartner = async (partner: Omit<InvestmentPartner, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Create partner with initial_investment_amount set to investment_amount
      const partnerWithInitial = {
        ...partner,
        initial_investment_amount: partner.investment_amount
      };

      const { data, error } = await supabase
        .from('investment_partners')
        .insert([partnerWithInitial])
        .select()
        .single();

      if (error) throw error;
      
      // Type assertion for the returned data
      const typedData = {
        ...data,
        partnership_type: data.partnership_type as 'investor' | 'partner' | 'advisor' | 'other',
        status: data.status as 'active' | 'inactive' | 'pending' | 'exited'
      };
      
      setPartners(prev => [typedData, ...prev]);
      toast.success('Investment partner added successfully');
      return typedData;
    } catch (error) {
      console.error('Error adding partner:', error);
      toast.error('Failed to add investment partner');
      throw error;
    }
  };

  const updatePartner = async (id: string, updates: Partial<InvestmentPartner>) => {
    try {
      const { data, error } = await supabase
        .from('investment_partners')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Type assertion for the returned data
      const typedData = {
        ...data,
        partnership_type: data.partnership_type as 'investor' | 'partner' | 'advisor' | 'other',
        status: data.status as 'active' | 'inactive' | 'pending' | 'exited'
      };
      
      setPartners(prev => prev.map(p => p.id === id ? typedData : p));
      toast.success('Investment partner updated successfully');
      return typedData;
    } catch (error) {
      console.error('Error updating partner:', error);
      toast.error('Failed to update investment partner');
      throw error;
    }
  };

  const deletePartner = async (id: string) => {
    try {
      const { error } = await supabase
        .from('investment_partners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setPartners(prev => prev.filter(p => p.id !== id));
      toast.success('Investment partner deleted successfully');
    } catch (error) {
      console.error('Error deleting partner:', error);
      toast.error('Failed to delete investment partner');
      throw error;
    }
  };

  const addTransaction = async (transaction: Omit<InvestmentTransaction, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('investment_transactions')
        .insert([transaction])
        .select()
        .single();

      if (error) throw error;
      
      // Type assertion for the returned data
      const typedData = {
        ...data,
        transaction_type: data.transaction_type as 'investment' | 'dividend' | 'withdrawal' | 'return',
        status: data.status as 'completed' | 'pending' | 'cancelled'
      };
      
      setTransactions(prev => [typedData, ...prev]);
      
      // Refresh partners to update investment amounts
      await fetchPartners();
      
      toast.success('Investment transaction added successfully');
      return typedData;
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add investment transaction');
      throw error;
    }
  };

  const updateTransaction = async (id: string, updates: Partial<InvestmentTransaction>) => {
    try {
      const { data, error } = await supabase
        .from('investment_transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Type assertion for the returned data
      const typedData = {
        ...data,
        transaction_type: data.transaction_type as 'investment' | 'dividend' | 'withdrawal' | 'return',
        status: data.status as 'completed' | 'pending' | 'cancelled'
      };
      
      setTransactions(prev => prev.map(t => t.id === id ? typedData : t));
      
      // Refresh partners to update investment amounts
      await fetchPartners();
      
      toast.success('Investment transaction updated successfully');
      return typedData;
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update investment transaction');
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('investment_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setTransactions(prev => prev.filter(t => t.id !== id));
      
      // Refresh partners to update investment amounts
      await fetchPartners();
      
      toast.success('Investment transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete investment transaction');
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchPartners(), fetchTransactions()]);
      setIsLoading(false);
    };

    loadData();
  }, []);

  return {
    partners,
    transactions,
    isLoading,
    addPartner,
    updatePartner,
    deletePartner,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: () => Promise.all([fetchPartners(), fetchTransactions()])
  };
};
