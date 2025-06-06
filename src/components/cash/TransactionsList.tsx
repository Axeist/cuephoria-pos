
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  amount: number;
  transaction_type: 'addition' | 'deposit';
  transaction_number: string | null;
  person_name: string;
  notes: string | null;
  remarks: string | null;
  created_at: string;
  created_by: string;
}

interface TransactionsListProps {
  refreshTrigger: number;
}

const TransactionsList: React.FC<TransactionsListProps> = ({ refreshTrigger }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('cash_vault_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
      setFilteredTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch transactions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [refreshTrigger]);

  useEffect(() => {
    const filtered = transactions.filter(transaction => 
      transaction.person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.transaction_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.remarks?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTransactions(filtered);
  }, [searchTerm, transactions]);

  const getTransactionIcon = (type: string) => {
    return type === 'addition' ? (
      <ArrowUpCircle className="h-5 w-5 text-green-500" />
    ) : (
      <ArrowDownCircle className="h-5 w-5 text-blue-500" />
    );
  };

  const getTransactionTypeLabel = (type: string) => {
    return type === 'addition' ? 'Cash Addition' : 'Bank Deposit';
  };

  const getTransactionTypeColor = (type: string) => {
    return type === 'addition' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-700 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <CardTitle className="text-white">Transaction History</CardTitle>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            {searchTerm ? 'No transactions found matching your search.' : 'No transactions yet.'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  {getTransactionIcon(transaction.transaction_type)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">
                        {transaction.person_name}
                      </span>
                      <Badge className={getTransactionTypeColor(transaction.transaction_type)}>
                        {getTransactionTypeLabel(transaction.transaction_type)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-400">
                      {format(new Date(transaction.created_at), 'dd MMM yyyy, HH:mm')}
                    </div>
                    {transaction.transaction_number && (
                      <div className="text-sm text-gray-400">
                        Trans: {transaction.transaction_number}
                      </div>
                    )}
                    {transaction.notes && (
                      <div className="text-sm text-gray-400">
                        Notes: {transaction.notes}
                      </div>
                    )}
                    {transaction.remarks && (
                      <div className="text-sm text-gray-400">
                        Remarks: {transaction.remarks}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${
                    transaction.transaction_type === 'addition' 
                      ? 'text-green-400' 
                      : 'text-blue-400'
                  }`}>
                    {transaction.transaction_type === 'addition' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionsList;
