
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Gamepad2, Trophy } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

interface Bill {
  id: string;
  total: number;
  subtotal: number;
  items: Array<{
    id: string;
    name: string;
    type: 'session' | 'product';
    total: number;
  }>;
}

interface Product {
  id: string;
  name: string;
  category: string;
}

interface GamingRevenueBreakdownProps {
  bills: Bill[];
  products: Product[];
}

const GamingRevenueBreakdown: React.FC<GamingRevenueBreakdownProps> = ({ bills, products }) => {
  const gamingRevenue = React.useMemo(() => {
    let ps5Sales = 0;
    let poolSales = 0;

    bills.forEach(bill => {
      // Calculate the effective discount ratio for this bill
      const discountRatio = bill.total / bill.subtotal;

      bill.items.forEach(item => {
        // Apply proportional discount to each item
        const discountedItemTotal = item.total * discountRatio;

        if (item.type === 'session') {
          // Categorize sessions by type
          const itemName = item.name.toLowerCase();
          if (itemName.includes('ps5') || itemName.includes('playstation')) {
            ps5Sales += discountedItemTotal;
          } else if (itemName.includes('pool') || itemName.includes('8-ball') || itemName.includes('8 ball')) {
            poolSales += discountedItemTotal;
          }
        } else if (item.type === 'product') {
          // Check for manual gaming products (like "PS5 Joystick", "8 Ball Pool - 1hr")
          const itemName = item.name.toLowerCase();
          if (itemName.includes('ps5') || itemName.includes('joystick') || itemName.includes('playstation')) {
            ps5Sales += discountedItemTotal;
          } else if (itemName.includes('pool') || itemName.includes('8-ball') || itemName.includes('8 ball')) {
            poolSales += discountedItemTotal;
          }
        }
      });
    });

    const totalGaming = ps5Sales + poolSales;
    const overallTotal = bills.reduce((sum, bill) => sum + bill.total, 0);

    return {
      ps5: {
        amount: ps5Sales,
        percentage: totalGaming > 0 ? (ps5Sales / totalGaming) * 100 : 0,
        revenueShare: overallTotal > 0 ? (ps5Sales / overallTotal) * 100 : 0
      },
      pool: {
        amount: poolSales,
        percentage: totalGaming > 0 ? (poolSales / totalGaming) * 100 : 0,
        revenueShare: overallTotal > 0 ? (poolSales / overallTotal) * 100 : 0
      },
      totalGaming,
      overallTotal,
      gamingShare: overallTotal > 0 ? (totalGaming / overallTotal) * 100 : 0
    };
  }, [bills, products]);

  const categories = [
    {
      name: 'PS5 Gaming',
      icon: <Gamepad2 className="h-5 w-5 text-blue-500" />,
      data: gamingRevenue.ps5,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-900/20 border-blue-800'
    },
    {
      name: '8-Ball Pool',
      icon: <Trophy className="h-5 w-5 text-green-500" />,
      data: gamingRevenue.pool,
      color: 'bg-green-500',
      bgColor: 'bg-green-900/20 border-green-800'
    }
  ];

  return (
    <Card className="border-gray-800 bg-[#1A1F2C] shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-purple-500" />
            Gaming Revenue Breakdown
          </CardTitle>
          <Badge variant="outline" className="bg-purple-900/30 text-purple-400 border-purple-800">
            {gamingRevenue.gamingShare.toFixed(1)}% of Total Revenue
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall Gaming Revenue */}
          <div className="text-center p-4 rounded-lg bg-purple-900/20 border border-purple-800">
            <div className="text-3xl font-bold text-white">
              <CurrencyDisplay amount={gamingRevenue.totalGaming} />
            </div>
            <div className="text-sm text-purple-400 mt-1">Total Gaming Revenue</div>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-4">
            {categories.map((category, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${category.bgColor}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {category.icon}
                    <span className="text-white font-medium">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">
                      <CurrencyDisplay amount={category.data.amount} />
                    </div>
                    <div className="text-sm text-gray-400">
                      {category.data.revenueShare.toFixed(1)}% of total
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Gaming Share</span>
                    <span className="text-white">{category.data.percentage.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={category.data.percentage} 
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="text-center p-3 rounded-lg bg-gray-800/50">
              <div className="text-lg font-bold text-white">
                {categories.length}
              </div>
              <div className="text-sm text-gray-400">Gaming Categories</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-800/50">
              <div className="text-lg font-bold text-white">
                {gamingRevenue.ps5.amount > gamingRevenue.pool.amount ? 'PS5' : 'Pool'}
              </div>
              <div className="text-sm text-gray-400">Top Category</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GamingRevenueBreakdown;
