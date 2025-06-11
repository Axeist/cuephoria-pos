
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CreditCard } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

interface PaymentAnalyticsWidgetProps {
  dateRange?: { start: Date; end: Date } | null;
}

const PaymentAnalyticsWidget: React.FC<PaymentAnalyticsWidgetProps> = ({ dateRange }) => {
  const { bills } = usePOS();

  const paymentData = useMemo(() => {
    // Filter bills by date range if provided
    const filteredBills = dateRange 
      ? bills.filter(bill => {
          const billDate = new Date(bill.createdAt);
          return billDate >= dateRange.start && billDate <= dateRange.end;
        })
      : bills;

    let cashTotal = 0;
    let upiTotal = 0;
    let splitCashTotal = 0;
    let splitUpiTotal = 0;
    let cashCount = 0;
    let upiCount = 0;
    let splitCount = 0;

    filteredBills.forEach(bill => {
      if (bill.isSplitPayment) {
        splitCashTotal += bill.cashAmount || 0;
        splitUpiTotal += bill.upiAmount || 0;
        splitCount++;
      } else if (bill.paymentMethod === 'cash') {
        cashTotal += bill.total;
        cashCount++;
      } else if (bill.paymentMethod === 'upi') {
        upiTotal += bill.total;
        upiCount++;
      }
    });

    const totalCash = cashTotal + splitCashTotal;
    const totalUpi = upiTotal + splitUpiTotal;
    const totalSplit = splitCashTotal + splitUpiTotal;

    return {
      chartData: [
        { method: 'Cash', amount: totalCash, count: cashCount, color: '#10B981' },
        { method: 'UPI', amount: totalUpi, count: upiCount, color: '#8B5CF6' },
        { method: 'Split', amount: totalSplit, count: splitCount, color: '#F59E0B' }
      ].filter(item => item.amount > 0),
      breakdown: {
        cashTotal: totalCash,
        upiTotal: totalUpi,
        splitTotal: totalSplit,
        splitCashTotal,
        splitUpiTotal,
        cashCount,
        upiCount,
        splitCount
      }
    };
  }, [bills, dateRange]);

  const totalRevenue = paymentData.chartData.reduce((sum, item) => sum + item.amount, 0);
  const totalTransactions = paymentData.chartData.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Payment Analytics</CardTitle>
        <CreditCard className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        {/* Total Sales Summary */}
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Sales</span>
            <span className="text-lg font-bold">
              <CurrencyDisplay amount={totalRevenue} />
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-muted-foreground">Transactions</span>
            <span className="text-xs font-medium">{totalTransactions}</span>
          </div>
        </div>

        <div className="h-48 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={paymentData.chartData}>
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

        <div className="space-y-2 flex-1">
          {paymentData.chartData.map((item, index) => (
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
          
          {/* Split Payment Breakdown */}
          {paymentData.breakdown.splitCount > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-700">
              <p className="text-xs text-muted-foreground mb-2">Split Payment Details:</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">• Cash portion:</span>
                  <span><CurrencyDisplay amount={paymentData.breakdown.splitCashTotal} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">• UPI portion:</span>
                  <span><CurrencyDisplay amount={paymentData.breakdown.splitUpiTotal} /></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentAnalyticsWidget;
