
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { Gamepad2, Target, TrendingUp } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

interface GamingRevenueWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

const GamingRevenueWidget: React.FC<GamingRevenueWidgetProps> = ({ startDate, endDate }) => {
  const { bills, products } = usePOS();

  const gamingData = useMemo(() => {
    // Filter bills by date range if provided
    const filteredBills = bills.filter(bill => {
      if (!startDate && !endDate) return true;
      const billDate = new Date(bill.createdAt);
      if (startDate && billDate < startDate) return false;
      if (endDate && billDate > endDate) return false;
      return true;
    });

    let ps5Gaming = 0;
    let eightBallPool = 0;
    let challengesRevenue = 0;
    let canteenSales = 0;

    filteredBills.forEach(bill => {
      const discountRatio = bill.subtotal > 0 ? bill.total / bill.subtotal : 1;
      
      bill.items.forEach(item => {
        const discountedItemTotal = item.total * discountRatio;
        
        if (item.type === 'session') {
          const itemName = item.name.toLowerCase();
          if (itemName.includes('ps5') || itemName.includes('playstation')) {
            ps5Gaming += discountedItemTotal;
          } else if (itemName.includes('pool') || itemName.includes('8-ball') || itemName.includes('8 ball')) {
            eightBallPool += discountedItemTotal;
          }
        } else if (item.type === 'product') {
          const product = products.find(p => p.id === item.id);
          if (product) {
            const category = product.category.toLowerCase();
            const name = product.name.toLowerCase();
            
            // Check if it's a challenge item
            if (category === 'challenges' || category === 'challenge') {
              // PS5 joystick challenges
              if (name.includes('ps5 joystick') || name.includes('ps5')) {
                challengesRevenue += discountedItemTotal;
              }
              // 8 ball pool 1 hr challenges
              else if (name.includes('8 ball pool') || name.includes('8-ball pool')) {
                challengesRevenue += discountedItemTotal;
              }
            }
            // Check if it's canteen (food/drinks)
            else if (category === 'food' || category === 'drinks' || category === 'snacks' || category === 'beverage' || category === 'tobacco') {
              canteenSales += discountedItemTotal;
            }
          }
        }
      });
    });

    const totalRevenue = ps5Gaming + eightBallPool + challengesRevenue + canteenSales;
    const targetRevenue = 28947;
    const variance = totalRevenue - targetRevenue;
    const targetProgress = targetRevenue > 0 ? (totalRevenue / targetRevenue) * 100 : 0;

    return {
      ps5Gaming,
      eightBallPool,
      challengesRevenue,
      canteenSales,
      totalRevenue,
      targetRevenue,
      variance,
      targetProgress
    };
  }, [bills, products, startDate, endDate]);

  return (
    <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-purple-500/20 hover:border-purple-500/30 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700/30">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-purple-400" />
          Gaming Revenue Breakdown
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Target className="h-4 w-4 text-purple-400" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Revenue Breakdown */}
          <div className="space-y-3">
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30 hover:border-blue-500/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  PS5 Gaming
                </span>
                <span className="text-sm font-medium text-white">
                  <CurrencyDisplay amount={gamingData.ps5Gaming} />
                </span>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  8-Ball Pool
                </span>
                <span className="text-sm font-medium text-white">
                  <CurrencyDisplay amount={gamingData.eightBallPool} />
                </span>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30 hover:border-green-500/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  Challenges
                </span>
                <span className="text-sm font-medium text-white">
                  <CurrencyDisplay amount={gamingData.challengesRevenue} />
                </span>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30 hover:border-orange-500/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                  Canteen Sales
                </span>
                <span className="text-sm font-medium text-white">
                  <CurrencyDisplay amount={gamingData.canteenSales} />
                </span>
              </div>
            </div>
          </div>
          
          {/* Total Revenue Section */}
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-200 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                Total Revenue
              </span>
              <span className="text-lg font-bold text-green-400">
                <CurrencyDisplay amount={gamingData.totalRevenue} />
              </span>
            </div>
            
            {/* Target Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Target: ₹{gamingData.targetRevenue.toLocaleString()}</span>
                <span className={`font-medium ${gamingData.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {gamingData.variance >= 0 ? '+' : ''}
                  <CurrencyDisplay amount={gamingData.variance} />
                </span>
              </div>
              
              <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ease-out shadow-lg ${
                    gamingData.targetProgress >= 100 
                      ? 'bg-gradient-to-r from-green-500 to-green-400 shadow-green-500/30' 
                      : gamingData.targetProgress >= 75 
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 shadow-yellow-500/30'
                        : 'bg-gradient-to-r from-purple-500 to-purple-400 shadow-purple-500/30'
                  }`}
                  style={{ width: `${Math.min(gamingData.targetProgress, 100)}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span className="font-medium">{gamingData.targetProgress.toFixed(1)}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GamingRevenueWidget;
