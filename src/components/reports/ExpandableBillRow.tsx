
import React, { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Button } from '@/components/ui/button';

interface BillItem {
  id: string;
  name: string;
  quantity: number;
  total: number;
  type: 'product' | 'session';
}

interface Bill {
  id: string;
  customerId: string;
  items: BillItem[];
  subtotal: number;
  discountValue?: number;
  loyaltyPointsUsed?: number;
  total: number;
  paymentMethod: string;
  isSplitPayment?: boolean;
  cashAmount?: number;
  upiAmount?: number;
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
}

const ExpandableBillRow: React.FC<ExpandableBillRowProps> = ({ 
  bill, 
  getCustomerName, 
  getCustomerPhone,
  searchTerm = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const billDate = new Date(bill.createdAt);
  const firstItemName = bill.items.length > 0 ? bill.items[0].name : '';
  const itemCount = bill.items.length;
  const customerName = getCustomerName(bill.customerId);
  const customerPhone = getCustomerPhone ? getCustomerPhone(bill.customerId) : '';

  // Check if this bill matches the search term
  const matchesSearch = !searchTerm || 
    customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customerPhone.includes(searchTerm) ||
    bill.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!matchesSearch) {
    return null;
  }

  return (
    <>
      <TableRow>
        <TableCell className="text-white">
          <div>{format(billDate, 'd MMM yyyy')}</div>
          <div className="text-gray-400">{format(billDate, 'HH:mm')}</div>
        </TableCell>
        <TableCell className="text-white font-mono text-xs">{bill.id.substring(0, 30)}</TableCell>
        <TableCell className="text-white">
          <div>{customerName}</div>
          {customerPhone && (
            <div className="text-gray-400 text-xs">{customerPhone}</div>
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
        <TableCell className="text-white font-semibold">
          <CurrencyDisplay amount={bill.total} />
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={
            bill.paymentMethod === 'upi'
              ? "bg-blue-900/30 text-blue-400 border-blue-800"
              : bill.paymentMethod === 'split'
              ? "bg-purple-900/30 text-purple-400 border-purple-800"
              : "bg-green-900/30 text-green-400 border-green-800"
          }>
            {bill.paymentMethod === 'upi' 
              ? 'UPI' 
              : bill.paymentMethod === 'split'
              ? 'Split'
              : 'Cash'}
          </Badge>
        </TableCell>
        <TableCell>
          {bill.isSplitPayment && (
            <div className="text-xs">
              <div className="text-green-400">
                Cash: <CurrencyDisplay amount={bill.cashAmount || 0} />
              </div>
              <div className="text-blue-400 mt-1">
                UPI: <CurrencyDisplay amount={bill.upiAmount || 0} />
              </div>
            </div>
          )}
        </TableCell>
      </TableRow>
      
      {/* Expanded row showing item details */}
      {isExpanded && (
        <TableRow className="bg-gray-800/30">
          <TableCell colSpan={10} className="p-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white mb-2">Items in this bill:</h4>
              <div className="grid gap-2">
                {bill.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={
                        item.type === 'session' 
                          ? "bg-blue-900/30 text-blue-400 border-blue-800" 
                          : "bg-green-900/30 text-green-400 border-green-800"
                      }>
                        {item.type === 'session' ? 'Session' : 'Product'}
                      </Badge>
                      <span className="text-white font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">Qty: {item.quantity}</span>
                      <span className="text-white font-semibold">
                        <CurrencyDisplay amount={item.total} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export default ExpandableBillRow;
