
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { BarChart3 } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { format, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';

interface BusinessInsightsWidgetProps {
  dateRange?: { start: Date; end: Date } | null;
}

const BusinessInsightsWidget: React.FC<BusinessInsightsWidgetProps> = ({ dateRange }) => {
  const { bills } = usePOS();

  const insights = useMemo(() => {
    // Filter bills by date range if provided
    const filteredBills = dateRange 
      ? bills.filter(bill => {
          const billDate = new Date(bill.createdAt);
          return billDate >= dateRange.start && billDate <= dateRange.end;
        })
      : bills;

    if (filteredBills.length === 0) {
      return {
        totalSales: 0,
        avgBillValue: 0,
        dailyAverage: 0,
        monthlyTarget: 0,
        monthlyProgress: 0
      };
    }

    // Calculate total sales for filtered period
    const totalSales = filteredBills.reduce((sum, bill) => sum + bill.total, 0);

    // Calculate average bill value
    const avgBillValue = totalSales / filteredBills.length;

    // Calculate daily average for the current month or filtered period
    const currentDate = new Date();
    const currentMonth = startOfMonth(currentDate);
    const daysInCurrentMonth = getDaysInMonth(currentDate);
    
    // Get bills for current month to calculate daily average
    const currentMonthBills = bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      return billDate >= currentMonth && billDate <= endOfMonth(currentDate);
    });

    const currentMonthRevenue = currentMonthBills.reduce((sum, bill) => sum + bill.total, 0);
    const daysPassed = Math.max(1, currentDate.getDate()); // At least 1 day
    const dailyAverage = currentMonthRevenue / daysPassed;

    // Calculate dynamic monthly target (daily average * days in month * 1.2 for 20% growth)
    const monthlyTarget = dailyAverage * daysInCurrentMonth * 1.2;

    // Calculate progress towards monthly target
    const monthlyProgress = monthlyTarget > 0 ? Math.min((currentMonthRevenue / monthlyTarget) * 100, 100) : 0;

    return {
      totalSales,
      avgBillValue,
      dailyAverage,
      monthlyTarget,
      monthlyProgress
    };
  }, [bills, dateRange]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Business Insights</CardTitle>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        <div className="space-y-4 flex-1">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {dateRange ? 'Period Sales' : 'Total Sales'}
              </span>
              <span className="font-medium text-lg">
                <CurrencyDisplay amount={insights.totalSales} />
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Bill Value</span>
              <span className="font-medium">
                <CurrencyDisplay amount={insights.avgBillValue} />
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Daily Average</span>
              <span className="font-medium text-green-400">
                <CurrencyDisplay amount={insights.dailyAverage} />
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Monthly Target</span>
              <span className="font-medium">
                <CurrencyDisplay amount={insights.monthlyTarget} />
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
        </div>

        <div className="pt-2 border-t border-gray-700 mt-auto">
          <div className="text-xs text-muted-foreground">
            <p>Target for {format(new Date(), 'MMMM yyyy')}</p>
            <p className="text-xs text-gray-500 mt-1">
              Based on daily average × 20% growth
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessInsightsWidget;
