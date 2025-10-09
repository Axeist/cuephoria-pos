import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CreditCard, TrendingUp } from 'lucide-react';
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

    // FIXED: Filter out complimentary bills first
    const paidBills = bills.filter(bill => bill.paymentMethod !== 'complimentary');
    console.log('Paid bills (excluding complimentary):', paidBills.length);

    // Filter bills by date range if provided
    const filteredBills = paidBills.filter(bill => {
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
    let totalCreditAmount = 0;
    let cashOnlyCount = 0;
    let upiOnlyCount = 0;
    let creditOnlyCount = 0;
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
      } else if (bill.paymentMethod === 'credit') {
        totalCreditAmount += bill.total;
        creditOnlyCount++;
      }
    });

    // Total revenue is the sum of all payment amounts
    const totalRevenue = totalCashAmount + totalUpiAmount + totalCreditAmount;
    
    // Calculate additional insights
    const totalTransactions = filteredBills.length;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    // Calculate payment method preferences
    const cashPreference = totalRevenue > 0 ? (totalCashAmount / totalRevenue) * 100 : 0;
    const upiPreference = totalRevenue > 0 ? (totalUpiAmount / totalRevenue) * 100 : 0;
    const creditPreference = totalRevenue > 0 ? (totalCreditAmount / totalRevenue) * 100 : 0;
    
    // Calculate average amounts per payment method
    const avgCashTransaction = cashOnlyCount > 0 ? (totalCashAmount - splitCashTotal) / cashOnlyCount : 0;
    const avgUpiTransaction = upiOnlyCount > 0 ? (totalUpiAmount - splitUpiTotal) / upiOnlyCount : 0;
    const avgCreditTransaction = creditOnlyCount > 0 ? totalCreditAmount / creditOnlyCount : 0;
    const avgSplitTransaction = splitCount > 0 ? (splitCashTotal + splitUpiTotal) / splitCount : 0;
    
    console.log('Final calculation breakdown:', {
      cashOnlyBills: { count: cashOnlyCount, amount: totalCashAmount - splitCashTotal },
      upiOnlyBills: { count: upiOnlyCount, amount: totalUpiAmount - splitUpiTotal },
      creditOnlyBills: { count: creditOnlyCount, amount: totalCreditAmount },
      splitBills: { count: splitCount, cashPortion: splitCashTotal, upiPortion: splitUpiTotal },
      totals: {
        totalCashAmount,
        totalUpiAmount,
        totalCreditAmount,
        calculatedRevenue: totalRevenue,
        directSumOfAllBills: debugTotalSum,
        difference: Math.abs(totalRevenue - debugTotalSum)
      },
      insights: {
        averageTransactionValue,
        cashPreference,
        upiPreference,
        creditPreference,
        avgCashTransaction,
        avgUpiTransaction,
        avgCreditTransaction,
        avgSplitTransaction
      }
    });
    
    console.log('=== End Debug ===');

    return {
      chartData: [
        { method: 'Cash', amount: totalCashAmount, count: cashOnlyCount + splitCount, color: '#10B981' },
        { method: 'UPI', amount: totalUpiAmount, count: upiOnlyCount + splitCount, color: '#8B5CF6' },
        { method: 'Credit', amount: totalCreditAmount, count: creditOnlyCount, color: '#F59E0B' }
      ].filter(item => item.amount > 0), // Only show payment methods that have been used
      totalRevenue,
      totalTransactions,
      averageTransactionValue,
      cashPreference,
      upiPreference,
      creditPreference,
      avgCashTransaction,
      avgUpiTransaction,
      avgCreditTransaction,
      avgSplitTransaction,
      splitBreakdown: {
        cash: splitCashTotal,
        upi: splitUpiTotal,
        total: splitCashTotal + splitUpiTotal,
        count: splitCount
      },
      paymentMethodCounts: {
        cashOnly: cashOnlyCount,
        upiOnly: upiOnlyCount,
        creditOnly: creditOnlyCount,
        split: splitCount
      }
    };
  }, [bills, startDate, endDate]);

  return (
    <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-green-500/20 hover:border-green-500/30 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700/30">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-green-400" />
          Payment Analytics
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-green-400" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-200">Total Sales</span>
              <span className="font-bold text-xl text-green-400">
                <CurrencyDisplay amount={paymentData.totalRevenue} />
              </span>
            </div>
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
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {paymentData.chartData.map((item, index) => (
              <div key={index} className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-3 hover:bg-gray-700/30 hover:border-gray-600/50 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-200" 
                      style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}30` }}
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{item.method}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      <CurrencyDisplay amount={item.amount} />
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.count} transactions
                      {paymentData.totalRevenue > 0 && 
                        ` (${((item.amount / paymentData.totalRevenue) * 100).toFixed(1)}%)`
                      }
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Insights Section */}
          <div className="pt-2 border-t border-gray-700/30 space-y-3">
            <h4 className="text-sm font-medium text-gray-200 mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              Transaction Insights
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Total Transactions</p>
                  <p className="text-lg font-bold text-white">{paymentData.totalTransactions}</p>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Avg Transaction</p>
                  <p className="text-lg font-bold text-white">
                    <CurrencyDisplay amount={paymentData.averageTransactionValue} />
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Cash Preference</p>
                  <p className="text-lg font-bold text-green-400">{paymentData.cashPreference.toFixed(1)}%</p>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-center">
                  <p className="text-xs text-gray-400">UPI Preference</p>
                  <p className="text-lg font-bold text-purple-400">{paymentData.upiPreference.toFixed(1)}%</p>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Credit Preference</p>
                  <p className="text-lg font-bold text-yellow-400">{paymentData.creditPreference.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Average Transaction Values */}
          <div className="pt-2 border-t border-gray-700/30 space-y-2">
            <h4 className="text-sm font-medium text-gray-200 mb-2">Avg by Payment Method</h4>
            
            {paymentData.paymentMethodCounts.cashOnly > 0 && (
              <div className="bg-gray-800/40 rounded-lg p-2 border border-gray-700/30">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Avg Cash Only:</span>
                  <span className="font-medium text-white">
                    <CurrencyDisplay amount={paymentData.avgCashTransaction} />
                  </span>
                </div>
              </div>
            )}
            
            {paymentData.paymentMethodCounts.upiOnly > 0 && (
              <div className="bg-gray-800/40 rounded-lg p-2 border border-gray-700/30">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Avg UPI Only:</span>
                  <span className="font-medium text-white">
                    <CurrencyDisplay amount={paymentData.avgUpiTransaction} />
                  </span>
                </div>
              </div>
            )}

            {paymentData.paymentMethodCounts.creditOnly > 0 && (
              <div className="bg-gray-800/40 rounded-lg p-2 border border-gray-700/30">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Avg Credit Only:</span>
                  <span className="font-medium text-white">
                    <CurrencyDisplay amount={paymentData.avgCreditTransaction} />
                  </span>
                </div>
              </div>
            )}
            
            {paymentData.paymentMethodCounts.split > 0 && (
              <div className="bg-gray-800/40 rounded-lg p-2 border border-gray-700/30">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Avg Split Payment:</span>
                  <span className="font-medium text-white">
                    <CurrencyDisplay amount={paymentData.avgSplitTransaction} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {paymentData.splitBreakdown.count > 0 && (
            <div className="pt-2 border-t border-gray-700/30">
              <h4 className="text-sm font-medium text-gray-200 mb-2">Split Payment Details</h4>
              <div className="space-y-2">
                <div className="bg-gray-800/40 rounded-lg p-2 border border-gray-700/30">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Split transactions:</span>
                    <span className="text-white">{paymentData.splitBreakdown.count}</span>
                  </div>
                </div>
                <div className="bg-gray-800/40 rounded-lg p-2 border border-gray-700/30">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Cash portion:</span>
                    <span className="text-white"><CurrencyDisplay amount={paymentData.splitBreakdown.cash} /></span>
                  </div>
                </div>
                <div className="bg-gray-800/40 rounded-lg p-2 border border-gray-700/30">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">UPI portion:</span>
                    <span className="text-white"><CurrencyDisplay amount={paymentData.splitBreakdown.upi} /></span>
                  </div>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-2 border border-gray-700/30">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-300">Split total:</span>
                    <span className="text-green-400"><CurrencyDisplay amount={paymentData.splitBreakdown.total} /></span>
                  </div>
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
