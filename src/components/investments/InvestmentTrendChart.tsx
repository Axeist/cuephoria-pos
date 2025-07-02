
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { InvestmentTransaction } from '@/types/investment.types';
import { format } from 'date-fns';

interface InvestmentTrendChartProps {
  transactions: InvestmentTransaction[];
}

const InvestmentTrendChart: React.FC<InvestmentTrendChartProps> = ({ transactions }) => {
  const chartData = useMemo(() => {
    const completedTransactions = transactions.filter(t => t.status === 'completed');
    
    // Group transactions by month
    const monthlyData = completedTransactions.reduce((acc, transaction) => {
      const month = format(new Date(transaction.transaction_date), 'yyyy-MM');
      
      if (!acc[month]) {
        acc[month] = {
          month,
          investments: 0,
          dividends: 0,
          withdrawals: 0,
          returns: 0,
          net: 0
        };
      }
      
      switch (transaction.transaction_type) {
        case 'investment':
          acc[month].investments += transaction.amount;
          break;
        case 'dividend':
          acc[month].dividends += transaction.amount;
          break;
        case 'withdrawal':
          acc[month].withdrawals += transaction.amount;
          break;
        case 'return':
          acc[month].returns += transaction.amount;
          break;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    // Calculate net for each month and sort by date
    return Object.values(monthlyData)
      .map((data: any) => ({
        ...data,
        net: data.investments - data.withdrawals + data.dividends + data.returns,
        monthLabel: format(new Date(data.month + '-01'), 'MMM yyyy')
      }))
      .sort((a: any, b: any) => a.month.localeCompare(b.month));
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(value);
  };

  return (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Investment Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="monthLabel" 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#F3F4F6' }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name.charAt(0).toUpperCase() + name.slice(1)
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="investments" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="investments"
                />
                <Line 
                  type="monotone" 
                  dataKey="dividends" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="dividends"
                />
                <Line 
                  type="monotone" 
                  dataKey="net" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  name="net flow"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="monthLabel" 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#F3F4F6' }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name.charAt(0).toUpperCase() + name.slice(1)
                  ]}
                />
                <Bar dataKey="investments" fill="#10B981" name="investments" />
                <Bar dataKey="dividends" fill="#3B82F6" name="dividends" />
                <Bar dataKey="withdrawals" fill="#EF4444" name="withdrawals" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentTrendChart;
