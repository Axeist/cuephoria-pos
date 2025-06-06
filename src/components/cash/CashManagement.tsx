
import React, { useState, useEffect } from 'react';
import CashVaultCard from './CashVaultCard';
import AddCashDialog from './AddCashDialog';
import BankDepositDialog from './BankDepositDialog';
import TransactionsList from './TransactionsList';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const CashManagement: React.FC = () => {
  const [vaultAmount, setVaultAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [noVaultRecord, setNoVaultRecord] = useState(false);
  const { toast } = useToast();

  const fetchVaultAmount = async () => {
    try {
      setIsLoading(true);
      setNoVaultRecord(false);
      
      const { data, error } = await supabase
        .from('cash_vault')
        .select('current_amount')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      // Check if no data was returned
      if (!data || data.length === 0) {
        console.log("No vault records found");
        setNoVaultRecord(true);
        setVaultAmount(0);
      } else {
        setVaultAmount(data[0].current_amount);
      }
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

  const initializeVault = async () => {
    try {
      setIsLoading(true);
      // Create a new vault record with 0 balance
      const { data, error } = await supabase
        .from('cash_vault')
        .insert([
          { 
            current_amount: 0,
            updated_by: 'system'
          }
        ])
        .select();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Cash vault initialized successfully',
      });
      
      // Refresh vault amount
      fetchVaultAmount();
    } catch (error) {
      console.error('Error initializing vault:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize vault',
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

  const handleTransactionDeleted = () => {
    // Refresh the vault amount when a transaction is deleted
    fetchVaultAmount();
  };

  return (
    <div className="space-y-6">
      {/* Vault Balance and Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        {noVaultRecord ? (
          <div className="bg-gray-800 border-gray-700 rounded-lg p-6 col-span-3">
            <h3 className="text-lg font-medium text-white mb-4">Cash Vault Not Initialized</h3>
            <p className="text-gray-400 mb-4">
              It appears that there's no cash vault record in the database. 
              This could happen if vault records were manually deleted.
            </p>
            <Button 
              onClick={initializeVault}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Initialize Cash Vault
            </Button>
          </div>
        ) : (
          <>
            <CashVaultCard currentAmount={vaultAmount} isLoading={isLoading} />
            
            <div className="flex flex-col space-y-3 md:col-span-2 md:flex-row md:space-y-0 md:space-x-3 md:items-center">
              <AddCashDialog onSuccess={handleRefresh} />
              <BankDepositDialog 
                currentVaultAmount={vaultAmount} 
                onSuccess={handleRefresh} 
              />
            </div>
          </>
        )}
      </div>

      {/* Transaction History */}
      <TransactionsList 
        refreshTrigger={refreshTrigger} 
        onTransactionDeleted={handleTransactionDeleted}
      />
    </div>
  );
};

export default CashManagement;
