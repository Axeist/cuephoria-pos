
import React, { useState, useEffect } from 'react';
import CashVaultCard from './CashVaultCard';
import AddCashDialog from './AddCashDialog';
import BankDepositDialog from './BankDepositDialog';
import TransactionsList from './TransactionsList';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const CashManagement: React.FC = () => {
  const [vaultAmount, setVaultAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [noVaultRecord, setNoVaultRecord] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const fetchVaultAmount = async () => {
    try {
      setIsLoading(true);
      setNoVaultRecord(false);
      
      console.log("Fetching vault amount...");
      
      const { data, error } = await supabase
        .from('cash_vault')
        .select('current_amount, updated_at, updated_by')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      console.log("Raw vault data:", data);

      // Check if no data was returned
      if (!data || data.length === 0) {
        console.log("No vault records found");
        setNoVaultRecord(true);
        setVaultAmount(0);
      } else {
        console.log("Vault record found:", data[0]);
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
      
      console.log("Initializing vault with 0 balance...");
      
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

      console.log("Vault initialized:", data);

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

  const resetVaultBalance = async () => {
    try {
      setIsResetting(true);
      
      console.log("Resetting vault balance to 0...");
      
      // Check if there are any vault records
      const { data: existingRecords, error: fetchError } = await supabase
        .from('cash_vault')
        .select('*')
        .order('updated_at', { ascending: false });
        
      if (fetchError) throw fetchError;
      
      console.log("Existing vault records:", existingRecords);
      
      if (existingRecords && existingRecords.length > 0) {
        // Update the most recent record to have 0 balance
        const { error: updateError } = await supabase
          .from('cash_vault')
          .update({ 
            current_amount: 0,
            updated_by: 'admin_reset',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecords[0].id);
          
        if (updateError) throw updateError;
        
        console.log("Vault balance reset to 0");
      } else {
        // No records exist, create a new one
        await initializeVault();
        return;
      }

      toast({
        title: 'Success',
        description: 'Cash vault balance has been reset to ₹0.00',
      });
      
      setShowResetDialog(false);
      // Refresh vault amount
      fetchVaultAmount();
    } catch (error) {
      console.error('Error resetting vault balance:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset vault balance',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
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
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
                className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              
              {/* Show reset option if balance is negative or unusual */}
              {vaultAmount < 0 && (
                <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Fix Balance
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset Vault Balance</DialogTitle>
                      <DialogDescription>
                        The vault shows a negative balance of ₹{Math.abs(vaultAmount).toFixed(2)}. 
                        This usually indicates a data inconsistency. You can reset the vault balance to ₹0.00.
                        <br /><br />
                        <strong>Warning:</strong> This will set the vault balance to zero. Make sure this is correct 
                        based on your actual cash on hand.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowResetDialog(false)}
                        disabled={isResetting}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={resetVaultBalance}
                        disabled={isResetting}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        {isResetting ? 'Resetting...' : 'Reset to ₹0.00'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
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
