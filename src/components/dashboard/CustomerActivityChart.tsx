
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Loader2 } from 'lucide-react';
import { useLocationAnalytics } from '@/hooks/useLocationAnalytics';

const CustomerActivityChart: React.FC = () => {
  const { topCustomersByCount, loading } = useLocationAnalytics();

  const chartData = topCustomersByCount.map((c) => ({
    name: c.name.split(' ')[0],
    transactions: c.billCount,
  }));

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-white font-heading">Customer Activity</CardTitle>
            <CardDescription className="text-gray-400">Top 5 most active customers</CardDescription>
          </div>
          <div className="h-10 w-10 rounded-full bg-[#10B981]/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-[#10B981]" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[300px] pt-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#10B981]" />
          </div>
        ) : (
          <ChartContainer
            config={{ transactions: { label: 'Transactions', theme: { light: '#10B981', dark: '#10B981' } } }}
            className="h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid stroke="#333" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#777" axisLine={false} tickLine={false} />
                <YAxis stroke="#777" axisLine={false} tickLine={false} width={30} />
                <Tooltip />
                <Bar dataKey="transactions" name="transactions" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerActivityChart;
