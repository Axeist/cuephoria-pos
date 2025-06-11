
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePOS } from '@/context/POSContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, subDays, startOfDay, startOfYear } from 'date-fns';

interface DailySalesTrendWidgetProps {
  dateRange?: { start: Date; end: Date } | null;
}

const DailySalesTrendWidget: React.FC<DailySalesTrendWidgetProps> = ({ dateRange }) => {
  const { bills } = usePOS();
  const [activeFilter, setActiveFilter] = useState<'7days' | '30days' | 'year'>('7days');

  const chartData = useMemo(() => {
    // Use dateRange if provided, otherwise use filter buttons
    let startDate: Date;
    let endDate: Date = new Date();
    
    if (dateRange) {
      startDate = dateRange.start;
      endDate = dateRange.end;
    } else {
      switch (activeFilter) {
        case '7days':
          startDate = subDays(endDate, 6);
          break;
        case '30days':
          startDate = subDays(endDate, 29);
          break;
        case 'year':
          startDate = startOfYear(endDate);
          break;
        default:
          startDate = subDays(endDate, 6);
      }
    }

    // Generate date range array
    const dates = [];
    let currentDate = startOfDay(startDate);
    const endDateDay = startOfDay(endDate);
    
    while (currentDate <= endDateDay) {
      dates.push({
        date: new Date(currentDate),
        dateStr: format(currentDate, activeFilter === 'year' ? 'MMM' : 'MMM dd'),
        sales: 0
      });
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Group bills by date and calculate daily sales
    bills.forEach(bill => {
      const billDate = startOfDay(new Date(bill.createdAt));
      const dayData = dates.find(day => 
        day.date.getTime() === billDate.getTime()
      );
      
      if (dayData) {
        dayData.sales += bill.total;
      }
    });

    return dates.map(({ dateStr, sales }) => ({ date: dateStr, sales }));
  }, [bills, activeFilter, dateRange]);

  const totalSales = chartData.reduce((sum, day) => sum + day.sales, 0);
  const avgDailySales = chartData.length > 0 ? totalSales / chartData.length : 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Daily Sales Trend</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        {/* Filter Buttons - only show if no dateRange is provided */}
        {!dateRange && (
          <div className="flex space-x-2 mb-4">
            <Button
              variant={activeFilter === '7days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('7days')}
              className="text-xs"
            >
              7 Days
            </Button>
            <Button
              variant={activeFilter === '30days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('30days')}
              className="text-xs"
            >
              30 Days
            </Button>
            <Button
              variant={activeFilter === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('year')}
              className="text-xs"
            >
              This Year
            </Button>
          </div>
        )}

        <div className="h-48 flex-1">
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
          <span className="text-muted-foreground">Daily average:</span>
          <span className="font-medium">₹{Math.round(avgDailySales)}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total sales:</span>
          <span className="font-medium">₹{Math.round(totalSales)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailySalesTrendWidget;
