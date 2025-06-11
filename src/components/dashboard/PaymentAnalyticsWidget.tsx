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

const PaymentAnalyticsWidget: React.FC<PaymentAnalyticsWidgetProps> = ({ startDate, endDate }) => {
  const { bills } = usePOS();

  const paymentData = useMemo(() => {
    // Enhanced debug logging for date filtering
    console.log('=== Payment Analytics Debug ===');
    console.log('Date filter range:', { startDate, endDate });
    console.log('Total bills in system:', bills.length);

    // Filter bills by date range if provided
    const filteredBills = bills.filter(bill => {
      if (!startDate && !endDate) return true;
      const billDate = new Date(bill.createdAt);
      
      // Debug each bill's date filtering
      const includesBill = (!startDate || billDate >= startDate) && (!endDate || billDate <= endDate);
      
      if (!includesBill) {
        console.log(`Excluding bill ${bill.id}: billDate=${billDate.toISOString()}, startDate=${startDate?.toISOString()}, endDate=${endDate?.toISOString()}`);
      }
      
      return includesBill;
    });

    console.log('Filtered bills count:', filteredBills.length);
    
    let totalCashAmount = 0;
    let totalUpiAmount = 0;
    let cashOnlyCount = 0;
    let upiOnlyCount = 0;
    let splitCount = 0;
    let splitCashTotal = 0;
    let splitUpiTotal = 0;

    let debugTotalSum = 0;
    
    filteredBills.forEach((bill, index) => {
      debugTotalSum += bill.total;
      console.log(`Bill ${index + 1}:`, {
        id: bill.id,
        total: bill.total,
        paymentMethod: bill.paymentMethod,
        isSplitPayment: bill.isSplitPayment,
        cashAmount: bill.cashAmount,
        upiAmount: bill.upiAmount,
        createdAt: bill.createdAt
      });
      
      if (bill.isSplitPayment) {
        // For split payments, track the cash and UPI portions separately
        const billCashAmount = bill.cashAmount || 0;
        const billUpiAmount = bill.upiAmount || 0;
        
        totalCashAmount += billCashAmount;
        totalUpiAmount += billUpiAmount;
        splitCashTotal += billCashAmount;
        splitUpiTotal += billUpiAmount;
        splitCount++;
        
        console.log(`Split payment processing: cash=${billCashAmount}, upi=${billUpiAmount}, total=${billCashAmount + billUpiAmount}, billTotal=${bill.total}`);
      } else if (bill.paymentMethod === 'cash') {
        totalCashAmount += bill.total;
        cashOnlyCount++;
      } else if (bill.paymentMethod === 'upi') {
        totalUpiAmount += bill.total;
        upiOnlyCount++;
      }
    });

    // Total revenue is the sum of all cash and UPI amounts
    const totalRevenue = totalCashAmount + totalUpiAmount;
    
    console.log('Final calculation breakdown:', {
      cashOnlyBills: { count: cashOnlyCount, amount: totalCashAmount - splitCashTotal },
      upiOnlyBills: { count: upiOnlyCount, amount: totalUpiAmount - splitUpiTotal },
      splitBills: { count: splitCount, cashPortion: splitCashTotal, upiPortion: splitUpiTotal },
      totals: {
        totalCashAmount,
        totalUpiAmount,
        calculatedRevenue: totalRevenue,
        directSumOfAllBills: debugTotalSum,
        difference: Math.abs(totalRevenue - debugTotalSum)
      }
    });
    
    // Verify split payment calculations
    const manualSplitVerification = filteredBills.filter(bill => bill.isSplitPayment);
    if (manualSplitVerification.length > 0) {
      console.log('Manual split payment verification:');
      manualSplitVerification.forEach(bill => {
        const calculatedSplit = (bill.cashAmount || 0) + (bill.upiAmount || 0);
        console.log(`Bill ${bill.id}: cashAmount=${bill.cashAmount}, upiAmount=${bill.upiAmount}, sum=${calculatedSplit}, billTotal=${bill.total}, matches=${calculatedSplit === bill.total}`);
      });
    }
    
    console.log('=== End Debug ===');

    return {
      chartData: [
        { method: 'Cash', amount: totalCashAmount, count: cashOnlyCount + splitCount, color: '#10B981' },
        { method: 'UPI', amount: totalUpiAmount, count: upiOnlyCount + splitCount, color: '#8B5CF6' }
      ],
      totalRevenue,
      splitBreakdown: {
        cash: splitCashTotal,
        upi: splitUpiTotal,
        total: splitCashTotal + splitUpiTotal,
        count: splitCount
      }
    };
  }, [bills, startDate, endDate]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Payment Analytics</CardTitle>
        <CreditCard className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Total Sales</span>
            <span className="font-bold text-lg">
              <CurrencyDisplay amount={paymentData.totalRevenue} />
            </span>
          </div>

          <div className="h-40">
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

          <div className="space-y-2">
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
                    {paymentData.totalRevenue > 0 && 
                      ` (${((item.amount / paymentData.totalRevenue) * 100).toFixed(1)}%)`
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>

          {paymentData.splitBreakdown.count > 0 && (
            <div className="pt-2 border-t border-gray-700">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Split Payment Details</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Split transactions:</span>
                  <span>{paymentData.splitBreakdown.count}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Cash portion:</span>
                  <span><CurrencyDisplay amount={paymentData.splitBreakdown.cash} /></span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">UPI portion:</span>
                  <span><CurrencyDisplay amount={paymentData.splitBreakdown.upi} /></span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Split total:</span>
                  <span><CurrencyDisplay amount={paymentData.splitBreakdown.total} /></span>
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
