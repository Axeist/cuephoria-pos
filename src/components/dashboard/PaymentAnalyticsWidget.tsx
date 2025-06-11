
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CreditCard } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

const PaymentAnalyticsWidget: React.FC = () => {
  const { bills } = usePOS();

  const paymentData = useMemo(() => {
    let cashTotal = 0;
    let upiTotal = 0;
    let splitTotal = 0;
    let cashCount = 0;
    let upiCount = 0;
    let splitCount = 0;

    bills.forEach(bill => {
      if (bill.is_split_payment) {
        splitTotal += bill.total;
        splitCount++;
      } else if (bill.payment_method === 'cash') {
        cashTotal += bill.total;
        cashCount++;
      } else if (bill.payment_method === 'upi') {
        upiTotal += bill.total;
        upiCount++;
      }
    });

    return [
      { method: 'Cash', amount: cashTotal, count: cashCount, color: '#10B981' },
      { method: 'UPI', amount: upiTotal, count: upiCount, color: '#8B5CF6' },
      { method: 'Split', amount: splitTotal, count: splitCount, color: '#F59E0B' }
    ];
  }, [bills]);

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
            <BarChart data={paymentData}>
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
                <p className="text-sm font-medium">
                  <CurrencyDisplay amount={item.amount} />
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.count} transactions
                  {totalRevenue > 0 && 
                    ` (${((item.amount / totalRevenue) * 100).toFixed(1)}%)`
                  }
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentAnalyticsWidget;
