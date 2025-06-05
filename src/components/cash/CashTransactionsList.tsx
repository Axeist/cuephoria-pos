
import React from 'react';
import { useCash } from '@/context/CashContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { format, isWithinInterval } from 'date-fns';
import { ArrowUp, ArrowDown, Banknote } from 'lucide-react';

interface CashTransactionsListProps {
  startDate?: Date;
  endDate?: Date;
}

const CashTransactionsList: React.FC<CashTransactionsListProps> = ({
  startDate,
  endDate,
}) => {
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

  // Filter transactions by date range if provided
  const filteredTransactions = allTransactions.filter(transaction => {
    if (!startDate && !endDate) return true;
    
    const transactionDate = new Date(transaction.created_at);
    
    if (startDate && endDate) {
      return isWithinInterval(transactionDate, { start: startDate, end: endDate });
    } else if (startDate) {
      return transactionDate >= startDate;
    } else if (endDate) {
      return transactionDate <= endDate;
    }
    
    return true;
  });

  const getTransactionIcon = (transactionType: string) => {
    switch (transactionType) {
      case 'sale':
      case 'adjustment':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'deposit':
      case 'withdrawal':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      default:
        return <Banknote className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (transactionType: string) => {
    switch (transactionType) {
      case 'sale':
      case 'adjustment':
        return 'text-green-400';
      case 'deposit':
      case 'withdrawal':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTransactionDescription = (transaction: any) => {
    if (transaction.type === 'transaction') {
      return transaction.description || 'Cash transaction';
    }
    return transaction.bank_name ? `Bank: ${transaction.bank_name}` : 'Bank deposit';
  };

  const getTransactionTitle = (transactionType: string) => {
    switch (transactionType) {
      case 'sale':
        return 'Cash Sale';
      case 'deposit':
        return 'Bank Deposit';
      case 'withdrawal':
        return 'Cash Withdrawal';
      case 'adjustment':
        return 'Manual Adjustment';
      default:
        return 'Cash Transaction';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">
          {startDate || endDate ? 'Filtered Transactions' : 'All Cash Transactions'}
        </h3>
        <span className="text-sm text-gray-400">
          {filteredTransactions.length} transaction(s)
        </span>
      </div>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTransactions.slice(0, 50).map((transaction) => (
              <div 
                key={`${transaction.type}-${transaction.id}`}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getTransactionIcon(transaction.transaction_type)}
                  <div>
                    <p className="text-white font-medium">
                      {getTransactionTitle(transaction.transaction_type)}
                    </p>
                    <p className="text-sm text-gray-400">
                      {getTransactionDescription(transaction)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`font-semibold ${getTransactionColor(transaction.transaction_type)}`}>
                    {(transaction.transaction_type === 'sale' || transaction.transaction_type === 'adjustment') ? '+' : '-'}
                    <CurrencyDisplay amount={transaction.amount} />
                  </p>
                </div>
              </div>
            ))}
            
            {filteredTransactions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400">
                  {startDate || endDate ? 'No transactions found for the selected date range' : 'No transactions found'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashTransactionsList;
