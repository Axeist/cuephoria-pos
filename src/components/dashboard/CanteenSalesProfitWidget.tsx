import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOS } from '@/context/POSContext';
import { ShoppingCart } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

interface CanteenSalesProfitWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

const CanteenSalesProfitWidget: React.FC<CanteenSalesProfitWidgetProps> = ({ startDate, endDate }) => {
  const { bills, products } = usePOS();

  const canteenData = useMemo(() => {
    // Filter bills by date range if provided
    const filteredBills = bills.filter(bill => {
      if (!startDate && !endDate) return true;
      const billDate = new Date(bill.createdAt);
      if (startDate && billDate < startDate) return false;
      if (endDate && billDate > endDate) return false;
      return true;
    });

    let totalSales = 0;
    let totalProfit = 0;
    let currentStockValue = 0;
    const productSales: Record<string, { name: string; sales: number; quantity: number; profit: number }> = {};

    console.log('CanteenSalesProfitWidget - Processing', filteredBills.length, 'bills');

    // Calculate current stock value for food and drinks products
    products.forEach(product => {
      const category = product.category.toLowerCase();
      const isFoodOrDrinks = category === 'food' || category === 'drinks' || category === 'snacks' || category === 'beverage' || category === 'tobacco';
      const isChallenges = category === 'challenges' || category === 'challenge';
      
      if (isFoodOrDrinks && !isChallenges && product.buyingPrice) {
        currentStockValue += product.buyingPrice * product.stock;
      }
    });

    filteredBills.forEach(bill => {
      console.log('CanteenSalesProfitWidget - Processing bill:', bill.id, 'with items:', bill.items);
      
      bill.items.forEach(item => {
        if (item.type === 'product') {
          const product = products.find(p => p.id === item.id || p.name === item.name);
          if (product) {
            const category = product.category.toLowerCase();
            const isFoodOrDrinks = category === 'food' || category === 'drinks' || category === 'snacks' || category === 'beverage' || category === 'tobacco';
            const isChallenges = category === 'challenges' || category === 'challenge';
            
            console.log(`CanteenSalesProfitWidget - Item ${item.name}: category=${category}, isFoodOrDrinks=${isFoodOrDrinks}, isChallenges=${isChallenges}`);
            
            if (isFoodOrDrinks && !isChallenges) {
              // Take the item total directly without applying any discount
              totalSales += item.total;
              console.log(`CanteenSalesProfitWidget - Adding sales: ${item.total} for ${item.name}`);

              // Calculate profit
              let profitPerUnit = 0;
              if (product.profit) {
                profitPerUnit = product.profit;
              } else if (product.buyingPrice && product.sellingPrice) {
                profitPerUnit = product.sellingPrice - product.buyingPrice;
              } else if (product.buyingPrice && product.price) {
                profitPerUnit = product.price - product.buyingPrice;
              }
              
              const itemProfit = profitPerUnit * item.quantity;
              totalProfit += itemProfit;
              console.log(`CanteenSalesProfitWidget - Adding profit: ${itemProfit} for ${item.name}`);

              // Track individual product performance
              if (!productSales[item.name]) {
                productSales[item.name] = {
                  name: item.name,
                  sales: 0,
                  quantity: 0,
                  profit: 0
                };
              }
              
              productSales[item.name].sales += item.total;
              productSales[item.name].quantity += item.quantity;
              productSales[item.name].profit += itemProfit;
            }
          }
        }
      });
    });

    // Get all products sorted by sales (remove the slice to show all products)
    const allProducts = Object.values(productSales)
      .sort((a, b) => b.sales - a.sales);

    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    console.log('CanteenSalesProfitWidget - Final totals - Sales:', totalSales, 'Profit:', totalProfit, 'Stock Value:', currentStockValue);

    return {
      totalSales,
      totalProfit,
      profitMargin,
      currentStockValue,
      allProducts
    };
  }, [bills, products, startDate, endDate]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Canteen Performance</CardTitle>
        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Sales</p>
              <p className="text-lg font-bold">
                <CurrencyDisplay amount={canteenData.totalSales} />
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Profit</p>
              <p className="text-lg font-bold text-green-400">
                <CurrencyDisplay amount={canteenData.totalProfit} />
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Stock Value</p>
              <p className="text-lg font-bold text-blue-400">
                <CurrencyDisplay amount={canteenData.currentStockValue} />
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Profit Margin</span>
              <span className="text-sm font-medium">
                {canteenData.profitMargin.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(canteenData.profitMargin, 100)}%` }}
              />
            </div>
          </div>

          {/* All Products with Scroll */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Product Sales</h4>
            {canteenData.allProducts.length > 0 ? (
              <ScrollArea className="h-[300px] w-full">
                <div className="space-y-2 pr-4">
                  {canteenData.allProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.quantity} sold
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium">
                          <CurrencyDisplay amount={product.sales} />
                        </p>
                        <p className="text-xs text-green-400">
                          +<CurrencyDisplay amount={product.profit} />
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                No product sales data for the selected period
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CanteenSalesProfitWidget;
