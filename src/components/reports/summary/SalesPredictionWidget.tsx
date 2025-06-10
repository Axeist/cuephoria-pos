
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { format, addDays, subDays } from 'date-fns';

interface Bill {
  id: string;
  total: number;
  createdAt: Date | string;
}

interface SalesPredictionWidgetProps {
  bills: Bill[];
}

const SalesPredictionWidget: React.FC<SalesPredictionWidgetProps> = ({ bills }) => {
  const predictions = React.useMemo(() => {
    // Get last 30 days of data for prediction
    const endDate = new Date();
    const startDate = subDays(endDate, 30);
    
    const dailySales: Record<string, number> = {};
    
    // Aggregate daily sales
    bills.forEach(bill => {
      const billDate = bill.createdAt instanceof Date ? bill.createdAt : new Date(bill.createdAt);
      if (billDate >= startDate && billDate <= endDate) {
        const dateKey = format(billDate, 'yyyy-MM-dd');
        dailySales[dateKey] = (dailySales[dateKey] || 0) + bill.total;
      }
    });

    const salesData = Object.entries(dailySales)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (salesData.length < 7) {
      return {
        nextWeekPrediction: 0,
        nextMonthPrediction: 0,
        trend: 'insufficient_data',
        confidence: 0,
        historicalData: [],
        predictedData: []
      };
    }

    // Simple moving average prediction
    const recentDays = salesData.slice(-7);
    const avgDailySales = recentDays.reduce((sum, day) => sum + day.amount, 0) / recentDays.length;
    
    // Calculate trend
    const firstHalf = salesData.slice(0, Math.floor(salesData.length / 2));
    const secondHalf = salesData.slice(Math.floor(salesData.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.amount, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.amount, 0) / secondHalf.length;
    
    const trendDirection = secondHalfAvg > firstHalfAvg ? 'increasing' : 
                          secondHalfAvg < firstHalfAvg ? 'decreasing' : 'stable';
    
    const trendFactor = secondHalfAvg / firstHalfAvg;
    
    // Predict next 7 days
    const predictions = [];
    for (let i = 1; i <= 7; i++) {
      const predictedDate = addDays(endDate, i);
      const baseAmount = avgDailySales;
      // Apply trend factor with diminishing effect
      const trendAdjustment = Math.pow(trendFactor, 0.1 * i);
      const predictedAmount = baseAmount * trendAdjustment;
      
      predictions.push({
        date: format(predictedDate, 'yyyy-MM-dd'),
        displayDate: format(predictedDate, 'MMM dd'),
        amount: predictedAmount
      });
    }

    // Prepare historical data for chart (last 14 days)
    const historicalData = salesData.slice(-14).map(day => ({
      ...day,
      displayDate: format(new Date(day.date), 'MMM dd')
    }));

    // Add the last historical point to predictions for continuity
    const lastHistoricalPoint = historicalData[historicalData.length - 1];
    const predictedData = lastHistoricalPoint ? [lastHistoricalPoint, ...predictions] : predictions;

    const nextWeekPrediction = predictions.reduce((sum, day) => sum + day.amount, 0);
    const nextMonthPrediction = nextWeekPrediction * 4.3; // Approximate month

    // Calculate confidence based on data consistency
    const salesVariance = recentDays.reduce((sum, day) => 
      sum + Math.pow(day.amount - avgDailySales, 2), 0) / recentDays.length;
    const coefficient = salesVariance / (avgDailySales * avgDailySales);
    const confidence = Math.max(0, Math.min(100, 100 - (coefficient * 100)));

    return {
      nextWeekPrediction,
      nextMonthPrediction,
      trend: trendDirection,
      confidence,
      historicalData,
      predictedData,
      avgDailySales
    };
  }, [bills]);

  const getTrendColor = () => {
    switch (predictions.trend) {
      case 'increasing': return 'text-green-500';
      case 'decreasing': return 'text-red-500';
      case 'stable': return 'text-yellow-500';
      default: return 'text-gray-400';
    }
  };

  const getTrendIcon = () => {
    switch (predictions.trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4" />;
      case 'decreasing': return <TrendingUp className="h-4 w-4 rotate-180" />;
      case 'stable': return <Calendar className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (predictions.trend === 'insufficient_data') {
    return (
      <Card className="border-gray-800 bg-[#1A1F2C] shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            Sales Predictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-600" />
            <p className="text-lg font-medium">Insufficient Data</p>
            <p className="text-sm">Need at least 7 days of sales data for predictions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-800 bg-[#1A1F2C] shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            Sales Predictions
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`${getTrendColor()} border-current`}
            >
              {getTrendIcon()}
              {predictions.trend}
            </Badge>
            <Badge variant="outline" className="border-gray-600 text-gray-400">
              {predictions.confidence.toFixed(0)}% confidence
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-purple-900/20 border border-purple-800">
            <div className="text-xl font-bold text-white">
              <CurrencyDisplay amount={predictions.nextWeekPrediction} />
            </div>
            <div className="text-sm text-purple-400">Next 7 Days</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-900/20 border border-blue-800">
            <div className="text-xl font-bold text-white">
              <CurrencyDisplay amount={predictions.nextMonthPrediction} />
            </div>
            <div className="text-sm text-blue-400">Next 30 Days</div>
          </div>
        </div>

        <div className="h-48 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="displayDate" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `₹${value.toFixed(0)}`,
                  name === 'amount' ? 'Sales' : name
                ]}
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#F9FAFB'
                }}
              />
              {/* Historical data line */}
              <Line 
                data={predictions.historicalData}
                type="monotone" 
                dataKey="amount" 
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 3 }}
              />
              {/* Predicted data line */}
              <Line 
                data={predictions.predictedData}
                type="monotone" 
                dataKey="amount" 
                stroke="#8B5CF6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="text-center text-sm text-gray-400">
          <p>Predictions based on {predictions.historicalData.length} days of historical data</p>
          <p>Daily average: <CurrencyDisplay amount={predictions.avgDailySales} /></p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesPredictionWidget;
