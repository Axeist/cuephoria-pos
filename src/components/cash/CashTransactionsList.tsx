
import React from 'react';
import { useCash } from '@/context/CashContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { format } from 'date-fns';
import { ArrowUp, ArrowDown, Banknote, CreditCard } from 'lucide-react';

const CashTransactionsList = () => {
  const { cashTransactions, cashDeposits } = useCash();

  // Combine and sort transactions and deposits
  const allTransactions = [
    ...cashTransactions.map(t => ({ ...t, type: 'transaction' as const })),
    ...cashDeposits.map(d => ({ 
      ...d, 
      type: 'deposit' as const,
      transaction_type: 'deposit' as const,
      created_at: d.created_at 
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getTransactionIcon = (transactionType: string) => {
    switch (transactionType) {
      case 'sale':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'deposit':
        return <ArrowDown className="h-4 w-4 text-orange-500" />;
      case 'withdrawal':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      default:
        return <Banknote className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (transactionType: string) => {
    switch (transactionType) {
      case 'sale':
        return 'text-green-400';
      case 'deposit':
      case 'withdrawal':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">All Cash Transactions</h3>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allTransactions.slice(0, 50).map((transaction) => (
              <div 
                key={`${transaction.type}-${transaction.id}`}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getTransactionIcon(transaction.transaction_type)}
                  <div>
                    <p className="text-white font-medium">
                      {transaction.transaction_type === 'sale' ? 'Cash Sale' :
                       transaction.transaction_type === 'deposit' ? 'Bank Deposit' :
                       transaction.transaction_type === 'withdrawal' ? 'Cash Withdrawal' :
                       'Cash Transaction'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {transaction.description || 
                       (transaction.type === 'deposit' && 'bank_name' in transaction ? 
                        `Bank: ${transaction.bank_name || 'N/A'}` : 
                        'Cash transaction')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`font-semibold ${getTransactionColor(transaction.transaction_type)}`}>
                    {transaction.transaction_type === 'sale' ? '+' : '-'}
                    <CurrencyDisplay amount={transaction.amount} />
                  </p>
                </div>
              </div>
            ))}
            
            {allTransactions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400">No transactions found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashTransactionsList;
