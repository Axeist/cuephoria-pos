
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { CreditCard, Smartphone, Banknote } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

interface Bill {
  paymentMethod: string;
  total: number;
  isSpliPayment?: boolean;
  cashAmount?: number;
  upiAmount?: number;
}

interface PaymentMethodAnalyticsProps {
  bills: Bill[];
}

const PaymentMethodAnalytics: React.FC<PaymentMethodAnalyticsProps> = ({ bills }) => {
  const paymentData = React.useMemo(() => {
    let cashTotal = 0;
    let upiTotal = 0;
    let splitPayments = 0;

    bills.forEach(bill => {
      if (bill.isSpliPayment) {
        splitPayments++;
        cashTotal += bill.cashAmount || 0;
        upiTotal += bill.upiAmount || 0;
      } else if (bill.paymentMethod === 'cash') {
        cashTotal += bill.total;
      } else if (bill.paymentMethod === 'upi') {
        upiTotal += bill.total;
      }
    });

    const totalRevenue = cashTotal + upiTotal;
    
    return {
      cash: {
        amount: cashTotal,
        percentage: totalRevenue > 0 ? (cashTotal / totalRevenue) * 100 : 0,
        count: bills.filter(b => b.paymentMethod === 'cash' || (b.isSpliPayment && (b.cashAmount || 0) > 0)).length
      },
      upi: {
        amount: upiTotal,
        percentage: totalRevenue > 0 ? (upiTotal / totalRevenue) * 100 : 0,
        count: bills.filter(b => b.paymentMethod === 'upi' || (b.isSpliPayment && (b.upiAmount || 0) > 0)).length
      },
      splitPayments,
      totalRevenue
    };
  }, [bills]);

  const pieData = [
    { name: 'Cash', value: paymentData.cash.amount, color: '#22C55E' },
    { name: 'UPI', value: paymentData.upi.amount, color: '#3B82F6' }
  ];

  const barData = [
    { method: 'Cash', amount: paymentData.cash.amount, count: paymentData.cash.count },
    { method: 'UPI', amount: paymentData.upi.amount, count: paymentData.upi.count }
  ];

  return (
    <Card className="border-gray-800 bg-[#1A1F2C] shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-500" />
          Payment Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-4">Revenue Distribution</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toFixed(0)}`, 'Amount']}
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#F9FAFB'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-900/20 border border-green-800">
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-white font-medium">Cash Payments</div>
                  <div className="text-sm text-gray-400">{paymentData.cash.count} transactions</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">
                  <CurrencyDisplay amount={paymentData.cash.amount} />
                </div>
                <div className="text-sm text-green-400">
                  {paymentData.cash.percentage.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-900/20 border border-blue-800">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-white font-medium">UPI Payments</div>
                  <div className="text-sm text-gray-400">{paymentData.upi.count} transactions</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold">
                  <CurrencyDisplay amount={paymentData.upi.amount} />
                </div>
                <div className="text-sm text-blue-400">
                  {paymentData.upi.percentage.toFixed(1)}%
                </div>
              </div>
            </div>

            {paymentData.splitPayments > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-900/20 border border-purple-800">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="text-white font-medium">Split Payments</div>
                    <div className="text-sm text-gray-400">Mixed payment method</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">{paymentData.splitPayments}</div>
                  <div className="text-sm text-purple-400">transactions</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Count Comparison */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-400 mb-4">Transaction Volume</h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="method" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'count' ? `${value} transactions` : `₹${value.toFixed(0)}`,
                    name === 'count' ? 'Count' : 'Amount'
                  ]}
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#F9FAFB'
                  }}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentMethodAnalytics;
