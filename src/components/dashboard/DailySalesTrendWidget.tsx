import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, BarChart3, Loader2 } from 'lucide-react';
import { format, subDays, startOfDay, startOfYear, parseISO } from 'date-fns';
import { CurrencyDisplay } from '@/components/ui/currency';
import { useSummaryAnalytics } from '@/context/SummaryAnalyticsContext';

const DailySalesTrendWidget: React.FC = () => {
  const { dailySeries, loading } = useSummaryAnalytics();
  const [selectedPeriod, setSelectedPeriod] = useState<'7days' | '30days' | 'year'>('7days');

  const chartData = useMemo(() => {
    if (selectedPeriod === 'year') {
      const now = new Date();
      const yearStart = startOfYear(now);
      const months = Array.from({ length: now.getMonth() + 1 }, (_, i) => ({
        dateStr: format(new Date(now.getFullYear(), i, 1), 'MMM yyyy'),
        sales: 0,
      }));

      dailySeries.forEach((point) => {
        const d = parseISO(point.day);
        if (d >= yearStart && d <= now) {
          months[d.getMonth()].sales += point.revenue;
        }
      });

      return months.map(({ dateStr, sales }) => ({ date: dateStr, sales }));
    }

    const days = selectedPeriod === '30days' ? 30 : 7;
    const periodDays = Array.from({ length: days }, (_, i) => {
      const date = startOfDay(subDays(new Date(), days - 1 - i));
      return {
        date,
        dateStr: format(date, 'MMM dd'),
        sales: 0,
      };
    });

    dailySeries.forEach((point) => {
      const billDate = startOfDay(parseISO(point.day));
      const dayData = periodDays.find((day) => day.date.getTime() === billDate.getTime());
      if (dayData) dayData.sales += point.revenue;
    });

    return periodDays.map(({ dateStr, sales }) => ({ date: dateStr, sales }));
  }, [dailySeries, selectedPeriod]);

  const metrics = useMemo(() => {
    const totalSales = chartData.reduce((sum, day) => sum + day.sales, 0);
    const periodAverage = chartData.length > 0 ? totalSales / chartData.length : 0;
    return { totalSales, periodAverage };
  }, [chartData]);

  return (
    <Card className="glass-card glass-card-interactive border-white/10 shadow-xl hover:shadow-blue-500/20 hover:border-blue-500/30 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-white/10">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          Daily Sales Trend
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-blue-400" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['7days', '30days', 'year'] as const).map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                  className={`text-xs transition-all duration-200 ${
                    selectedPeriod === period
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-white/[0.06] border-white/10 text-white/70 hover:bg-white/10 hover:border-white/15'
                  }`}
                >
                  {period === '7days' ? '7 Days' : period === '30days' ? '30 Days' : 'This Year'}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="theme-inset p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-green-400" />
                  <p className="text-xs text-white/55">Total Sales</p>
                </div>
                <p className="text-lg font-bold text-green-400">
                  <CurrencyDisplay amount={metrics.totalSales} />
                </p>
              </div>
              <div className="theme-inset p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-purple-400" />
                  <p className="text-xs text-white/55">
                    {selectedPeriod === 'year' ? 'Monthly Avg' : 'Daily Avg'}
                  </p>
                </div>
                <p className="text-lg font-bold text-purple-400">
                  <CurrencyDisplay amount={metrics.periodAverage} />
                </p>
              </div>
            </div>

            <div className="theme-inset p-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `₹${value}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: '#F9FAFB',
                      }}
                      formatter={(value: number) => [`₹${value}`, 'Sales']}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#8B5CF6"
                      strokeWidth={3}
                      dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#8B5CF6', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailySalesTrendWidget;
