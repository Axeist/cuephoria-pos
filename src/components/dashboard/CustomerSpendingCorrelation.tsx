
import React, { useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import { useLocationAnalytics } from '@/hooks/useLocationAnalytics';

const CustomerSpendingCorrelation: React.FC = () => {
  const { topCustomers, loading } = useLocationAnalytics();

  const correlationData = useMemo(
    () =>
      topCustomers.map((c) => ({
        name: c.name,
        visits: c.billCount,
        spending: c.totalSpent,
        averageSpending: c.billCount > 0 ? c.totalSpent / c.billCount : 0,
        value: Math.min(20, Math.max(5, c.totalSpent / 200)),
      })),
    [topCustomers]
  );

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="h-[300px] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    );
  }

  if (correlationData.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white font-heading">Customer Spending Analysis</CardTitle>
          <CardDescription className="text-gray-400">Correlation between visits and spending</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-gray-400">Not enough customer data to display correlation</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-white font-heading">Customer Spending Analysis</CardTitle>
            <CardDescription className="text-gray-400">Correlation between visits and spending</CardDescription>
          </div>
          <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[300px] pt-4">
        <ChartContainer
          config={{ spending: { label: 'Customer Spending', theme: { light: '#8B5CF6', dark: '#8B5CF6' } } }}
          className="h-full w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" dataKey="visits" name="Visits" stroke="#777" />
              <YAxis type="number" dataKey="spending" name="Total Spending" stroke="#777" />
              <ZAxis type="number" dataKey="value" range={[5, 20]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="spending" data={correlationData} fill="#8B5CF6" opacity={0.8} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default CustomerSpendingCorrelation;
