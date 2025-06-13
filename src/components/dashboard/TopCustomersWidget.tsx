
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { Trophy, Crown, Medal, Award } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

interface TopCustomersWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

const TopCustomersWidget: React.FC<TopCustomersWidgetProps> = ({ startDate, endDate }) => {
  const { customers, bills } = usePOS();

  // Filter bills by date range if provided
  const filteredBills = bills.filter(bill => {
    if (!startDate && !endDate) return true;
    const billDate = new Date(bill.createdAt);
    if (startDate && billDate < startDate) return false;
    if (endDate && billDate > endDate) return false;
    return true;
  });

  // Calculate customer spending and rank them - show top 12 instead of 10
  const customerStats = customers.map(customer => {
    const customerBills = filteredBills.filter(bill => bill.customerId === customer.id);
    const totalSpent = customerBills.reduce((sum, bill) => sum + bill.total, 0);
    const billCount = customerBills.length;
    
    return {
      ...customer,
      totalSpent,
      billCount,
      avgBill: billCount > 0 ? totalSpent / billCount : 0
    };
  })
  .filter(customer => customer.totalSpent > 0)
  .sort((a, b) => b.totalSpent - a.totalSpent)
  .slice(0, 12);

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
      case 0: return 'text-amber-300 bg-gradient-to-br from-amber-500/30 to-amber-600/20 shadow-amber-500/30';
      case 1: return 'text-orange-300 bg-gradient-to-br from-orange-500/30 to-orange-600/20 shadow-orange-500/30';
      case 2: return 'text-yellow-300 bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 shadow-yellow-500/30';
      default: return 'text-amber-400 bg-gradient-to-br from-amber-500/20 to-amber-600/15 shadow-amber-500/20';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900/95 via-orange-950/30 to-gray-800/90 border-orange-600/40 shadow-xl hover:shadow-orange-500/30 hover:border-orange-400/50 transition-all duration-300 backdrop-blur-sm h-full hover:shadow-2xl hover:scale-[1.02]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-orange-700/20">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <Trophy className="h-5 w-5 text-orange-400 drop-shadow-sm" />
          Top Customers
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500/30 to-orange-600/20 flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Crown className="h-4 w-4 text-orange-400 drop-shadow-sm" />
        </div>
      </CardHeader>
      <CardContent className="pb-4 p-6">
        {customerStats.length > 0 ? (
          <div className="space-y-3">
            {customerStats.map((customer, index) => {
              const RankIcon = getRankIcon(index);
              const rankColorClass = getRankColor(index);
              
              return (
                <div 
                  key={customer.id} 
                  className="bg-gradient-to-r from-orange-900/20 via-gray-800/40 to-orange-900/20 border border-orange-700/40 rounded-lg p-4 hover:bg-orange-900/30 hover:border-orange-600/50 transition-all duration-200 group shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${rankColorClass} group-hover:scale-110 transition-transform duration-200 shadow-lg`}>
                        <RankIcon className="h-4 w-4 drop-shadow-sm" />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-tight text-white group-hover:text-orange-100 transition-colors drop-shadow-sm">
                          {customer.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {customer.billCount} orders • Rank #{index + 1}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white drop-shadow-sm">
                        <CurrencyDisplay amount={customer.totalSpent} />
                      </p>
                      <p className="text-xs text-orange-300 flex items-center gap-1 drop-shadow-sm">
                        Avg: <CurrencyDisplay amount={customer.avgBill} />
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-orange-900/20 to-gray-800/30 border border-orange-700/30 rounded-lg p-8 text-center shadow-inner">
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
