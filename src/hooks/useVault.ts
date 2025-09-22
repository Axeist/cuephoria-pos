// src/hooks/useVault.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'
import { useToast } from '@/hooks/use-toast'

type VaultTransaction = Database['public']['Tables']['cash_vault_transactions']['Row']
type CashVault = Database['public']['Tables']['cash_vault']['Row']
type CashSummary = Database['public']['Tables']['cash_summary']['Row']

export const useVault = () => {
  const [currentCash, setCurrentCash] = useState(0)
  const [transactions, setTransactions] = useState<VaultTransaction[]>([])
  const [openingBalance, setOpeningBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Load initial data
  useEffect(() => {
    loadVaultData()
  }, [])

  // Set up real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('vault-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'cash_vault_transactions' },
        (payload) => {
          console.log('Transaction updated:', payload)
          loadTransactions()
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'cash_vault' },
        (payload) => {
          console.log('Vault updated:', payload)
          loadCurrentVault()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadVaultData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadCurrentVault(),
        loadTransactions(),
        loadTodaySummary()
      ])
    } catch (error) {
      console.error('Error loading vault data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load vault data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentVault = async () => {
    try {
      const { data, error } = await supabase
        .from('cash_vault')
        .select('*')
        .single()

      if (error && error.code === 'PGRST116') {
        // Table is empty, initialize with default record
        console.log('Vault table empty, initializing...')
        const { data: newVault, error: insertError } = await supabase
          .from('cash_vault')
          .insert({ 
            current_amount: 0, 
            updated_by: 'system',
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error initializing vault:', insertError)
          setCurrentCash(0)
          return
        }
        
        setCurrentCash(0)
        return
      }

      if (error) {
        console.error('Error loading vault:', error)
        return
      }

      if (data) {
        setCurrentCash(data.current_amount)
      } else {
        setCurrentCash(0)
      }
    } catch (error) {
      console.error('Unexpected error in loadCurrentVault:', error)
      setCurrentCash(0)
    }
  }

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('cash_vault_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error loading transactions:', error)
        return
      }

      setTransactions(data || [])
    } catch (error) {
      console.error('Unexpected error in loadTransactions:', error)
    }
  }

  const loadTodaySummary = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('cash_summary')
        .select('*')
        .eq('date', today)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading summary:', error)
        return
      }

      if (data) {
        setOpeningBalance(data.opening_balance)
      }
    } catch (error) {
      console.error('Unexpected error in loadTodaySummary:', error)
    }
  }

  const addTransaction = async (
    type: string,
    amount: number,
    personName?: string,
    notes?: string
  ) => {
    setLoading(true)
    try {
      console.log('Adding transaction:', { type, amount, personName, notes })

      // Ensure transaction type is exactly 'cash_in' or 'cash_out' (based on your DB constraint)
      const transactionType = type === 'in' ? 'cash_in' : 'cash_out'
      
      // Add transaction
      const { data: transaction, error: txnError } = await supabase
        .from('cash_vault_transactions')
        .insert({
          transaction_type: transactionType, // Fixed: use proper constraint values
          amount: amount,
          person_name: personName || 'Staff',
          notes: notes || null,
          remarks: null,
          transaction_number: `TXN-${Date.now()}`,
          created_by: 'current-user',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (txnError) {
        console.error('Transaction insert error:', txnError)
        throw txnError
      }

      console.log('Transaction added:', transaction)

      // Calculate new vault balance
      const newBalance = type === 'in' ? currentCash + amount : currentCash - amount
      console.log('Updating vault balance from', currentCash, 'to', newBalance)

      // Update vault balance
      const { error: vaultError } = await supabase
        .from('cash_vault')
        .upsert({
          current_amount: newBalance,
          updated_by: 'current-user',
          updated_at: new Date().toISOString()
        })

      if (vaultError) {
        console.error('Vault update error:', vaultError)
        throw vaultError
      }

      toast({
        title: 'Success',
        description: `₹${amount} ${type === 'in' ? 'added to' : 'removed from'} vault`
      })

      // Refresh data to get latest
      await loadVaultData()

      return transaction
    } catch (error) {
      console.error('Error adding transaction:', error)
      toast({
        title: 'Error',
        description: `Failed to add transaction: ${error.message}`,
        variant: 'destructive'
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateTransaction = async (
    id: string,
    type: string,
    amount: number,
    personName?: string,
    notes?: string
  ) => {
    setLoading(true)
    try {
      // Find original transaction to reverse its effect
      const originalTxn = transactions.find(t => t.id === id)
      if (!originalTxn) throw new Error('Transaction not found')

      console.log('Updating transaction:', { id, type, amount, personName, notes })
      console.log('Original transaction:', originalTxn)

      // Ensure transaction type is exactly 'cash_in' or 'cash_out'
      const transactionType = type === 'in' ? 'cash_in' : 'cash_out'

      // Update transaction
      const { error: txnError } = await supabase
        .from('cash_vault_transactions')
        .update({
          transaction_type: transactionType, // Fixed: use proper constraint values
          amount: amount,
          person_name: personName || null,
          notes: notes || null,
        })
        .eq('id', id)

      if (txnError) {
        console.error('Transaction update error:', txnError)
        throw txnError
      }

      // Calculate new vault balance
      let newBalance = currentCash
      
      // Reverse original transaction (check actual DB values)
      if (originalTxn.transaction_type === 'cash_in') {
        newBalance -= originalTxn.amount
      } else {
        newBalance += originalTxn.amount
      }
      
      // Apply new transaction
      if (type === 'in') {
        newBalance += amount
      } else {
        newBalance -= amount
      }

      console.log('Updating vault balance to:', newBalance)

      // Update vault balance
      const { error: vaultError } = await supabase
        .from('cash_vault')
        .upsert({
          current_amount: newBalance,
          updated_by: 'current-user',
          updated_at: new Date().toISOString()
        })

      if (vaultError) {
        console.error('Vault update error:', vaultError)
        throw vaultError
      }

      toast({
        title: 'Success',
        description: 'Transaction updated successfully'
      })

      // Refresh data to get latest
      await loadVaultData()

    } catch (error) {
      console.error('Error updating transaction:', error)
      toast({
        title: 'Error',
        description: `Failed to update transaction: ${error.message}`,
        variant: 'destructive'
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteTransaction = async (id: string) => {
    setLoading(true)
    try {
      // Find transaction to reverse its effect
      const transaction = transactions.find(t => t.id === id)
      if (!transaction) throw new Error('Transaction not found')

      console.log('Deleting transaction:', transaction)

      // Delete transaction
      const { error: deleteError } = await supabase
        .from('cash_vault_transactions')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Transaction delete error:', deleteError)
        throw deleteError
      }

      // Reverse transaction effect on vault (check actual DB values)
      const newBalance = transaction.transaction_type === 'cash_in' 
        ? currentCash - transaction.amount
        : currentCash + transaction.amount

      console.log('Updating vault balance to:', newBalance)

      const { error: vaultError } = await supabase
        .from('cash_vault')
        .upsert({
          current_amount: newBalance,
          updated_by: 'current-user',
          updated_at: new Date().toISOString()
        })

      if (vaultError) {
        console.error('Vault update error:', vaultError)
        throw vaultError
      }

      toast({
        title: 'Success',
        description: 'Transaction deleted successfully'
      })

      // Refresh data to get latest
      await loadVaultData()

    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast({
        title: 'Error',
        description: `Failed to delete transaction: ${error.message}`,
        variant: 'destructive'
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  const setOpeningBalanceForToday = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      console.log('Setting opening balance for date:', today)
      console.log('Current cash amount:', currentCash)
      
      // First try to update existing record
      const { data: existingData, error: updateError } = await supabase
        .from('cash_summary')
        .update({
          opening_balance: currentCash,
          closing_balance: currentCash,
          updated_at: new Date().toISOString()
        })
        .eq('date', today)
        .select()

      if (updateError && updateError.code !== 'PGRST116') {
        console.error('Update error:', updateError)
        throw updateError
      }

      // If no rows updated, insert new record
      if (!existingData || existingData.length === 0) {
        console.log('No existing record, creating new summary for today')
        const { data, error: insertError } = await supabase
          .from('cash_summary')
          .insert({
            date: today,
            opening_balance: currentCash,
            closing_balance: currentCash,
            total_sales: 0,
            total_deposits: 0,
            total_withdrawals: 0,
            updated_at: new Date().toISOString()
          })
          .select()

        if (insertError) {
          console.error('Summary insert error:', insertError)
          
          // If it's a duplicate key error, that means another process already inserted it
          // Try updating again
          if (insertError.code === '23505') {
            const { error: retryUpdateError } = await supabase
              .from('cash_summary')
              .update({
                opening_balance: currentCash,
                closing_balance: currentCash,
                updated_at: new Date().toISOString()
              })
              .eq('date', today)

            if (retryUpdateError) {
              throw retryUpdateError
            }
          } else {
            throw insertError
          }
        }
        
        console.log('Summary created:', data)
      } else {
        console.log('Summary updated:', existingData)
      }

      setOpeningBalance(currentCash)
      
      toast({
        title: 'Success',
        description: `Opening balance set to ₹${currentCash}`
      })

    } catch (error) {
      console.error('Error setting opening balance:', error)
      toast({
        title: 'Error',
        description: `Failed to set opening balance: ${error.message}`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return {
    currentCash,
    transactions,
    openingBalance,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setOpeningBalanceForToday,
    refreshData: loadVaultData
  }
}
