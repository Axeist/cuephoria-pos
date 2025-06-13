import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { BarChart3, TrendingUp, Target, AlertCircle } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { format, subDays, startOfDay, startOfMonth, endOfMonth, isToday, isYesterday } from 'date-fns';

interface BusinessInsightsWidgetProps {
  startDate?: Date;
  endDate?: Date;
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
        growthPercentage
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

    // Calculate last 7 days revenue for prediction
    const last7Days = Array.from({ length: 7 }, (_, i) => 
      startOfDay(subDays(new Date(), 6 - i))
    );

    const last7DaysRevenue = bills
      .filter(bill => {
        const billDate = startOfDay(new Date(bill.createdAt));
        return last7Days.some(day => day.getTime() === billDate.getTime());
      })
      .reduce((sum, bill) => sum + bill.total, 0);

    const avgDailyRevenue = last7DaysRevenue / 7;
    const dailyPrediction = avgDailyRevenue * 1.1; // 10% growth prediction

    // Calculate monthly target based on daily average
    const daysInMonth = new Date().getDate();
    const totalDaysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const monthlyTarget = avgDailyRevenue * totalDaysInMonth;

    // Calculate current month sales
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    
    const currentMonthSales = bills
      .filter(bill => {
        const billDate = new Date(bill.createdAt);
        return billDate >= currentMonthStart && billDate <= currentMonthEnd;
      })
      .reduce((sum, bill) => sum + bill.total, 0);

    const monthlyProgress = monthlyTarget > 0 ? (currentMonthSales / monthlyTarget) * 100 : 0;

    // Calculate break-even point (daily revenue needed to cover daily expenses)
    const avgDailyExpenses = totalExpenses / (filteredExpenses.length || 1);
    const breakEvenPoint = avgDailyExpenses;

    return {
      totalSales,
      totalExpenses,
      netProfit,
      profitMargin,
      avgBillValue,
      dailyPrediction,
      monthlyTarget,
      monthlyProgress: Math.min(monthlyProgress, 100),
      currentMonthSales,
      expenseToRevenueRatio,
      breakEvenPoint,
      todaysSales,
      yesterdaysSales,
      growthPercentage
    };
  }, [bills, expenses, startDate, endDate]);

  return (
    <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-cyan-500/20 hover:border-cyan-500/30 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700/30">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-cyan-400" />
          Business Insights
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

          {/* Operational Metrics Section */}
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
                <span className="text-sm text-gray-400">Expense Ratio</span>
                <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                  insights.expenseToRevenueRatio > 70 
                    ? 'text-red-400 bg-red-500/20' 
                    : insights.expenseToRevenueRatio > 50 
                      ? 'text-yellow-400 bg-yellow-500/20' 
                      : 'text-green-400 bg-green-500/20'
                }`}>
                  {insights.expenseToRevenueRatio.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Break-even Daily</span>
                <span className="font-medium text-orange-400">
                  <CurrencyDisplay amount={insights.breakEvenPoint} />
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Daily Prediction</span>
                <span className="font-medium text-purple-400">
                  <CurrencyDisplay amount={insights.dailyPrediction} />
                </span>
              </div>
            </div>
          </div>

          {/* Monthly Progress Section */}
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
            <h4 className="text-sm font-medium text-gray-200 mb-3">Monthly Progress</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Target</span>
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
            <div className="text-xs text-gray-500">
              <p>Period: {format(new Date(), 'MMM yyyy')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessInsightsWidget;
