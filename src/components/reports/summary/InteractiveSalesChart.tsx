
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, BarChart as BarChartIcon } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface Bill {
  id: string;
  total: number;
  createdAt: Date | string;
  paymentMethod: string;
}

interface InteractiveSalesChartProps {
  bills: Bill[];
}

type ChartType = 'line' | 'area' | 'bar';
type TimeRange = '7d' | '30d' | '90d';

const InteractiveSalesChart: React.FC<InteractiveSalesChartProps> = ({ bills }) => {
  const [chartType, setChartType] = useState<ChartType>('area');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const chartData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);

    const dateMap = new Map();
    
    // Initialize all dates with 0 values
    for (let i = 0; i < days; i++) {
      const date = subDays(endDate, days - 1 - i);
      const dateKey = format(date, 'yyyy-MM-dd');
      dateMap.set(dateKey, {
        date: dateKey,
        displayDate: format(date, 'MMM dd'),
        total: 0,
        cash: 0,
        upi: 0,
        transactions: 0
      });
    }

    // Aggregate bills by date
    bills.forEach(bill => {
      const billDate = bill.createdAt instanceof Date ? bill.createdAt : new Date(bill.createdAt);
      const dateKey = format(billDate, 'yyyy-MM-dd');
      
      if (dateMap.has(dateKey)) {
        const dayData = dateMap.get(dateKey);
        dayData.total += bill.total;
        dayData.transactions += 1;
        
        if (bill.paymentMethod === 'cash') {
          dayData.cash += bill.total;
        } else if (bill.paymentMethod === 'upi') {
          dayData.upi += bill.total;
        }
      }
    });

    return Array.from(dateMap.values());
  }, [bills, timeRange]);

  const totalSales = useMemo(() => {
    return chartData.reduce((sum, day) => sum + day.total, 0);
  }, [chartData]);

  const averageDailySales = useMemo(() => {
    const activeDays = chartData.filter(day => day.total > 0).length;
    return activeDays > 0 ? totalSales / activeDays : 0;
  }, [chartData, totalSales]);

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="displayDate" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#F9FAFB'
              }}
              formatter={(value: number) => [`₹${value.toFixed(0)}`, 'Sales']}
            />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#8B5CF6" 
              strokeWidth={3}
              dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="displayDate" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#F9FAFB'
              }}
              formatter={(value: number) => [`₹${value.toFixed(0)}`, 'Sales']}
            />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#8B5CF6" 
              fill="url(#salesGradient)"
              strokeWidth={2}
            />
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
          </AreaChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="displayDate" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#F9FAFB'
              }}
              formatter={(value: number) => [`₹${value.toFixed(0)}`, 'Sales']}
            />
            <Bar dataKey="total" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="border-gray-800 bg-[#1A1F2C] shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Sales Trends
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
              <SelectTrigger className="w-24 bg-gray-800 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="7d">7D</SelectItem>
                <SelectItem value="30d">30D</SelectItem>
                <SelectItem value="90d">90D</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex rounded-lg bg-gray-800/60 p-1">
              {(['line', 'area', 'bar'] as ChartType[]).map((type) => (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  onClick={() => setChartType(type)}
                  className={`px-3 py-1 text-xs ${
                    chartType === type 
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {type === 'line' && '📈'}
                  {type === 'area' && '🔵'}
                  {type === 'bar' && '📊'}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">₹{totalSales.toFixed(0)}</div>
            <div className="text-sm text-gray-400">Total Sales</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">₹{averageDailySales.toFixed(0)}</div>
            <div className="text-sm text-gray-400">Avg Daily Sales</div>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default InteractiveSalesChart;
