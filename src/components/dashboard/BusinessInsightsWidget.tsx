
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { BarChart3 } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { format, subDays, startOfDay, startOfMonth, endOfMonth } from 'date-fns';

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
        breakEvenPoint: 0
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
      breakEvenPoint
    };
  }, [bills, expenses, startDate, endDate]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Business Insights</CardTitle>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-4">
          {/* Revenue & Expenses Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Sales</span>
              <span className="font-bold text-blue-400">
                <CurrencyDisplay amount={insights.totalSales} />
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Expenses</span>
              <span className="font-bold text-red-400">
                <CurrencyDisplay amount={insights.totalExpenses} />
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Net Profit</span>
              <span className={`font-bold ${insights.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                <CurrencyDisplay amount={insights.netProfit} />
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Profit Margin</span>
              <span className={`font-medium ${insights.profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {insights.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Operational Metrics Section */}
          <div className="space-y-2 pt-2 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Bill Value</span>
              <span className="font-medium">
                <CurrencyDisplay amount={insights.avgBillValue} />
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Expense Ratio</span>
              <span className={`font-medium ${insights.expenseToRevenueRatio > 70 ? 'text-red-400' : insights.expenseToRevenueRatio > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                {insights.expenseToRevenueRatio.toFixed(1)}%
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Break-even Daily</span>
              <span className="font-medium text-orange-400">
                <CurrencyDisplay amount={insights.breakEvenPoint} />
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Daily Prediction</span>
              <span className="font-medium text-purple-400">
                <CurrencyDisplay amount={insights.dailyPrediction} />
              </span>
            </div>
          </div>

          {/* Monthly Progress Section */}
          <div className="space-y-2 pt-2 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Monthly Target</span>
              <span className="font-medium">
                <CurrencyDisplay amount={insights.monthlyTarget} />
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Current Month</span>
              <span className="font-medium text-yellow-400">
                <CurrencyDisplay amount={insights.currentMonthSales} />
              </span>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="text-xs font-medium">
                  {insights.monthlyProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    insights.monthlyProgress >= 100 
                      ? 'bg-green-500' 
                      : insights.monthlyProgress >= 75 
                        ? 'bg-yellow-500' 
                        : 'bg-blue-500'
                  }`}
                  style={{ width: `${insights.monthlyProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-700">
            <div className="text-xs text-muted-foreground">
              <p>Period: {format(new Date(), 'MMM yyyy')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessInsightsWidget;
