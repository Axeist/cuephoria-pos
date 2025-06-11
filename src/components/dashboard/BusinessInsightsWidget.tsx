
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { BarChart3 } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { format, subDays, startOfDay, startOfMonth, endOfMonth } from 'date-fns';

interface BusinessInsightsWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

const BusinessInsightsWidget: React.FC<BusinessInsightsWidgetProps> = ({ startDate, endDate }) => {
  const { bills } = usePOS();

  const insights = useMemo(() => {
    // Filter bills by date range if provided
    const filteredBills = bills.filter(bill => {
      if (!startDate && !endDate) return true;
      const billDate = new Date(bill.createdAt);
      if (startDate && billDate < startDate) return false;
      if (endDate && billDate > endDate) return false;
      return true;
    });

    if (filteredBills.length === 0) {
      return {
        totalSales: 0,
        avgBillValue: 0,
        dailyPrediction: 0,
        monthlyTarget: 0,
        monthlyProgress: 0,
        currentMonthSales: 0
      };
    }

    // Calculate total sales for the filtered period
    const totalSales = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
    
    // Calculate average bill value
    const avgBillValue = totalSales / filteredBills.length;

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

    return {
      totalSales,
      avgBillValue,
      dailyPrediction,
      monthlyTarget,
      monthlyProgress: Math.min(monthlyProgress, 100),
      currentMonthSales
    };
  }, [bills, startDate, endDate]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-medium">Business Insights</CardTitle>
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 p-0 px-6 pb-6">
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-base text-muted-foreground">Total Sales</span>
              <span className="font-bold text-lg text-blue-400">
                <CurrencyDisplay amount={insights.totalSales} />
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-base text-muted-foreground">Avg Bill Value</span>
              <span className="font-medium text-base">
                <CurrencyDisplay amount={insights.avgBillValue} />
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-base text-muted-foreground">Daily Prediction</span>
              <span className="font-medium text-base text-green-400">
                <CurrencyDisplay amount={insights.dailyPrediction} />
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-base text-muted-foreground">Monthly Target</span>
              <span className="font-medium text-base">
                <CurrencyDisplay amount={insights.monthlyTarget} />
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-base text-muted-foreground">Current Month</span>
              <span className="font-medium text-base text-yellow-400">
                <CurrencyDisplay amount={insights.currentMonthSales} />
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Progress</span>
                <span className="text-sm font-medium">
                  {insights.monthlyProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
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

          <div className="pt-3 border-t border-gray-700">
            <div className="text-sm text-muted-foreground">
              <p>Target: {format(new Date(), 'MMM yyyy')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessInsightsWidget;
