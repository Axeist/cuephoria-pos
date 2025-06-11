
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

const DailySalesTrendWidget: React.FC = () => {
  const { bills } = usePOS();

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = startOfDay(subDays(new Date(), 6 - i));
      return {
        date,
        dateStr: format(date, 'MMM dd'),
        sales: 0
      };
    });

    // Group bills by date and calculate daily sales
    bills.forEach(bill => {
      const billDate = startOfDay(new Date(bill.createdAt));
      const dayData = last7Days.find(day => 
        day.date.getTime() === billDate.getTime()
      );
      
      if (dayData) {
        dayData.sales += bill.total;
      }
    });

    return last7Days.map(({ dateStr, sales }) => ({ date: dateStr, sales }));
  }, [bills]);

  const totalSales = chartData.reduce((sum, day) => sum + day.sales, 0);
  const avgDailySales = totalSales / 7;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Daily Sales Trend</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
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
                formatter={(value: number) => [`₹${value}`, 'Sales']}
              />
              <Line 
                type="monotone" 
                dataKey="sales" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">7-day average:</span>
          <span className="font-medium">₹{Math.round(avgDailySales)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailySalesTrendWidget;
