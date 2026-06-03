import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Crown, Medal, Award, Loader2 } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { useSummaryAnalytics } from '@/context/SummaryAnalyticsContext';

interface TopCustomersWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

const TopCustomersWidget: React.FC<TopCustomersWidgetProps> = () => {
  const { topCustomers, loading } = useSummaryAnalytics();

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return Crown;
      case 1: return Trophy;
      case 2: return Medal;
      default: return Award;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-400 bg-yellow-500/20';
      case 1: return 'text-gray-300 bg-gray-500/20';
      case 2: return 'text-amber-600 bg-amber-600/20';
      default: return 'text-blue-400 bg-blue-500/20';
    }
  };

  return (
    <Card className="glass-card glass-card-interactive border-white/10 shadow-xl hover:shadow-blue-500/20 hover:border-blue-500/30 transition-all duration-300 backdrop-blur-sm h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700/30">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <Trophy className="h-5 w-5 text-blue-400" />
          Top Customers
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Crown className="h-4 w-4 text-blue-400" />
        </div>
      </CardHeader>
      <CardContent className="pb-4 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          </div>
        ) : topCustomers.length > 0 ? (
          <div className="space-y-3">
            {topCustomers.map((customer, index) => {
              const RankIcon = getRankIcon(index);
              const rankColorClass = getRankColor(index);

              return (
                <div
                  key={customer.customerId}
                  className="theme-inset p-4 hover:border-white/15 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${rankColorClass} group-hover:scale-110 transition-transform duration-200`}>
                        <RankIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-tight text-white group-hover:text-blue-200 transition-colors">
                          {customer.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {customer.billCount} orders • Rank #{index + 1}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">
                        <CurrencyDisplay amount={customer.totalSpent} />
                      </p>
                      <p className="text-xs text-blue-400 flex items-center gap-1">
                        Avg: <CurrencyDisplay amount={customer.avgBill} />
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="theme-inset p-8 text-center">
            <Trophy className="h-8 w-8 text-gray-500 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              No customer data available for the selected period
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopCustomersWidget;
