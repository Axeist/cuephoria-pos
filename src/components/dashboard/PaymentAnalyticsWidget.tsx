
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CreditCard, TrendingUp, Users, DollarSign } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { startOfDay, endOfDay, subDays } from 'date-fns';

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
    
    // Calculate daily comparison
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const yesterday = subDays(today, 1);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);

    const todayRevenue = bills
      .filter(bill => {
        const billDate = new Date(bill.createdAt);
        return billDate >= todayStart && billDate <= todayEnd;
      })
      .reduce((sum, bill) => sum + bill.total, 0);

    const yesterdayRevenue = bills
      .filter(bill => {
        const billDate = new Date(bill.createdAt);
        return billDate >= yesterdayStart && billDate <= yesterdayEnd;
      })
      .reduce((sum, bill) => sum + bill.total, 0);

    const revenueGrowth = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;

    // Calculate average transaction value
    const avgTransactionValue = filteredBills.length > 0 ? totalRevenue / filteredBills.length : 0;

    // Calculate payment method percentages
    const cashPercentage = totalRevenue > 0 ? (totalCashAmount / totalRevenue) * 100 : 0;
    const upiPercentage = totalRevenue > 0 ? (totalUpiAmount / totalRevenue) * 100 : 0;

    // Calculate transaction insights
    const totalTransactions = filteredBills.length;
    const cashTransactions = cashOnlyCount + splitCount;
    const upiTransactions = upiOnlyCount + splitCount;

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
    
    console.log('=== End Debug ===');

    return {
      chartData: [
        { method: 'Cash', amount: totalCashAmount, count: cashTransactions, color: '#10B981' },
        { method: 'UPI', amount: totalUpiAmount, count: upiTransactions, color: '#8B5CF6' }
      ],
      pieData: [
        { name: 'Cash', value: cashPercentage, amount: totalCashAmount, color: '#10B981' },
        { name: 'UPI', value: upiPercentage, amount: totalUpiAmount, color: '#8B5CF6' }
      ],
      totalRevenue,
      todayRevenue,
      yesterdayRevenue,
      revenueGrowth,
      avgTransactionValue,
      totalTransactions,
      splitBreakdown: {
        cash: splitCashTotal,
        upi: splitUpiTotal,
        total: splitCashTotal + splitUpiTotal,
        count: splitCount
      }
    };
  }, [bills, startDate, endDate]);

  const COLORS = ['#10B981', '#8B5CF6'];

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold">Payment Analytics</CardTitle>
        <CreditCard className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="h-full">
        <div className="space-y-4 h-full">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-muted-foreground">Total Sales</span>
              </div>
              <div className="font-bold text-xl text-blue-400">
                <CurrencyDisplay amount={paymentData.totalRevenue} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-muted-foreground">Growth</span>
              </div>
              <div className={`font-bold text-xl ${paymentData.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {paymentData.revenueGrowth >= 0 ? '+' : ''}{paymentData.revenueGrowth.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Daily Comparison */}
          <div className="space-y-2 pt-2 border-t border-gray-700">
            <h4 className="text-sm font-medium text-muted-foreground">Daily Comparison</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Today</span>
                <div className="font-bold text-blue-400">
                  <CurrencyDisplay amount={paymentData.todayRevenue} />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Yesterday</span>
                <div className="font-bold text-gray-400">
                  <CurrencyDisplay amount={paymentData.yesterdayRevenue} />
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Insights */}
          <div className="space-y-2 pt-2 border-t border-gray-700">
            <h4 className="text-sm font-medium text-muted-foreground">Transaction Insights</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Total Transactions</span>
                <div className="font-bold text-purple-400">
                  {paymentData.totalTransactions}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Avg Transaction</span>
                <div className="font-bold text-yellow-400">
                  <CurrencyDisplay amount={paymentData.avgTransactionValue} />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods Chart */}
          <div className="space-y-2 pt-2 border-t border-gray-700">
            <h4 className="text-sm font-medium text-muted-foreground">Payment Distribution</h4>
            <div className="h-32 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(1)}%`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="space-y-2 pt-2 border-t border-gray-700">
            <h4 className="text-sm font-medium text-muted-foreground">Payment Methods</h4>
            <div className="space-y-2">
              {paymentData.chartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.method}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
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
          </div>

          {paymentData.splitBreakdown.count > 0 && (
            <div className="pt-2 border-t border-gray-700">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Split Payment Details</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Split transactions:</span>
                  <span className="font-medium">{paymentData.splitBreakdown.count}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Cash portion:</span>
                  <span className="font-medium"><CurrencyDisplay amount={paymentData.splitBreakdown.cash} /></span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">UPI portion:</span>
                  <span className="font-medium"><CurrencyDisplay amount={paymentData.splitBreakdown.upi} /></span>
                </div>
                <div className="flex justify-between text-xs font-medium border-t border-gray-600 pt-1">
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
