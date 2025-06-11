
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CreditCard } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

interface PaymentAnalyticsWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

const PaymentAnalyticsWidget: React.FC<PaymentAnalyticsWidgetProps> = ({ 
  startDate, 
  endDate 
}) => {
  const { bills } = usePOS();

  const paymentData = useMemo(() => {
    let cashTotal = 0;
    let upiTotal = 0;
    let cashCount = 0;
    let upiCount = 0;
    let splitCount = 0;

    // Filter bills by date range if provided
    const filteredBills = bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      if (startDate && billDate < startDate) return false;
      if (endDate && billDate > endDate) return false;
      return true;
    });

    console.log('PaymentAnalyticsWidget - Processing', filteredBills.length, 'filtered bills');

    filteredBills.forEach(bill => {
      if (bill.isSplitPayment) {
        // For split payments, add cash and UPI amounts to respective totals
        const cashAmount = bill.cashAmount || 0;
        const upiAmount = bill.upiAmount || 0;
        
        cashTotal += cashAmount;
        upiTotal += upiAmount;
        splitCount++;
        
        // Count as both cash and UPI transactions if both amounts exist
        if (cashAmount > 0) cashCount++;
        if (upiAmount > 0) upiCount++;
        
        console.log(`PaymentAnalyticsWidget - Split payment: cash=${cashAmount}, upi=${upiAmount}`);
      } else if (bill.paymentMethod === 'cash') {
        cashTotal += bill.total;
        cashCount++;
        console.log(`PaymentAnalyticsWidget - Cash payment: ${bill.total}`);
      } else if (bill.paymentMethod === 'upi') {
        upiTotal += bill.total;
        upiCount++;
        console.log(`PaymentAnalyticsWidget - UPI payment: ${bill.total}`);
      }
    });

    console.log('PaymentAnalyticsWidget - Final totals - Cash:', cashTotal, 'UPI:', upiTotal);

    return [
      { method: 'Cash', amount: cashTotal, count: cashCount, color: '#10B981' },
      { method: 'UPI', amount: upiTotal, count: upiCount, color: '#8B5CF6' },
      { method: 'Split', amount: 0, count: splitCount, color: '#F59E0B' } // Split shows count only, amounts distributed above
    ];
  }, [bills, startDate, endDate]);

  const totalRevenue = paymentData.reduce((sum, item) => sum + item.amount, 0);
  const totalTransactions = paymentData.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Payment Analytics</CardTitle>
        <CreditCard className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={paymentData.filter(item => item.method !== 'Split' || item.count > 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="method" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#F9FAFB'
                }}
                formatter={(value: number, name: string) => [
                  name === 'amount' ? `₹${Math.round(value)}` : value,
                  name === 'amount' ? 'Revenue' : 'Transactions'
                ]}
              />
              <Bar 
                dataKey="amount" 
                fill="#8B5CF6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          {paymentData.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm">{item.method}</span>
              </div>
              <div className="text-right">
                {item.method === 'Split' ? (
                  <>
                    <p className="text-sm font-medium">-</p>
                    <p className="text-xs text-muted-foreground">
                      {item.count} transactions
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">
                      <CurrencyDisplay amount={item.amount} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.count} transactions
                      {totalRevenue > 0 && 
                        ` (${((item.amount / totalRevenue) * 100).toFixed(1)}%)`
                      }
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
          <div className="border-t pt-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total</span>
              <div className="text-right">
                <p className="text-sm font-bold">
                  <CurrencyDisplay amount={totalRevenue} />
                </p>
                <p className="text-xs text-muted-foreground">
                  {totalTransactions} transactions
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentAnalyticsWidget;
