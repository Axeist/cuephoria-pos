
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CurrencyDisplay } from '@/components/ui/currency';
import { InvestmentTransaction, InvestmentPartner } from '@/types/investment.types';
import { Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface InvestmentTransactionsTableProps {
  transactions: InvestmentTransaction[];
  partners: InvestmentPartner[];
  onEdit: (transaction: InvestmentTransaction) => void;
  onDelete: (id: string) => void;
}

const InvestmentTransactionsTable: React.FC<InvestmentTransactionsTableProps> = ({
  transactions,
  partners,
  onEdit,
  onDelete
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getPartnerName = (partnerId: string) => {
    const partner = partners.find(p => p.id === partnerId);
    return partner ? partner.name : 'Unknown Partner';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'investment': return 'bg-green-900 text-green-300';
      case 'dividend': return 'bg-blue-900 text-blue-300';
      case 'withdrawal': return 'bg-orange-900 text-orange-300';
      case 'return': return 'bg-purple-900 text-purple-300';
      default: return 'bg-gray-900 text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-900 text-green-300';
      case 'pending': return 'bg-yellow-900 text-yellow-300';
      case 'cancelled': return 'bg-red-900 text-red-300';
      default: return 'bg-gray-900 text-gray-300';
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-md border border-gray-700 bg-gray-800">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-700">
            <TableHead className="text-gray-200">Partner</TableHead>
            <TableHead className="text-gray-200">Type</TableHead>
            <TableHead className="text-gray-200">Amount</TableHead>
            <TableHead className="text-gray-200">Date</TableHead>
            <TableHead className="text-gray-200">Status</TableHead>
            <TableHead className="text-gray-200">Reference</TableHead>
            <TableHead className="text-gray-200">Description</TableHead>
            <TableHead className="text-gray-200 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id} className="border-gray-700">
              <TableCell>
                <div className="font-medium text-white">
                  {getPartnerName(transaction.partner_id)}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getTypeColor(transaction.transaction_type)}>
                  {transaction.transaction_type}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="font-medium text-white">
                  <CurrencyDisplay amount={transaction.amount} />
                </div>
              </TableCell>
              <TableCell className="text-gray-300">
                {new Date(transaction.transaction_date).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(transaction.status)}>
                  {transaction.status}
                </Badge>
              </TableCell>
              <TableCell className="text-gray-300">
                {transaction.reference_number || '-'}
              </TableCell>
              <TableCell className="text-gray-300 max-w-xs truncate">
                {transaction.description || '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(transaction)}
                    className="text-gray-400 hover:text-white hover:bg-gray-700"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gray-900 border-gray-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">
                          Delete Investment Transaction
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-300">
                          Are you sure you want to delete this transaction? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(transaction.id)}
                          disabled={deletingId === transaction.id}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {deletingId === transaction.id ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {transactions.length === 0 && (
        <div className="p-8 text-center text-gray-400">
          No investment transactions found. Add your first transaction to get started.
        </div>
      )}
    </div>
  );
};

export default InvestmentTransactionsTable;
