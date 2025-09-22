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
    const { data, error } = await supabase
      .from('cash_vault')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading vault:', error)
      return
    }

    if (data) {
      setCurrentCash(data.current_amount)
    } else {
      // Initialize vault if it doesn't exist
      await supabase
        .from('cash_vault')
        .insert({ current_amount: 0, updated_by: 'system' })
      setCurrentCash(0)
    }
  }

  const loadTransactions = async () => {
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
  }

  const loadTodaySummary = async () => {
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
  }

  const addTransaction = async (
    type: string,
    amount: number,
    personName?: string,
    notes?: string
  ) => {
    setLoading(true)
    try {
      // Add transaction
      const { data: transaction, error: txnError } = await supabase
        .from('cash_vault_transactions')
        .insert({
          transaction_type: type,
          amount: amount,
          person_name: personName || 'Staff',
          notes: notes || null,
          transaction_number: `TXN-${Date.now()}`,
          created_by: 'current-user'
        })
        .select()
        .single()

      if (txnError) throw txnError

      // Update vault balance
      const newBalance = type === 'in' ? currentCash + amount : currentCash - amount
      
      const { error: vaultError } = await supabase
        .from('cash_vault')
        .upsert({
          current_amount: newBalance,
          updated_by: 'current-user',
          updated_at: new Date().toISOString()
        })

      if (vaultError) throw vaultError

      toast({
        title: 'Success',
        description: `₹${amount} ${type === 'in' ? 'added to' : 'removed from'} vault`
      })

      return transaction
    } catch (error) {
      console.error('Error adding transaction:', error)
      toast({
        title: 'Error',
        description: 'Failed to add transaction',
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

      // Update transaction
      const { error: txnError } = await supabase
        .from('cash_vault_transactions')
        .update({
          transaction_type: type,
          amount: amount,
          person_name: personName || null,
          notes: notes || null,
        })
        .eq('id', id)

      if (txnError) throw txnError

      // Calculate new vault balance
      let newBalance = currentCash
      
      // Reverse original transaction
      if (originalTxn.transaction_type === 'in') {
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

      // Update vault balance
      const { error: vaultError } = await supabase
        .from('cash_vault')
        .upsert({
          current_amount: newBalance,
          updated_by: 'current-user',
          updated_at: new Date().toISOString()
        })

      if (vaultError) throw vaultError

      toast({
        title: 'Success',
        description: 'Transaction updated successfully'
      })

    } catch (error) {
      console.error('Error updating transaction:', error)
      toast({
        title: 'Error',
        description: 'Failed to update transaction',
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

      // Delete transaction
      const { error: deleteError } = await supabase
        .from('cash_vault_transactions')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // Reverse transaction effect on vault
      const newBalance = transaction.transaction_type === 'in' 
        ? currentCash - transaction.amount
        : currentCash + transaction.amount

      const { error: vaultError } = await supabase
        .from('cash_vault')
        .upsert({
          current_amount: newBalance,
          updated_by: 'current-user',
          updated_at: new Date().toISOString()
        })

      if (vaultError) throw vaultError

      toast({
        title: 'Success',
        description: 'Transaction deleted successfully'
      })

    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete transaction',
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
      
      const { error } = await supabase
        .from('cash_summary')
        .upsert({
          date: today,
          opening_balance: currentCash,
          closing_balance: currentCash,
          total_sales: 0,
          total_deposits: 0,
          total_withdrawals: 0,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setOpeningBalance(currentCash)
      
      toast({
        title: 'Success',
        description: `Opening balance set to ₹${currentCash}`
      })

    } catch (error) {
      console.error('Error setting opening balance:', error)
      toast({
        title: 'Error',
        description: 'Failed to set opening balance',
        variant: 'destructive'
      })
      throw error
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
