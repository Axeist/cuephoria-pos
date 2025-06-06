
import React, { useState, useEffect } from 'react';
import CashVaultCard from './CashVaultCard';
import AddCashDialog from './AddCashDialog';
import BankDepositDialog from './BankDepositDialog';
import TransactionsList from './TransactionsList';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const CashManagement: React.FC = () => {
  const [vaultAmount, setVaultAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();

  const fetchVaultAmount = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('cash_vault')
        .select('current_amount')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      setVaultAmount(data?.current_amount || 0);
    } catch (error) {
      console.error('Error fetching vault amount:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch vault balance',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultAmount();
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Vault Balance and Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        <CashVaultCard currentAmount={vaultAmount} isLoading={isLoading} />
        
        <div className="flex flex-col space-y-3 md:col-span-2 md:flex-row md:space-y-0 md:space-x-3 md:items-center">
          <AddCashDialog onSuccess={handleRefresh} />
          <BankDepositDialog 
            currentVaultAmount={vaultAmount} 
            onSuccess={handleRefresh} 
          />
        </div>
      </div>

      {/* Transaction History */}
      <TransactionsList refreshTrigger={refreshTrigger} />
    </div>
  );
};

export default CashManagement;
