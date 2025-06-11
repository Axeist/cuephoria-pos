
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePOS } from '@/context/POSContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, subDays, startOfDay, startOfYear } from 'date-fns';
import { CurrencyDisplay } from '@/components/ui/currency';

interface DailySalesTrendWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

const DailySalesTrendWidget: React.FC<DailySalesTrendWidgetProps> = ({ startDate, endDate }) => {
  const { bills } = usePOS();
  const [selectedPeriod, setSelectedPeriod] = useState<'7days' | '30days' | 'year'>('7days');

  const chartData = useMemo(() => {
    let days = 7;
    let dateFormat = 'MMM dd';
    
    if (selectedPeriod === '30days') {
      days = 30;
      dateFormat = 'MMM dd';
    } else if (selectedPeriod === 'year') {
      // For year view, group by months
      const months = [];
      const now = new Date();
      const yearStart = startOfYear(now);
      
      for (let i = 0; i <= now.getMonth(); i++) {
        const monthDate = new Date(now.getFullYear(), i, 1);
        months.push({
          date: monthDate,
          dateStr: format(monthDate, 'MMM yyyy'),
          sales: 0
        });
      }

      bills.forEach(bill => {
        const billDate = new Date(bill.createdAt);
        if (billDate >= yearStart && billDate <= now) {
          const monthIndex = billDate.getMonth();
          if (months[monthIndex]) {
            months[monthIndex].sales += bill.total;
          }
        }
      });

      return months.map(({ dateStr, sales }) => ({ date: dateStr, sales }));
    }

    const periodDays = Array.from({ length: days }, (_, i) => {
      const date = startOfDay(subDays(new Date(), days - 1 - i));
      return {
        date,
        dateStr: format(date, dateFormat),
        sales: 0
      };
    });

    // Filter bills by date range if provided, otherwise use all bills
    const filteredBills = bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      if (startDate && endDate) {
        return billDate >= startDate && billDate <= endDate;
      }
      return true;
    });

    filteredBills.forEach(bill => {
      const billDate = startOfDay(new Date(bill.createdAt));
      const dayData = periodDays.find(day => 
        day.date.getTime() === billDate.getTime()
      );
      
      if (dayData) {
        dayData.sales += bill.total;
      }
    });

    return periodDays.map(({ dateStr, sales }) => ({ date: dateStr, sales }));
  }, [bills, selectedPeriod, startDate, endDate]);

  const metrics = useMemo(() => {
    const totalSales = chartData.reduce((sum, day) => sum + day.sales, 0);
    const validDays = chartData.filter(day => day.sales > 0).length;
    const avgDailySales = validDays > 0 ? totalSales / validDays : 0;
    const periodAverage = chartData.length > 0 ? totalSales / chartData.length : 0;
    
    return {
      totalSales,
      avgDailySales,
      periodAverage: selectedPeriod === 'year' ? totalSales / 12 : periodAverage
    };
  }, [chartData, selectedPeriod]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Daily Sales Trend</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={selectedPeriod === '7days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('7days')}
              className="text-xs"
            >
              7 Days
            </Button>
            <Button
              variant={selectedPeriod === '30days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('30days')}
              className="text-xs"
            >
              30 Days
            </Button>
            <Button
              variant={selectedPeriod === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('year')}
              className="text-xs"
            >
              This Year
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Sales</p>
              <p className="text-sm font-bold">
                <CurrencyDisplay amount={metrics.totalSales} />
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {selectedPeriod === 'year' ? 'Monthly Avg' : 'Daily Avg'}
              </p>
              <p className="text-sm font-medium">
                <CurrencyDisplay amount={metrics.periodAverage} />
              </p>
            </div>
          </div>

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

          <div className="flex items-center justify-between text-sm border-t border-gray-700 pt-2">
            <span className="text-muted-foreground">
              {selectedPeriod === '7days' ? '7-day' : selectedPeriod === '30days' ? '30-day' : 'Monthly'} average:
            </span>
            <span className="font-medium">
              <CurrencyDisplay amount={metrics.periodAverage} />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailySalesTrendWidget;
