import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CreditCard, TrendingUp, Loader2 } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { useSummaryAnalytics } from '@/context/SummaryAnalyticsContext';
import type { PaymentBreakdownStats } from '@/hooks/useLocationAnalytics';

function buildPaymentData(payment: PaymentBreakdownStats) {
  const {
    totalRevenue,
    totalTransactions,
    cashTotal,
    upiTotal,
    creditTotal,
    razorpayTotal,
    cashOnlyCount,
    upiOnlyCount,
    creditOnlyCount,
    razorpayOnlyCount,
    splitCount,
    splitCashTotal,
    splitUpiTotal,
  } = payment;

  const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const cashPreference = totalRevenue > 0 ? (cashTotal / totalRevenue) * 100 : 0;
  const upiPreference = totalRevenue > 0 ? (upiTotal / totalRevenue) * 100 : 0;
  const creditPreference = totalRevenue > 0 ? (creditTotal / totalRevenue) * 100 : 0;
  const razorpayPreference = totalRevenue > 0 ? (razorpayTotal / totalRevenue) * 100 : 0;

  const avgCashTransaction = cashOnlyCount > 0 ? (cashTotal - splitCashTotal) / cashOnlyCount : 0;
  const avgUpiTransaction = upiOnlyCount > 0 ? (upiTotal - splitUpiTotal) / upiOnlyCount : 0;
  const avgCreditTransaction = creditOnlyCount > 0 ? creditTotal / creditOnlyCount : 0;
  const avgRazorpayTransaction = razorpayOnlyCount > 0 ? razorpayTotal / razorpayOnlyCount : 0;
  const avgSplitTransaction = splitCount > 0 ? (splitCashTotal + splitUpiTotal) / splitCount : 0;

  return {
    chartData: [
      { method: 'Cash', amount: cashTotal, count: cashOnlyCount + splitCount, color: '#10B981' },
      { method: 'UPI', amount: upiTotal, count: upiOnlyCount + splitCount, color: '#8B5CF6' },
      { method: 'Credit', amount: creditTotal, count: creditOnlyCount, color: '#F59E0B' },
      { method: 'Razorpay', amount: razorpayTotal, count: razorpayOnlyCount, color: '#6366F1' },
    ].filter((item) => item.amount > 0),
    totalRevenue,
    totalTransactions,
    averageTransactionValue,
    cashPreference,
    upiPreference,
    creditPreference,
    razorpayPreference,
    avgCashTransaction,
    avgUpiTransaction,
    avgCreditTransaction,
    avgRazorpayTransaction,
    avgSplitTransaction,
    splitBreakdown: {
      cash: splitCashTotal,
      upi: splitUpiTotal,
      total: splitCashTotal + splitUpiTotal,
      count: splitCount,
    },
    paymentMethodCounts: {
      cashOnly: cashOnlyCount,
      upiOnly: upiOnlyCount,
      creditOnly: creditOnlyCount,
      razorpayOnly: razorpayOnlyCount,
      split: splitCount,
    },
  };
}

const PaymentAnalyticsWidget: React.FC = () => {
  const { payment, loading } = useSummaryAnalytics();

  const paymentData = useMemo(
    () => (payment ? buildPaymentData(payment) : null),
    [payment]
  );

  if (loading || !paymentData) {
    return (
      <Card className="glass-card glass-card-interactive border-white/10 shadow-xl backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-green-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card glass-card-interactive border-white/10 shadow-xl hover:shadow-green-500/20 hover:border-green-500/30 transition-all duration-300 backdrop-blur-sm">
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
          <div className="theme-inset p-4">
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
                <XAxis dataKey="method" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `₹${value}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#F9FAFB',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'amount' ? `₹${Math.round(value)}` : value,
                    name === 'amount' ? 'Revenue' : 'Transactions',
                  ]}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {paymentData.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {paymentData.chartData.map((item, index) => (
              <div key={index} className="theme-inset p-3 hover:border-white/15 transition-all duration-200 group">
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
                        ` (${((item.amount / paymentData.totalRevenue) * 100).toFixed(1)}%)`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-700/30 space-y-3">
            <h4 className="text-sm font-medium text-gray-200 mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              Transaction Insights
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="theme-inset p-3 text-center">
                <p className="text-xs text-gray-400">Total Transactions</p>
                <p className="text-lg font-bold text-white">{paymentData.totalTransactions}</p>
              </div>
              <div className="theme-inset p-3 text-center">
                <p className="text-xs text-gray-400">Avg Transaction</p>
                <p className="text-lg font-bold text-white">
                  <CurrencyDisplay amount={paymentData.averageTransactionValue} />
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="theme-inset p-3 text-center">
                <p className="text-xs text-gray-400">Cash Preference</p>
                <p className="text-lg font-bold text-green-400">{paymentData.cashPreference.toFixed(1)}%</p>
              </div>
              <div className="theme-inset p-3 text-center">
                <p className="text-xs text-gray-400">UPI Preference</p>
                <p className="text-lg font-bold text-purple-400">{paymentData.upiPreference.toFixed(1)}%</p>
              </div>
              <div className="theme-inset p-3 text-center">
                <p className="text-xs text-gray-400">Credit Preference</p>
                <p className="text-lg font-bold text-yellow-400">{paymentData.creditPreference.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentAnalyticsWidget;
