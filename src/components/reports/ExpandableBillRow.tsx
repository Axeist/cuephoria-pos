import React, { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Trash2, Edit2, Gift } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BillItem {
  id: string;
  name: string;
  quantity: number;
  total: number;
  price: number;
  type: 'product' | 'session';
  category?: string;
}

interface Bill {
  id: string;
  customerId: string;
  items: BillItem[];
  subtotal: number;
  discountValue?: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  loyaltyPointsUsed?: number;
  total: number;
  paymentMethod: string;
  isSplitPayment?: boolean;
  splitPayment?: any[];
  cashAmount?: number;
  upiAmount?: number;
  compNote?: string;
  createdAt: Date | string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface ExpandableBillRowProps {
  bill: Bill;
  getCustomerName: (customerId: string) => string;
  getCustomerPhone?: (customerId: string) => string;
  searchTerm?: string;
  onEdit?: (bill: Bill) => void;
  onDelete?: (bill: Bill) => void;
}

const ExpandableBillRow: React.FC<ExpandableBillRowProps> = ({ 
  bill, 
  getCustomerName, 
  getCustomerPhone,
  searchTerm = '',
  onEdit,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const billDate = new Date(bill.createdAt);
  const firstItemName = bill.items.length > 0 ? bill.items[0].name : '';
  const itemCount = bill.items.length;
  const customerName = getCustomerName(bill.customerId);
  const customerPhone = getCustomerPhone ? getCustomerPhone(bill.customerId) : '';
  
  const isComplimentary = bill.paymentMethod?.toLowerCase() === 'complimentary';
  const isSplit = bill.isSplitPayment || (bill.splitPayment && bill.splitPayment.length > 0);

  // Check if this bill matches the search term
  const matchesSearch = !searchTerm || 
    customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customerPhone.includes(searchTerm) ||
    bill.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!matchesSearch) {
    return null;
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(bill);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(bill);
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <TableRow 
        className={`hover:bg-gray-800/50 transition-colors ${
          isComplimentary ? 'bg-amber-950/20 hover:bg-amber-950/30' : ''
        }`}
      >
        <TableCell className="text-white">
          <div>{format(billDate, 'd MMM yyyy')}</div>
          <div className="text-gray-400">{format(billDate, 'HH:mm')}</div>
        </TableCell>
        <TableCell className="text-white font-mono text-xs">{bill.id.substring(0, 30)}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="text-white">
              <div>{customerName}</div>
              {customerPhone && (
                <div className="text-gray-400 text-xs">{customerPhone}</div>
              )}
            </div>
            {isComplimentary && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 text-xs px-1.5 py-0">
                <Gift className="h-3 w-3 mr-1" />
                Comp
              </Badge>
            )}
          </div>
          {isComplimentary && bill.compNote && (
            <p className="text-xs text-amber-400/80 mt-1 italic">
              {bill.compNote}
            </p>
          )}
        </TableCell>
        <TableCell className="text-white">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0 hover:bg-gray-700"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <div>
              <div>{itemCount} item{itemCount !== 1 ? 's' : ''}</div>
              {!isExpanded && bill.items.length > 0 && (
                <div className="text-gray-400 text-xs">{firstItemName}</div>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="text-white">
          <CurrencyDisplay amount={bill.subtotal} />
        </TableCell>
        <TableCell className="text-white">
          <CurrencyDisplay amount={bill.discountValue || 0} />
        </TableCell>
        <TableCell className="text-white">{bill.loyaltyPointsUsed || 0}</TableCell>
        <TableCell className={`font-semibold ${isComplimentary ? 'text-amber-400' : 'text-white'}`}>
          <CurrencyDisplay amount={bill.total} />
        </TableCell>
        <TableCell>
          {isComplimentary ? (
            <Badge className="bg-amber-900/30 text-amber-400 border-amber-700">
              <Gift className="h-3 w-3 mr-1" />
              Complimentary
            </Badge>
          ) : isSplit ? (
            <Badge variant="outline" className="bg-purple-900/30 text-purple-400 border-purple-800">
              Split
            </Badge>
          ) : (
            <Badge variant="outline" className={
              bill.paymentMethod === 'upi'
                ? "bg-blue-900/30 text-blue-400 border-blue-800"
                : bill.paymentMethod === 'credit'
                ? "bg-orange-900/30 text-orange-400 border-orange-800"
                : "bg-green-900/30 text-green-400 border-green-800"
            }>
              {bill.paymentMethod === 'upi' 
                ? 'UPI' 
                : bill.paymentMethod === 'credit'
                ? 'Credit'
                : 'Cash'}
            </Badge>
          )}
        </TableCell>
        <TableCell>
          {isSplit && !isComplimentary && (
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-1">
                <span className="text-green-400">Cash:</span>
                <CurrencyDisplay amount={bill.cashAmount || 0} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-blue-400">UPI:</span>
                <CurrencyDisplay amount={bill.upiAmount || 0} />
              </div>
            </div>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEdit}
                className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-950/30"
              >
                <Edit2 className="h-4 w-4" />
                <span className="sr-only">Edit transaction</span>
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteClick}
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete transaction</span>
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      
      {/* Expanded row showing item details */}
      {isExpanded && (
        <TableRow className={isComplimentary ? 'bg-amber-950/10' : 'bg-gray-800/30'}>
          <TableCell colSpan={11} className="p-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white mb-2">Items in this transaction:</h4>
              <div className="grid gap-2">
                {bill.items.map((item, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between rounded-lg p-3 ${
                      isComplimentary 
                        ? 'bg-amber-950/20 border border-amber-800/30' 
                        : 'bg-gray-800/50 border border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={
                        item.type === 'session' 
                          ? "bg-blue-900/30 text-blue-400 border-blue-800" 
                          : "bg-purple-900/30 text-purple-400 border-purple-800"
                      }>
                        {item.type === 'session' ? 'Session' : 'Product'}
                      </Badge>
                      <div>
                        <span className="text-white font-medium">{item.name}</span>
                        <div className="text-xs text-gray-400">
                          <CurrencyDisplay amount={item.price} /> × {item.quantity}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`font-semibold ${isComplimentary ? 'text-amber-400' : 'text-white'}`}>
                        <CurrencyDisplay amount={item.total} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Show complimentary note in expanded section if available */}
              {isComplimentary && bill.compNote && (
                <div className="mt-3 p-3 bg-amber-950/30 border border-amber-800/50 rounded-md">
                  <p className="text-xs text-gray-400 mb-1">Complimentary Reason:</p>
                  <p className="text-sm text-amber-400 italic">{bill.compNote}</p>
                </div>
              )}

              {/* Summary */}
              <div className="border-t border-gray-700 pt-3 mt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal:</span>
                  <CurrencyDisplay amount={bill.subtotal} className="text-white" />
                </div>
                {(bill.discountValue || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Discount:</span>
                    <CurrencyDisplay amount={bill.discountValue || 0} className="text-purple-400" />
                  </div>
                )}
                {(bill.loyaltyPointsUsed || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Loyalty Points Used:</span>
                    <span className="text-orange-400">{bill.loyaltyPointsUsed}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t border-gray-700 pt-2 mt-2">
                  <span className={isComplimentary ? 'text-amber-400' : 'text-white'}>Total:</span>
                  <CurrencyDisplay 
                    amount={bill.total} 
                    className={isComplimentary ? 'text-amber-400' : 'text-white'} 
                  />
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-800 border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete this transaction? This will revert the sale, 
              update inventory, and adjust customer loyalty points. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ExpandableBillRow;
