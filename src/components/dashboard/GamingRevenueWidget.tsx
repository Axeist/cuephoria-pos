
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
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

    return {
      ps5Gaming,
      eightBallPool,
      challengesRevenue,
      canteenSales,
      totalRevenue
    };
  }, [bills, products, startDate, endDate]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Gaming Revenue Breakdown</CardTitle>
        <Gamepad2 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">PS5 gaming:</span>
            <span className="text-sm font-medium">
              <CurrencyDisplay amount={gamingData.ps5Gaming} />
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">8-ball pool:</span>
            <span className="text-sm font-medium">
              <CurrencyDisplay amount={gamingData.eightBallPool} />
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Challenges (8 ball pool 1hr + PS5 joystick):</span>
            <span className="text-sm font-medium">
              <CurrencyDisplay amount={gamingData.challengesRevenue} />
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Canteen sales:</span>
            <span className="text-sm font-medium">
              <CurrencyDisplay amount={gamingData.canteenSales} />
            </span>
          </div>
          
          <div className="pt-2 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Revenue:</span>
              <span className="text-lg font-bold text-green-400">
                <CurrencyDisplay amount={gamingData.totalRevenue} />
              </span>
            </div>
            <div className="mt-1 text-center">
              <span className="text-xs text-muted-foreground">
                Target: ₹28,947 | 
                Variance: <CurrencyDisplay amount={gamingData.totalRevenue - 28947} />
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GamingRevenueWidget;
