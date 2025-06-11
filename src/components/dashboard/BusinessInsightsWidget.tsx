
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { BarChart3 } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { format, subDays, startOfDay } from 'date-fns';

interface BusinessInsightsWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

const BusinessInsightsWidget: React.FC<BusinessInsightsWidgetProps> = ({ 
  startDate, 
  endDate 
}) => {
  const { bills } = usePOS();

  const insights = useMemo(() => {
    // Filter bills by date range if provided
    const filteredBills = bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      if (startDate && billDate < startDate) return false;
      if (endDate && billDate > endDate) return false;
      return true;
    });

    if (filteredBills.length === 0) {
      return {
        avgBillValue: 0,
        dailyPrediction: 0,
        weeklyTarget: 50000,
        weeklyProgress: 0
      };
    }

    // Calculate average bill value
    const totalRevenue = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
    const avgBillValue = totalRevenue / filteredBills.length;

    // Calculate last 7 days revenue for prediction
    const last7Days = Array.from({ length: 7 }, (_, i) => 
      startOfDay(subDays(new Date(), 6 - i))
    );

    const last7DaysRevenue = filteredBills
      .filter(bill => {
        const billDate = startOfDay(new Date(bill.createdAt));
        return last7Days.some(day => day.getTime() === billDate.getTime());
      })
      .reduce((sum, bill) => sum + bill.total, 0);

    const avgDailyRevenue = last7DaysRevenue / 7;
    const dailyPrediction = avgDailyRevenue * 1.1; // 10% growth prediction

    // Weekly target and progress
    const weeklyTarget = 50000; // Fixed target for now
    const currentWeekRevenue = last7DaysRevenue;
    const weeklyProgress = (currentWeekRevenue / weeklyTarget) * 100;

    return {
      avgBillValue,
      dailyPrediction,
      weeklyTarget,
      weeklyProgress: Math.min(weeklyProgress, 100)
    };
  }, [bills, startDate, endDate]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Business Insights</CardTitle>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Bill Value</span>
              <span className="font-medium">
                <CurrencyDisplay amount={insights.avgBillValue} />
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Daily Prediction</span>
              <span className="font-medium text-green-400">
                <CurrencyDisplay amount={insights.dailyPrediction} />
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Weekly Target</span>
              <span className="font-medium">
                <CurrencyDisplay amount={insights.weeklyTarget} />
              </span>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="text-xs font-medium">
                  {insights.weeklyProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    insights.weeklyProgress >= 100 
                      ? 'bg-green-500' 
                      : insights.weeklyProgress >= 75 
                        ? 'bg-yellow-500' 
                        : 'bg-blue-500'
                  }`}
                  style={{ width: `${insights.weeklyProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-700">
            <div className="text-xs text-muted-foreground">
              <p>Target: {format(new Date(), 'MMM dd')} - {format(subDays(new Date(), -7), 'MMM dd')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessInsightsWidget;
