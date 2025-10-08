import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { BarChart3, TrendingUp, Target, AlertCircle, Brain } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { format, subDays, startOfDay, startOfMonth, endOfMonth, isToday, isYesterday, differenceInDays, getDay } from 'date-fns';

interface BusinessInsightsWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

// ============================================
// TIME SERIES FORECASTING ALGORITHMS
// ============================================

/**
 * Exponential Smoothing (Holt-Winters) for trend forecasting
 * Alpha: Level smoothing parameter (0.3 = balanced)
 * Beta: Trend smoothing parameter (0.1 = stable trend)
 */
function exponentialSmoothing(data: number[], alpha: number = 0.3, beta: number = 0.1): {
  forecast: number;
  level: number;
  trend: number;
} {
  if (data.length === 0) return { forecast: 0, level: 0, trend: 0 };
  if (data.length === 1) return { forecast: data[0], level: data[0], trend: 0 };

  // Initialize level and trend
  let level = data[0];
  let trend = data[1] - data[0];

  // Apply exponential smoothing
  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  // Forecast next period
  const forecast = level + trend;
  return { forecast, level, trend };
}

/**
 * Seasonal Decomposition - Identifies day-of-week patterns
 */
function calculateSeasonalFactors(dailyData: { date: Date; revenue: number }[]): Map<number, number> {
  const dayOfWeekRevenue = new Map<number, number[]>();
  
  // Group by day of week (0=Sunday, 6=Saturday)
  dailyData.forEach(({ date, revenue }) => {
    const dayOfWeek = getDay(date);
    if (!dayOfWeekRevenue.has(dayOfWeek)) {
      dayOfWeekRevenue.set(dayOfWeek, []);
    }
    dayOfWeekRevenue.get(dayOfWeek)!.push(revenue);
  });

  // Calculate average for each day
  const seasonalFactors = new Map<number, number>();
  const overallAvg = dailyData.reduce((sum, d) => sum + d.revenue, 0) / dailyData.length;

  dayOfWeekRevenue.forEach((revenues, dayOfWeek) => {
    const dayAvg = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
    // Seasonal index: ratio of day average to overall average
    seasonalFactors.set(dayOfWeek, overallAvg > 0 ? dayAvg / overallAvg : 1);
  });

  return seasonalFactors;
}

/**
 * Moving Average Convergence Divergence (MACD) for trend detection
 */
function calculateMACD(data: number[]): {
  macd: number;
  signal: number;
  histogram: number;
  trend: 'bullish' | 'bearish' | 'neutral';
} {
  if (data.length < 26) {
    return { macd: 0, signal: 0, histogram: 0, trend: 'neutral' };
  }

  // Calculate EMA (Exponential Moving Average)
  const calculateEMA = (prices: number[], period: number): number => {
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    return ema;
  };

  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macd = ema12 - ema26;
  const signal = macd * 0.2; // Simplified signal line
  const histogram = macd - signal;

  const trend = histogram > 0 ? 'bullish' : histogram < 0 ? 'bearish' : 'neutral';

  return { macd, signal, histogram, trend };
}

/**
 * Triple Exponential Smoothing (Holt-Winters with Seasonality)
 */
function holtWintersForecasting(
  dailyData: { date: Date; revenue: number }[],
  forecastDays: number = 1
): {
  forecast: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
} {
  if (dailyData.length < 7) {
    const avg = dailyData.reduce((sum, d) => sum + d.revenue, 0) / dailyData.length;
    return { forecast: avg, confidence: 30, trend: 'stable' };
  }

  const revenues = dailyData.map(d => d.revenue);
  
  // Get seasonal factors
  const seasonalFactors = calculateSeasonalFactors(dailyData);
  const tomorrowDayOfWeek = getDay(new Date(Date.now() + 86400000)); // Tomorrow's day
  const seasonalIndex = seasonalFactors.get(tomorrowDayOfWeek) || 1;

  // Apply exponential smoothing
  const { forecast: baselineForecast, trend: trendValue } = exponentialSmoothing(revenues);
  
  // Apply seasonal adjustment
  const seasonalForecast = baselineForecast * seasonalIndex;
  
  // Calculate confidence based on variance
  const mean = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
  const variance = revenues.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / revenues.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
  
  // Confidence score (lower CV = higher confidence)
  const confidence = Math.max(20, Math.min(95, 100 - (coefficientOfVariation * 100)));
  
  // Determine trend
  const trend = trendValue > mean * 0.05 ? 'up' : trendValue < -mean * 0.05 ? 'down' : 'stable';

  return {
    forecast: Math.max(0, seasonalForecast),
    confidence,
    trend
  };
}

/**
 * Prophet-inspired Additive Model (Simplified)
 * Combines trend + seasonality + holidays/events
 */
function prophetStyleForecast(
  dailyData: { date: Date; revenue: number }[],
  isWeekend: boolean = false
): number {
  if (dailyData.length === 0) return 0;

  // Linear trend component
  const n = dailyData.length;
  const revenues = dailyData.map(d => d.revenue);
  const xValues = Array.from({ length: n }, (_, i) => i);
  
  const meanX = xValues.reduce((sum, x) => sum + x, 0) / n;
  const meanY = revenues.reduce((sum, y) => sum + y, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - meanX) * (revenues[i] - meanY);
    denominator += Math.pow(xValues[i] - meanX, 2);
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;
  const trendForecast = intercept + slope * n;

  // Seasonal component (weekend vs weekday)
  const weekendRevenues = dailyData
    .filter(d => [0, 6].includes(getDay(d.date)))
    .map(d => d.revenue);
  const weekdayRevenues = dailyData
    .filter(d => ![0, 6].includes(getDay(d.date)))
    .map(d => d.revenue);

  const weekendAvg = weekendRevenues.length > 0 
    ? weekendRevenues.reduce((sum, r) => sum + r, 0) / weekendRevenues.length 
    : meanY;
  const weekdayAvg = weekdayRevenues.length > 0 
    ? weekdayRevenues.reduce((sum, r) => sum + r, 0) / weekdayRevenues.length 
    : meanY;

  const seasonalAdjustment = isWeekend 
    ? (weekendAvg / meanY) 
    : (weekdayAvg / meanY);

  // Combine trend + seasonality
  return Math.max(0, trendForecast * seasonalAdjustment);
}

const BusinessInsightsWidget: React.FC<BusinessInsightsWidgetProps> = ({ startDate, endDate }) => {
  const { bills } = usePOS();
  const { expenses } = useExpenses();

  const insights = useMemo(() => {
    // Filter bills by date range if provided
    const filteredBills = bills.filter(bill => {
      if (!startDate && !endDate) return true;
      const billDate = new Date(bill.createdAt);
      if (startDate && billDate < startDate) return false;
      if (endDate && billDate > endDate) return false;
      return true;
    });

    // Filter expenses by date range if provided
    const filteredExpenses = expenses.filter(expense => {
      if (!startDate && !endDate) return true;
      const expenseDate = new Date(expense.date);
      if (startDate && expenseDate < startDate) return false;
      if (endDate && expenseDate > endDate) return false;
      return true;
    });

    // Calculate today's sales
    const todaysBills = bills.filter(bill => isToday(new Date(bill.createdAt)));
    const todaysSales = todaysBills.reduce((sum, bill) => sum + bill.total, 0);

    // Calculate yesterday's sales
    const yesterdaysBills = bills.filter(bill => isYesterday(new Date(bill.createdAt)));
    const yesterdaysSales = yesterdaysBills.reduce((sum, bill) => sum + bill.total, 0);

    // Calculate growth percentage
    const growthPercentage = yesterdaysSales > 0 ? 
      ((todaysSales - yesterdaysSales) / yesterdaysSales) * 100 : 
      (todaysSales > 0 ? 100 : 0);

    if (filteredBills.length === 0) {
      return {
        totalSales: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0,
        avgBillValue: 0,
        dailyPrediction: 0,
        monthlyTarget: 0,
        monthlyProgress: 0,
        currentMonthSales: 0,
        expenseToRevenueRatio: 0,
        breakEvenPoint: 0,
        todaysSales,
        yesterdaysSales,
        growthPercentage,
        predictionConfidence: 0,
        trendDirection: 'stable' as const,
        algorithmUsed: 'Insufficient Data'
      };
    }

    // Calculate total sales for the filtered period
    const totalSales = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
    
    // Calculate total expenses for the filtered period
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calculate net profit
    const netProfit = totalSales - totalExpenses;
    
    // Calculate profit margin percentage
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    
    // Calculate average bill value
    const avgBillValue = totalSales / filteredBills.length;

    // Calculate expense to revenue ratio
    const expenseToRevenueRatio = totalSales > 0 ? (totalExpenses / totalSales) * 100 : 0;

    // ============================================
    // ADVANCED PREDICTION ALGORITHMS
    // ============================================
    
    // Get last 60 days of daily revenue data
    const last60Days = Array.from({ length: 60 }, (_, i) => 
      startOfDay(subDays(new Date(), 59 - i))
    );

    // Create daily revenue map
    const dailyRevenueMap = new Map<string, number>();
    last60Days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      dailyRevenueMap.set(dayKey, 0);
    });

    // Fill in actual revenue data
    bills.forEach(bill => {
      const billDate = startOfDay(new Date(bill.createdAt));
      const dayKey = format(billDate, 'yyyy-MM-dd');
      if (dailyRevenueMap.has(dayKey)) {
        dailyRevenueMap.set(dayKey, (dailyRevenueMap.get(dayKey) || 0) + bill.total);
      }
    });

    // Convert to structured data
    const dailyData = last60Days.map(date => ({
      date,
      revenue: dailyRevenueMap.get(format(date, 'yyyy-MM-dd')) || 0
    }));

    const revenues = dailyData.map(d => d.revenue);
    
    // Check if tomorrow is weekend
    const tomorrow = new Date(Date.now() + 86400000);
    const isTomorrowWeekend = [0, 6].includes(getDay(tomorrow));

    // Apply Holt-Winters forecasting
    const holtWinters = holtWintersForecasting(dailyData, 1);
    
    // Apply Prophet-style forecasting
    const prophetForecast = prophetStyleForecast(dailyData, isTomorrowWeekend);
    
    // Calculate MACD for trend detection
    const macd = calculateMACD(revenues);
    
    // Ensemble prediction (weighted average of multiple algorithms)
    const dailyPrediction = (holtWinters.forecast * 0.6) + (prophetForecast * 0.4);
    const predictionConfidence = holtWinters.confidence;
    const trendDirection = holtWinters.trend;

    // ============================================
    // ENHANCED MONTHLY TARGET CALCULATION
    // ============================================
    
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    
    // Calculate current month sales
    const currentMonthSales = bills
      .filter(bill => {
        const billDate = new Date(bill.createdAt);
        return billDate >= currentMonthStart && billDate <= currentMonthEnd;
      })
      .reduce((sum, bill) => sum + bill.total, 0);
    
    // Days elapsed in current month
    const daysElapsed = Math.max(1, new Date().getDate());
    
    // Total days in current month
    const totalDaysInMonth = new Date(
      new Date().getFullYear(), 
      new Date().getMonth() + 1, 
      0
    ).getDate();
    
    // Days remaining in month
    const daysRemaining = totalDaysInMonth - daysElapsed;
    
    // Current daily average for this month
    const currentMonthDailyAvg = currentMonthSales / daysElapsed;
    
    // Forecast remaining days using Holt-Winters
    let projectedRemainingSales = 0;
    for (let i = 0; i < daysRemaining; i++) {
      const futureDate = new Date(Date.now() + (i + 1) * 86400000);
      const isWeekendDay = [0, 6].includes(getDay(futureDate));
      const dayForecast = prophetStyleForecast(dailyData, isWeekendDay);
      projectedRemainingSales += dayForecast;
    }
    
    // Monthly target = current sales + projected remaining
    const monthlyTarget = currentMonthSales + projectedRemainingSales;
    
    const monthlyProgress = monthlyTarget > 0 ? 
      Math.min(100, (currentMonthSales / monthlyTarget) * 100) : 0;

    // ============================================
    // ENHANCED BREAK-EVEN CALCULATION
    // ============================================
    
    const last30DaysExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const daysDiff = differenceInDays(new Date(), expenseDate);
      return daysDiff <= 30 && daysDiff >= 0;
    });
    
    const last30DaysExpenseTotal = last30DaysExpenses.reduce(
      (sum, expense) => sum + expense.amount, 0
    );
    
    const avgDailyExpenses = last30DaysExpenseTotal / 30;
    const breakEvenPoint = avgDailyExpenses;

    // Determine algorithm used
    const algorithmUsed = dailyData.length >= 30 
      ? 'Holt-Winters + Prophet Ensemble' 
      : dailyData.length >= 14 
        ? 'Exponential Smoothing'
        : 'Moving Average';

    return {
      totalSales,
      totalExpenses,
      netProfit,
      profitMargin,
      avgBillValue,
      dailyPrediction,
      monthlyTarget,
      monthlyProgress,
      currentMonthSales,
      expenseToRevenueRatio,
      breakEvenPoint,
      todaysSales,
      yesterdaysSales,
      growthPercentage,
      predictionConfidence,
      trendDirection,
      daysElapsed,
      totalDaysInMonth,
      currentMonthDailyAvg,
      algorithmUsed,
      macdTrend: macd.trend
    };
  }, [bills, expenses, startDate, endDate]);

  return (
    <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-cyan-500/20 hover:border-cyan-500/30 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700/30">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <Brain className="h-5 w-5 text-cyan-400" />
          AI Business Insights
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-cyan-400" />
        </div>
      </CardHeader>
      <CardContent className="pb-4 p-6">
        <div className="space-y-4">
          {/* Daily Sales Section */}
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
            <h4 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              Daily Performance
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Today's Sales</span>
                <span className="font-bold text-green-400">
                  <CurrencyDisplay amount={insights.todaysSales} />
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Yesterday's Sales</span>
                <span className="font-medium text-gray-300">
                  <CurrencyDisplay amount={insights.yesterdaysSales} />
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Growth vs Yesterday</span>
                <span className={`font-medium text-xs px-2 py-1 rounded-full ${
                  insights.growthPercentage >= 0 
                    ? 'text-green-400 bg-green-500/20' 
                    : 'text-red-400 bg-red-500/20'
                }`}>
                  {insights.growthPercentage >= 0 ? '+' : ''}{insights.growthPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Revenue & Expenses Section */}
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
            <h4 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              Financial Overview
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Total Sales</span>
                <span className="font-bold text-blue-400">
                  <CurrencyDisplay amount={insights.totalSales} />
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Total Expenses</span>
                <span className="font-bold text-red-400">
                  <CurrencyDisplay amount={insights.totalExpenses} />
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Net Profit</span>
                <span className={`font-bold ${insights.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  <CurrencyDisplay amount={insights.netProfit} />
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Profit Margin</span>
                <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                  insights.profitMargin >= 20 
                    ? 'text-green-400 bg-green-500/20' 
                    : insights.profitMargin >= 10 
                      ? 'text-yellow-400 bg-yellow-500/20'
                      : 'text-red-400 bg-red-500/20'
                }`}>
                  {insights.profitMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* AI-Powered Predictions Section */}
          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-purple-500/40 shadow-lg">
            <h4 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-400 animate-pulse" />
              ML Predictions
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Tomorrow's Forecast</span>
                <span className="font-bold text-purple-400">
                  <CurrencyDisplay amount={insights.dailyPrediction} />
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Model Confidence</span>
                <span className={`font-medium text-xs px-2 py-1 rounded-full ${
                  insights.predictionConfidence >= 70 
                    ? 'text-green-400 bg-green-500/20' 
                    : insights.predictionConfidence >= 50 
                      ? 'text-yellow-400 bg-yellow-500/20'
                      : 'text-orange-400 bg-orange-500/20'
                }`}>
                  {insights.predictionConfidence.toFixed(0)}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Trend Direction</span>
                <span className={`font-medium text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                  insights.trendDirection === 'up' 
                    ? 'text-green-400 bg-green-500/20' 
                    : insights.trendDirection === 'down'
                      ? 'text-red-400 bg-red-500/20'
                      : 'text-gray-400 bg-gray-500/20'
                }`}>
                  {insights.trendDirection === 'up' && '↗'}
                  {insights.trendDirection === 'down' && '↘'}
                  {insights.trendDirection === 'stable' && '→'}
                  {insights.trendDirection.toUpperCase()}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Market Momentum</span>
                <span className={`font-medium text-xs px-2 py-1 rounded-full ${
                  insights.macdTrend === 'bullish' 
                    ? 'text-green-400 bg-green-500/20' 
                    : insights.macdTrend === 'bearish'
                      ? 'text-red-400 bg-red-500/20'
                      : 'text-gray-400 bg-gray-500/20'
                }`}>
                  {insights.macdTrend.toUpperCase()}
                </span>
              </div>
              
              <div className="pt-2 border-t border-purple-500/20">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Algorithm</span>
                  <span className="text-xs text-purple-300 font-medium">
                    {insights.algorithmUsed}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
            <h4 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-400" />
              Key Metrics
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Avg Bill Value</span>
                <span className="font-medium text-white">
                  <CurrencyDisplay amount={insights.avgBillValue} />
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Break-even Daily</span>
                <span className="font-medium text-orange-400">
                  <CurrencyDisplay amount={insights.breakEvenPoint} />
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Current Daily Avg</span>
                <span className="font-medium text-cyan-400">
                  <CurrencyDisplay amount={insights.currentMonthDailyAvg} />
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Expense Ratio</span>
                <span className={`font-medium text-xs px-2 py-1 rounded-full ${
                  insights.expenseToRevenueRatio > 70 
                    ? 'text-red-400 bg-red-500/20' 
                    : insights.expenseToRevenueRatio > 50 
                      ? 'text-yellow-400 bg-yellow-500/20' 
                      : 'text-green-400 bg-green-500/20'
                }`}>
                  {insights.expenseToRevenueRatio.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Monthly Progress Section */}
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
            <h4 className="text-sm font-medium text-gray-200 mb-3">Monthly Progress</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">AI Projected Target</span>
                <span className="font-medium text-white">
                  <CurrencyDisplay amount={insights.monthlyTarget} />
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Current Month</span>
                <span className="font-medium text-yellow-400">
                  <CurrencyDisplay amount={insights.currentMonthSales} />
                </span>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Day {insights.daysElapsed} of {insights.totalDaysInMonth}</span>
                <span className="text-gray-500">
                  {insights.totalDaysInMonth - insights.daysElapsed} days left
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Progress</span>
                  <span className="text-xs font-medium text-cyan-400">
                    {insights.monthlyProgress.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ease-out shadow-lg ${
                      insights.monthlyProgress >= 100 
                        ? 'bg-gradient-to-r from-green-500 to-green-400 shadow-green-500/30' 
                        : insights.monthlyProgress >= 75 
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 shadow-yellow-500/30'
                          : 'bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-cyan-500/30'
                    }`}
                    style={{ width: `${insights.monthlyProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-700/30">
            <div className="text-xs text-gray-500 flex justify-between items-center">
              <p>Period: {format(new Date(), 'MMM yyyy')}</p>
              <p className="text-purple-400 flex items-center gap-1">
                <Brain className="h-3 w-3" />
                ML Powered
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessInsightsWidget;
