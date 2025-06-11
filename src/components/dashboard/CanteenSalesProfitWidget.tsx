
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingCart } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

interface CanteenSalesProfitWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

const CanteenSalesProfitWidget: React.FC<CanteenSalesProfitWidgetProps> = ({ startDate, endDate }) => {
  const { bills, products } = usePOS();

  // Filter bills by date range if provided
  const filteredBills = bills.filter(bill => {
    if (!startDate && !endDate) return true;
    const billDate = new Date(bill.createdAt);
    if (startDate && billDate < startDate) return false;
    if (endDate && billDate > endDate) return false;
    return true;
  });

  console.log('CanteenSalesProfitWidget - Filtered bills:', filteredBills.length);
  console.log('CanteenSalesProfitWidget - Total products:', products.length);

  // Calculate canteen sales (only food and drinks, excluding challenges)
  const canteenData = filteredBills.reduce((acc, bill) => {
    console.log('CanteenSalesProfitWidget - Processing bill:', bill.id, 'with items:', bill.items);
    
    bill.items.forEach(item => {
      if (item.type === 'product') {
        // Find the product to get its category
        const product = products.find(p => p.id === item.id || p.name === item.name);
        const productCategory = product?.category?.toLowerCase() || item.category?.toLowerCase() || '';
        
        // Only include food and drinks, exclude challenges
        const isFoodOrDrinks = productCategory === 'food' || productCategory === 'drinks' || 
                             productCategory === 'snacks' || productCategory === 'beverage' || 
                             productCategory === 'tobacco';
        const isChallenges = productCategory === 'challenges' || productCategory === 'challenge';
        
        console.log(`CanteenSalesProfitWidget - Item ${item.name}: category=${productCategory}, isFoodOrDrinks=${isFoodOrDrinks}, isChallenges=${isChallenges}`);
        
        if (isFoodOrDrinks && !isChallenges) {
          // Use item total directly (already includes discounts proportionally)
          const itemSales = item.total;
          
          // Calculate profit
          let profit = 0;
          if (product) {
            let profitPerUnit = 0;
            
            if (product.profit) {
              profitPerUnit = product.profit;
            } else if (product.buyingPrice && product.sellingPrice) {
              profitPerUnit = product.sellingPrice - product.buyingPrice;
            } else if (product.buyingPrice && product.price) {
              profitPerUnit = product.price - product.buyingPrice;
            }
            
            profit = profitPerUnit * item.quantity;
          }
          
          console.log(`CanteenSalesProfitWidget - Adding ${item.name}: sales=${itemSales}, profit=${profit}`);
          
          acc.totalSales += itemSales;
          acc.totalProfit += profit;
          acc.itemCount += item.quantity;
        }
      }
    });
    
    return acc;
  }, { totalSales: 0, totalProfit: 0, itemCount: 0 });

  console.log('CanteenSalesProfitWidget - Final totals:', canteenData);

  // Calculate profit margin
  const profitMargin = canteenData.totalSales > 0 ? (canteenData.totalProfit / canteenData.totalSales) * 100 : 0;

  // Prepare chart data
  const chartData = [
    {
      name: 'Sales',
      amount: canteenData.totalSales,
      fill: '#22c55e'
    },
    {
      name: 'Profit',
      amount: canteenData.totalProfit,
      fill: '#3b82f6'
    }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Canteen Sales & Profit</CardTitle>
        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Sales</p>
              <p className="text-lg font-bold text-green-400">
                <CurrencyDisplay amount={canteenData.totalSales} />
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Profit</p>
              <p className="text-lg font-bold text-blue-400">
                <CurrencyDisplay amount={canteenData.totalProfit} />
              </p>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-700">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Items Sold</p>
              <p className="text-sm font-medium">{canteenData.itemCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Profit Margin</p>
              <p className="text-sm font-medium text-yellow-400">{profitMargin.toFixed(1)}%</p>
            </div>
          </div>

          {/* Chart */}
          {canteenData.totalSales > 0 && (
            <div className="h-[200px] mt-4">
              <ChartContainer
                config={{
                  amount: {
                    label: "Amount",
                  },
                }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 25 }}>
                    <CartesianGrid stroke="#333" strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#777" 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#777"
                      axisLine={false}
                      tickLine={false}
                      width={60}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-gray-800 border-gray-700 p-2 shadow-md">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs text-gray-400">
                                  {payload[0].payload.name}
                                </span>
                                <span className="font-bold text-white">
                                  <CurrencyDisplay amount={payload[0].value as number} />
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-2 border-t border-gray-700">
            <p>Food & drinks only (excluding challenges)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CanteenSalesProfitWidget;
