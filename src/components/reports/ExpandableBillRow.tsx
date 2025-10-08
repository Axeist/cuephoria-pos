import React, { useState } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CurrencyDisplay } from '@/components/ui/currency';
import { ChevronDown, ChevronRight, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface ExpandableBillRowProps {
  bill: any;
  getCustomerName: (customerId: string) => string;
}

const ExpandableBillRow: React.FC<ExpandableBillRowProps> = ({ bill, getCustomerName }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isComplimentary = bill.paymentMethod?.toLowerCase() === 'complimentary';
  const isSplit = bill.splitPayment && bill.splitPayment.length > 0;

  return (
    <>
      <TableRow 
        className={`cursor-pointer hover:bg-gray-800/50 ${
          isComplimentary ? 'bg-amber-950/20 hover:bg-amber-950/30' : ''
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="text-white">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <div>
              <div>{format(new Date(bill.createdAt), 'MMM dd, yyyy')}</div>
              <div className="text-xs text-gray-400">
                {format(new Date(bill.createdAt), 'hh:mm a')}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-white font-mono text-xs">
          {bill.id.substring(0, 8)}...
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="text-white">{getCustomerName(bill.customerId)}</span>
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
        <TableCell className="text-white">{bill.items.length}</TableCell>
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
            <Badge variant="outline" className="bg-blue-900/30 text-blue-400 border-blue-800">
              Split
            </Badge>
          ) : (
            <Badge
              variant={
                bill.paymentMethod === 'cash'
                  ? 'default'
                  : bill.paymentMethod === 'upi'
                  ? 'secondary'
                  : bill.paymentMethod === 'credit'
                  ? 'destructive'
                  : 'outline'
              }
              className={
                bill.paymentMethod === 'cash'
                  ? 'bg-green-900/30 text-green-400 border-green-800'
                  : bill.paymentMethod === 'upi'
                  ? 'bg-blue-900/30 text-blue-400 border-blue-800'
                  : bill.paymentMethod === 'credit'
                  ? 'bg-red-900/30 text-red-400 border-red-800'
                  : ''
              }
            >
              {bill.paymentMethod || 'N/A'}
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-white">
          {isSplit && !isComplimentary ? (
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
          ) : (
            '-'
          )}
        </TableCell>
      </TableRow>

      {/* Expanded row showing items */}
      {isExpanded && (
        <TableRow className={isComplimentary ? 'bg-amber-950/10' : 'bg-gray-800/30'}>
          <TableCell colSpan={10} className="p-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-white text-sm">Items in this transaction:</h4>
              <div className="grid gap-2">
                {bill.items.map((item: any, index: number) => (
                  <div
                    key={index}
                    className={`flex justify-between items-center p-3 rounded-md ${
                      isComplimentary ? 'bg-amber-950/20 border border-amber-800/30' : 'bg-gray-900 border border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={
                          item.type === 'product'
                            ? 'bg-purple-900/30 text-purple-400 border-purple-800'
                            : 'bg-blue-900/30 text-blue-400 border-blue-800'
                        }
                      >
                        {item.type === 'product' ? 'Product' : 'Session'}
                      </Badge>
                      <div>
                        <p className="text-white font-medium">{item.name}</p>
                        <p className="text-xs text-gray-400">
                          <CurrencyDisplay amount={item.price} /> × {item.quantity}
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold ${isComplimentary ? 'text-amber-400' : 'text-white'}`}>
                      <CurrencyDisplay amount={item.total} />
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
                {bill.discountValue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Discount:</span>
                    <CurrencyDisplay amount={bill.discountValue} className="text-purple-400" />
                  </div>
                )}
                {bill.loyaltyPointsUsed > 0 && (
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
    </>
  );
};

export default ExpandableBillRow;
