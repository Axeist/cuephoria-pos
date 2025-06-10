
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { format, subDays } from 'date-fns';

interface Bill {
  id: string;
  total: number;
  createdAt: Date | string;
}

interface SimplifiedSalesPredictionProps {
  bills: Bill[];
}

const SimplifiedSalesPrediction: React.FC<SimplifiedSalesPredictionProps> = ({ bills }) => {
  const prediction = React.useMemo(() => {
    // Get last 7 days of data
    const endDate = new Date();
    const startDate = subDays(endDate, 7);
    
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(endDate, i);
      const dayBills = bills.filter(bill => {
        const billDate = bill.createdAt instanceof Date ? bill.createdAt : new Date(bill.createdAt);
        return billDate.toDateString() === date.toDateString();
      });
      
      const dayTotal = dayBills.reduce((sum, bill) => sum + bill.total, 0);
      last7Days.push({
        date: format(date, 'MMM dd'),
        amount: dayTotal
      });
    }

    // Calculate average and predict tomorrow
    const avgDaily = last7Days.reduce((sum, day) => sum + day.amount, 0) / 7;
    const todayAmount = last7Days[last7Days.length - 1]?.amount || 0;
    
    // Simple trend calculation
    const firstHalf = last7Days.slice(0, 3).reduce((sum, day) => sum + day.amount, 0) / 3;
    const secondHalf = last7Days.slice(4).reduce((sum, day) => sum + day.amount, 0) / 3;
    
    const isIncreasing = secondHalf > firstHalf;
    const trendPercentage = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
    
    return {
      chartData: last7Days,
      avgDaily,
      todayAmount,
      tomorrowPrediction: avgDaily * (isIncreasing ? 1.1 : 0.9),
      isIncreasing,
      trendPercentage: Math.abs(trendPercentage)
    };
  }, [bills]);

  return (
    <Card className="border-gray-800 bg-[#1A1F2C] shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Sales Forecast
          </CardTitle>
          <Badge 
            variant="outline" 
            className={`${prediction.isIncreasing ? 'text-green-400 border-green-800' : 'text-red-400 border-red-800'}`}
          >
            {prediction.isIncreasing ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {prediction.trendPercentage.toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-blue-900/20 border border-blue-800">
            <div className="text-lg font-bold text-white">
              <CurrencyDisplay amount={prediction.todayAmount} />
            </div>
            <div className="text-sm text-blue-400">Today</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-purple-900/20 border border-purple-800">
            <div className="text-lg font-bold text-white">
              <CurrencyDisplay amount={prediction.avgDaily} />
            </div>
            <div className="text-sm text-purple-400">7-Day Avg</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-900/20 border border-green-800">
            <div className="text-lg font-bold text-white">
              <CurrencyDisplay amount={prediction.tomorrowPrediction} />
            </div>
            <div className="text-sm text-green-400">Tomorrow</div>
          </div>
        </div>

        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={prediction.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                formatter={(value: number) => [`₹${value.toFixed(0)}`, 'Sales']}
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#F9FAFB'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimplifiedSalesPrediction;
