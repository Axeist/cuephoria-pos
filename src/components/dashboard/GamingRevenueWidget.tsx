
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Gamepad2 } from 'lucide-react';
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

    let ps5Sales = 0;
    let poolSales = 0;
    let ps5ChallengesRevenue = 0;
    let poolChallengesRevenue = 0;

    filteredBills.forEach(bill => {
      const discountRatio = bill.subtotal > 0 ? bill.total / bill.subtotal : 1;
      
      bill.items.forEach(item => {
        const discountedItemTotal = item.total * discountRatio;
        
        if (item.type === 'session') {
          const itemName = item.name.toLowerCase();
          if (itemName.includes('ps5') || itemName.includes('playstation')) {
            ps5Sales += discountedItemTotal;
          } else if (itemName.includes('pool') || itemName.includes('8-ball') || itemName.includes('8 ball')) {
            poolSales += discountedItemTotal;
          }
        } else if (item.type === 'product') {
          const product = products.find(p => p.id === item.id);
          if (product) {
            const category = product.category.toLowerCase();
            const name = product.name.toLowerCase();
            
            // Include PS5 joystick from challenges
            if ((category === 'challenges' || category === 'challenge') && 
                (name.includes('ps5 joystick') || name.includes('ps5'))) {
              ps5Sales += discountedItemTotal;
              ps5ChallengesRevenue += discountedItemTotal;
            }
            // Include 8 ball pool 1 hr from challenges
            else if ((category === 'challenges' || category === 'challenge') && 
                     (name.includes('8 ball pool') || name.includes('8-ball pool'))) {
              poolSales += discountedItemTotal;
              poolChallengesRevenue += discountedItemTotal;
            }
            // Exclude metashot/meta shot from all categories
          }
        }
      });
    });

    return {
      chartData: [
        { name: 'PS5 Gaming', value: ps5Sales, color: '#8B5CF6' },
        { name: '8-Ball Pool', value: poolSales, color: '#06B6D4' }
      ].filter(item => item.value > 0),
      challengesContribution: {
        ps5: ps5ChallengesRevenue,
        pool: poolChallengesRevenue
      }
    };
  }, [bills, products, startDate, endDate]);

  const totalGamingRevenue = gamingData.chartData.reduce((sum, item) => sum + item.value, 0);
  const totalChallengesRevenue = gamingData.challengesContribution.ps5 + gamingData.challengesContribution.pool;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Gaming Revenue</CardTitle>
        <Gamepad2 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {gamingData.chartData.length > 0 ? (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gamingData.chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    dataKey="value"
                  >
                    {gamingData.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`₹${Math.round(value)}`, 'Revenue']}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#F9FAFB'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {gamingData.chartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      <CurrencyDisplay amount={item.value} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {totalGamingRevenue > 0 ? 
                        `${((item.value / totalGamingRevenue) * 100).toFixed(1)}%` : 
                        '0%'
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {totalChallengesRevenue > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-700">
                <p className="text-xs text-muted-foreground italic">
                  Includes <CurrencyDisplay amount={totalChallengesRevenue} /> from challenges billing
                  {gamingData.challengesContribution.ps5 > 0 && gamingData.challengesContribution.pool > 0 
                    ? ` (PS5: ₹${Math.round(gamingData.challengesContribution.ps5)}, Pool: ₹${Math.round(gamingData.challengesContribution.pool)})`
                    : gamingData.challengesContribution.ps5 > 0 
                      ? ` (PS5 challenges)`
                      : ` (Pool challenges)`
                  }
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="h-48 flex items-center justify-center">
            <p className="text-center text-sm text-muted-foreground">
              No gaming revenue data available for the selected period
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GamingRevenueWidget;
