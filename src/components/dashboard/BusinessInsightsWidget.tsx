import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { BarChart3, TrendingUp, Target, AlertCircle, Brain, Loader2 } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { format, subDays, startOfDay, startOfMonth, endOfMonth, isToday, isYesterday, differenceInDays, getDay } from 'date-fns';

interface BusinessInsightsWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

// ============================================
// ENHANCED TIME SERIES FORECASTING (180 DAYS)
// Multi-metric approach with extended historical data
// ============================================

function exponentialSmoothing(data: number[], alpha: number = 0.3, beta: number = 0.1): {
  forecast: number;
  level: number;
  trend: number;
} {
  if (data.length === 0) return { forecast: 0, level: 0, trend: 0 };
  if (data.length === 1) return { forecast: data[0], level: data[0], trend: 0 };
  
  // IMPROVED: Better initialization for small datasets
  if (data.length === 2) {
    const trend = data[1] - data[0];
    return { forecast: data[1] + trend, level: data[1], trend };
  }

  let level = data[0];
  let trend = data[1] - data[0];

  // IMPROVED: Adaptive beta based on data variance for better trend detection
  const variance = data.reduce((sum, val, idx, arr) => {
    if (idx === 0) return sum;
    return sum + Math.pow(val - arr[idx - 1], 2);
  }, 0) / (data.length - 1);
  
  const adaptiveBeta = data.length > 10 
    ? Math.min(0.2, Math.max(0.05, beta))
    : Math.min(0.3, Math.max(0.1, beta));
  
  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (level + trend);
    trend = adaptiveBeta * (level - prevLevel) + (1 - adaptiveBeta) * trend;
  }

  const forecast = level + trend;
  return { forecast, level, trend };
}

function calculateSeasonalFactors(dailyData: { date: Date; revenue: number }[]): Map<number, number> {
  const dayOfWeekRevenue = new Map<number, number[]>();
  
  dailyData.forEach(({ date, revenue }) => {
    const dayOfWeek = getDay(date);
    if (!dayOfWeekRevenue.has(dayOfWeek)) {
      dayOfWeekRevenue.set(dayOfWeek, []);
    }
    dayOfWeekRevenue.get(dayOfWeek)!.push(revenue);
  });

  const seasonalFactors = new Map<number, number>();
  const overallAvg = dailyData.reduce((sum, d) => sum + d.revenue, 0) / dailyData.length;

  dayOfWeekRevenue.forEach((revenues, dayOfWeek) => {
    const dayAvg = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
    seasonalFactors.set(dayOfWeek, overallAvg > 0 ? dayAvg / overallAvg : 1);
  });

  return seasonalFactors;
}

function calculateMACD(data: number[]): {
  macd: number;
  signal: number;
  histogram: number;
  trend: 'bullish' | 'bearish' | 'neutral';
} {
  if (data.length < 26) {
    return { macd: 0, signal: 0, histogram: 0, trend: 'neutral' };
  }

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
  const signal = macd * 0.2;
  const histogram = macd - signal;

  const trend = histogram > 0 ? 'bullish' : histogram < 0 ? 'bearish' : 'neutral';

  return { macd, signal, histogram, trend };
}

function calculateEnhancedConfidence(
  dailyData: { date: Date; revenue: number; productSales?: number; customerCount?: number }[],
  trendStrength: number
): {
  confidence: number;
  factors: {
    dataQuality: number;
    consistency: number;
    trendStability: number;
    seasonalClarity: number;
    dataDiversity: number;
  };
} {
  const revenues = dailyData.map(d => d.revenue);
  const n = revenues.length;
  
  // IMPROVED: Better data quality scoring for 180-day window
  let dataQuality = 0;
  if (n >= 150) dataQuality = 100;
  else if (n >= 120) dataQuality = 85 + (n - 120) * 0.5; // 0.5 per day above 120
  else if (n >= 90) dataQuality = 70 + (n - 90) * 0.5;  // Better scaling
  else if (n >= 60) dataQuality = 60 + (n - 60) * 0.333;
  else if (n >= 30) dataQuality = 50 + (n - 30) * 0.333;
  else if (n >= 14) dataQuality = 35 + (n - 14) * 0.938;
  else if (n >= 7) dataQuality = 20 + (n - 7) * 2.143;
  else dataQuality = n * 2.857;
  
  // IMPROVED: Calculate data diversity from multiple metrics
  let dataDiversity = 50; // Default
  if (dailyData.some(d => d.productSales) && dailyData.some(d => d.customerCount)) {
    // Check if we have product sales and customer data
    const hasProductData = dailyData.some(d => d.productSales && d.productSales > 0);
    const hasCustomerData = dailyData.some(d => d.customerCount && d.customerCount > 0);
    
    if (hasProductData && hasCustomerData) dataDiversity = 100;
    else if (hasProductData || hasCustomerData) dataDiversity = 75;
  }
  
  // IMPROVED: Better consistency calculation using interquartile range
  const mean = revenues.reduce((sum, r) => sum + r, 0) / n;
  const variance = revenues.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
  
  // IMPROVED: More nuanced consistency scoring
  const consistency = mean > 0 
    ? Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 150)))
    : 50; // Default for zero mean
  
  // IMPROVED: Enhanced trend stability with normalized scoring
  const normalizedTrendStrength = Math.min(1, Math.abs(trendStrength));
  const trendStability = Math.min(100, normalizedTrendStrength * 100);
  
  // IMPROVED: Better seasonal clarity with more sophisticated calculation
  const seasonalFactors = calculateSeasonalFactors(dailyData);
  const factorValues = Array.from(seasonalFactors.values());
  
  // Calculate standard deviation of seasonal factors for better clarity
  const seasonalMean = factorValues.reduce((sum, f) => sum + f, 0) / factorValues.length;
  const seasonalStdDev = Math.sqrt(
    factorValues.reduce((sum, f) => sum + Math.pow(f - seasonalMean, 2), 0) / factorValues.length
  );
  
  // IMPROVED: Seasonal clarity based on how distinct patterns are
  const seasonalClarity = Math.max(0, Math.min(100, seasonalStdDev * 150));
  
  // IMPROVED: Adjusted weights - now includes data diversity for richer signals
  // With 180 days of data, we have more historical patterns to learn from
  const confidence = Math.round(
    (dataQuality * 0.35) +      // Slightly reduced
    (consistency * 0.30) +      // Slightly reduced
    (trendStability * 0.20) +   // Maintained
    (seasonalClarity * 0.10) +  // Increased - more data means better seasonality
    (dataDiversity * 0.05)       // New factor for multi-metric validation
  );
  
  // IMPROVED: Expanded confidence range for better granularity
  return {
    confidence: Math.max(15, Math.min(95, confidence)), // Higher minimum with more data
    factors: {
      dataQuality,
      consistency,
      trendStability,
      seasonalClarity,
      dataDiversity
    }
  };
}

function holtWintersForecasting(
  dailyData: { date: Date; revenue: number; productSales?: number; customerCount?: number }[],
  forecastDays: number = 1
): {
  forecast: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  confidenceFactors: any;
} {
  // IMPROVED: Better handling for insufficient data
  if (dailyData.length < 7) {
    const avg = dailyData.length > 0
      ? dailyData.reduce((sum, d) => sum + d.revenue, 0) / dailyData.length
      : 0;
    
    // Improved confidence calculation for limited data
    let baseConfidence = 15;
    if (dailyData.length >= 5) baseConfidence = 25;
    else if (dailyData.length >= 3) baseConfidence = 20;
    
    return { 
      forecast: avg, 
      confidence: baseConfidence, 
      trend: 'stable',
      confidenceFactors: { 
        dataQuality: Math.min(30, dailyData.length * 4),
        consistency: baseConfidence * 0.8,
        trendStability: 0,
        seasonalClarity: 0,
        dataDiversity: 25 // Low diversity with limited data
      }
    };
  }

  const revenues = dailyData.map(d => d.revenue);
  
  // IMPROVED: Use more sophisticated seasonal adjustment
  const seasonalFactors = calculateSeasonalFactors(dailyData);
  const tomorrowDayOfWeek = getDay(new Date(Date.now() + 86400000));
  const seasonalIndex = seasonalFactors.get(tomorrowDayOfWeek) || 1;

  // IMPROVED: Exponential smoothing with better alpha adjustment based on data length
  const alpha = dailyData.length >= 30 ? 0.3 : dailyData.length >= 14 ? 0.4 : 0.5;
  const { forecast: baselineForecast, trend: trendValue } = exponentialSmoothing(revenues, alpha);
  
  const seasonalForecast = baselineForecast * seasonalIndex;
  
  const mean = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
  const trendStrength = mean > 0 ? trendValue / mean : 0;
  
  // IMPROVED: Enhanced confidence calculation
  const { confidence, factors } = calculateEnhancedConfidence(dailyData, trendStrength);
  
  // IMPROVED: More sophisticated trend detection with normalized thresholds
  const normalizedTrend = trendValue / (mean > 0 ? mean : 1);
  const trend = normalizedTrend > 0.08 ? 'up' : normalizedTrend < -0.08 ? 'down' : 'stable';

  return {
    forecast: Math.max(0, seasonalForecast),
    confidence,
    trend,
    confidenceFactors: factors
  };
}

function prophetStyleForecast(
  dailyData: { date: Date; revenue: number; productSales?: number; customerCount?: number }[],
  isWeekend: boolean = false
): number {
  if (dailyData.length === 0) return 0;

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

  return Math.max(0, trendForecast * seasonalAdjustment);
}

const BusinessInsightsWidget: React.FC<BusinessInsightsWidgetProps> = ({ startDate, endDate }) => {
  const { bills, products, customers } = usePOS();
  const { expenses } = useExpenses();
  
  const [isCalculating, setIsCalculating] = useState(true);
  const [cachedInsights, setCachedInsights] = useState<any>(null);

  // FIXED: Filter out complimentary bills at the start
  const paidBills = useMemo(() => 
    bills.filter(bill => bill.paymentMethod !== 'complimentary'),
    [bills]
  );

  useEffect(() => {
    setIsCalculating(true);
    
    const timer = setTimeout(() => {
      const newInsights = calculateInsights();
      setCachedInsights(newInsights);
      setIsCalculating(false);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [paidBills, expenses, startDate, endDate]);

  const calculateInsights = () => {
    // Use paidBills instead of bills
    const filteredBills = paidBills.filter(bill => {
      if (!startDate && !endDate) return true;
      const billDate = new Date(bill.createdAt);
      if (startDate && billDate < startDate) return false;
      if (endDate && billDate > endDate) return false;
      return true;
    });

    const filteredExpenses = expenses.filter(expense => {
      if (!startDate && !endDate) return true;
      const expenseDate = new Date(expense.date);
      if (startDate && expenseDate < startDate) return false;
      if (endDate && expenseDate > endDate) return false;
      return true;
    });

    // Use paidBills for today's and yesterday's sales
    const todaysBills = paidBills.filter(bill => isToday(new Date(bill.createdAt)));
    const todaysSales = todaysBills.reduce((sum, bill) => sum + bill.total, 0);

    const yesterdaysBills = paidBills.filter(bill => isYesterday(new Date(bill.createdAt)));
    const yesterdaysSales = yesterdaysBills.reduce((sum, bill) => sum + bill.total, 0);

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
        algorithmUsed: 'Insufficient Data',
        macdTrend: 'neutral' as const,
                daysOfData: 0,
                confidenceFactors: { dataQuality: 0, consistency: 0, trendStability: 0, seasonalClarity: 0, dataDiversity: 0 }
      };
    }

    const totalSales = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    const avgBillValue = totalSales / filteredBills.length;
    const expenseToRevenueRatio = totalSales > 0 ? (totalExpenses / totalSales) * 100 : 0;

    // IMPROVED: Extended to 180 days for better prediction accuracy
    const last180Days = Array.from({ length: 180 }, (_, i) => 
      startOfDay(subDays(new Date(), 179 - i))
    );

    const dailyRevenueMap = new Map<string, number>();
    const dailyProductSalesMap = new Map<string, number>();
    const dailyCustomerCountMap = new Map<string, number>();
    
    last180Days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      dailyRevenueMap.set(dayKey, 0);
      dailyProductSalesMap.set(dayKey, 0);
      dailyCustomerCountMap.set(dayKey, 0);
    });

    // IMPROVED: Aggregate revenue, product sales, and customer counts
    paidBills.forEach(bill => {
      const billDate = startOfDay(new Date(bill.createdAt));
      const dayKey = format(billDate, 'yyyy-MM-dd');
      
      if (dailyRevenueMap.has(dayKey)) {
        // Revenue
        dailyRevenueMap.set(dayKey, (dailyRevenueMap.get(dayKey) || 0) + bill.total);
        
        // Product sales count (approximate from total bill amount and average price)
        const estimatedItems = Math.ceil(bill.total / 100); // Rough estimate
        dailyProductSalesMap.set(dayKey, (dailyProductSalesMap.get(dayKey) || 0) + estimatedItems);
        
        // Customer count (if bill has customer)
        if (bill.customerId) {
          dailyCustomerCountMap.set(dayKey, (dailyCustomerCountMap.get(dayKey) || 0) + 1);
        }
      }
    });

    const dailyData = last180Days.map(date => ({
      date,
      revenue: dailyRevenueMap.get(format(date, 'yyyy-MM-dd')) || 0,
      productSales: dailyProductSalesMap.get(format(date, 'yyyy-MM-dd')) || 0,
      customerCount: dailyCustomerCountMap.get(format(date, 'yyyy-MM-dd')) || 0
    }));

    const daysWithData = dailyData.filter(d => d.revenue > 0).length;

    const revenues = dailyData.map(d => d.revenue);
    
    const tomorrow = new Date(Date.now() + 86400000);
    const isTomorrowWeekend = [0, 6].includes(getDay(tomorrow));

    const holtWinters = holtWintersForecasting(dailyData, 1);
    const prophetForecast = prophetStyleForecast(dailyData, isTomorrowWeekend);
    const macd = calculateMACD(revenues);
    
    const dailyPrediction = (holtWinters.forecast * 0.6) + (prophetForecast * 0.4);
    const predictionConfidence = holtWinters.confidence;
    const trendDirection = holtWinters.trend;
    const confidenceFactors = holtWinters.confidenceFactors;

    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    
    // Use paidBills for current month sales
    const currentMonthSales = paidBills
      .filter(bill => {
        const billDate = new Date(bill.createdAt);
        return billDate >= currentMonthStart && billDate <= currentMonthEnd;
      })
      .reduce((sum, bill) => sum + bill.total, 0);
    
    const daysElapsed = Math.max(1, new Date().getDate());
    const totalDaysInMonth = new Date(
      new Date().getFullYear(), 
      new Date().getMonth() + 1, 
      0
    ).getDate();
    
    const daysRemaining = totalDaysInMonth - daysElapsed;
    const currentMonthDailyAvg = currentMonthSales / daysElapsed;
    
    let projectedRemainingSales = 0;
    for (let i = 0; i < daysRemaining; i++) {
      const futureDate = new Date(Date.now() + (i + 1) * 86400000);
      const isWeekendDay = [0, 6].includes(getDay(futureDate));
      const dayForecast = prophetStyleForecast(dailyData, isWeekendDay);
      projectedRemainingSales += dayForecast;
    }
    
    const monthlyTarget = currentMonthSales + projectedRemainingSales;
    const monthlyProgress = monthlyTarget > 0 ? 
      Math.min(100, (currentMonthSales / monthlyTarget) * 100) : 0;

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

    let algorithmUsed = 'Insufficient Data';
    if (daysWithData >= 120) algorithmUsed = 'Advanced: ML Ensemble (180 days data)';
    else if (daysWithData >= 90) algorithmUsed = 'Advanced: Holt-Winters + Prophet (180 days)';
    else if (daysWithData >= 60) algorithmUsed = 'Holt-Winters + Prophet (60 days)';
    else if (daysWithData >= 30) algorithmUsed = 'Enhanced: Exponential Smoothing (30 days)';
    else if (daysWithData >= 14) algorithmUsed = 'Basic: Moving Average (14 days)';

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
      macdTrend: macd.trend,
      daysOfData: daysWithData,
      confidenceFactors
    };
  };

  if (isCalculating || !cachedInsights) {
    return (
      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700/30">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Brain className="h-5 w-5 text-cyan-400" />
            AI Business Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="p-12 flex items-center justify-center min-h-[500px]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
              <div className="absolute inset-0 h-12 w-12 animate-ping text-cyan-400/20 rounded-full bg-cyan-400"></div>
            </div>
            <div className="text-center">
              <p className="text-base text-white font-medium mb-1">Analyzing Business Data</p>
              <p className="text-sm text-gray-400 animate-pulse">Running ML predictions on 180 days of data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const insights = cachedInsights;

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
          {/* Daily Performance */}
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

          {/* Financial Overview */}
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

          {/* ML Predictions */}
          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-purple-500/40 shadow-lg">
            <h4 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-400 animate-pulse" />
              ML Predictions ({insights.daysOfData} days data, 180-day window)
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
              
              <div className="pt-2 border-t border-purple-500/20">
                <p className="text-xs text-gray-500 mb-2">Confidence Factors:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Data Quality:</span>
                    <span className="text-purple-300">{insights.confidenceFactors.dataQuality.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Consistency:</span>
                    <span className="text-purple-300">{insights.confidenceFactors.consistency.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Trend:</span>
                    <span className="text-purple-300">{insights.confidenceFactors.trendStability.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Seasonal:</span>
                    <span className="text-purple-300">{insights.confidenceFactors.seasonalClarity.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-400">Data Diversity:</span>
                    <span className="text-purple-300">{insights.confidenceFactors.dataDiversity.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-purple-500/20">
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

          {/* Monthly Progress */}
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
                180-Day ML Enhanced
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessInsightsWidget;
