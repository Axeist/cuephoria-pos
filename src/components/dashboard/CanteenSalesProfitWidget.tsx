import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOS } from '@/context/POSContext';
import { ShoppingCart, TrendingUp, Package, DollarSign } from 'lucide-react';
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
    let totalStockValue = 0;
    const productSales: Record<string, { name: string; sales: number; quantity: number; profit: number }> = {};

    console.log('CanteenSalesProfitWidget - Processing', filteredBills.length, 'bills');

    // FIXED: Calculate stock value using BUYING PRICE for ONLY food and drinks categories (₹6376)
    products.forEach(product => {
      const category = product.category.toLowerCase();
      // Only include food and drinks, exclude tobacco and challenges
      const isFoodOrDrinks = category === 'food' || 
                             category === 'foods' ||
                             category === 'drinks' || 
                             category === 'drink' ||
                             category === 'beverages' ||
                             category === 'beverage' ||
                             category === 'snacks';
      const isChallenges = category === 'challenges' || category === 'challenge';
      const isTobacco = category === 'tobacco';
      
      // Only count if it's food/drinks and NOT challenges or tobacco
      if (isFoodOrDrinks && !isChallenges && !isTobacco) {
        // FIXED: Use buying price (cost price) to calculate stock value, not selling price
        const buyingPrice = product.buyingPrice || 0;
        const stockValue = product.stock * buyingPrice;
        totalStockValue += stockValue;
        console.log(`Stock value for ${product.name}: stock=${product.stock}, buyingPrice=${buyingPrice}, value=${stockValue}`);
      }
    });

    filteredBills.forEach(bill => {
      // FIXED: Check if bill is complimentary and skip it for product performance
      const isComplimentary = bill.isComplimentary || 
                             bill.paymentMethod === 'complimentary' || 
                             bill.paymentMethod === 'Complimentary' ||
                             bill.discount === 100 ||
                             bill.total === 0;
      
      console.log('CanteenSalesProfitWidget - Processing bill:', bill.id, 'with items:', bill.items, 'isComplimentary:', isComplimentary);
      
      bill.items.forEach(item => {
        if (item.type === 'product') {
          const product = products.find(p => p.id === item.id || p.name === item.name);
          if (product) {
            const category = product.category.toLowerCase();
            // Exclude tobacco from sales calculations too for consistency
            const isFoodOrDrinks = category === 'food' || 
                                   category === 'foods' ||
                                   category === 'drinks' || 
                                   category === 'drink' ||
                                   category === 'beverages' ||
                                   category === 'beverage' ||
                                   category === 'snacks';
            const isChallenges = category === 'challenges' || category === 'challenge';
            const isTobacco = category === 'tobacco';
            
            console.log(`CanteenSalesProfitWidget - Item ${item.name}: category=${category}, isFoodOrDrinks=${isFoodOrDrinks}, isChallenges=${isChallenges}, isTobacco=${isTobacco}`);
            
            // Only count if it's food/drinks and NOT challenges or tobacco
            if (isFoodOrDrinks && !isChallenges && !isTobacco) {
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

              // FIXED: Track individual product performance ONLY for non-complimentary sales
              if (!isComplimentary) {
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
                console.log(`CanteenSalesProfitWidget - Added to product performance: ${item.name}`);
              } else {
                console.log(`CanteenSalesProfitWidget - Skipped complimentary item from product performance: ${item.name}`);
              }
            }
          }
        }
      });
    });

    // Get all products sorted by sales (remove the slice to show all products)
    const allProducts = Object.values(productSales)
      .sort((a, b) => b.sales - a.sales);

    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    console.log('CanteenSalesProfitWidget - Final totals - Sales:', totalSales, 'Profit:', totalProfit, 'Stock Value:', totalStockValue);

    return {
      totalSales,
      totalProfit,
      totalStockValue,
      profitMargin,
      allProducts
    };
  }, [bills, products, startDate, endDate]);

  return (
    <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-orange-500/20 hover:border-orange-500/30 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700/30">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-orange-400" />
          Canteen Performance
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-orange-400" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Enhanced Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 hover:border-orange-500/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <p className="text-xs text-gray-400 font-medium">Total Sales</p>
              </div>
              <p className="text-xl font-bold text-white">
                <CurrencyDisplay amount={canteenData.totalSales} />
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 hover:border-green-500/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <p className="text-xs text-gray-400 font-medium">Total Profit</p>
              </div>
              <p className="text-xl font-bold text-green-400">
                <CurrencyDisplay amount={canteenData.totalProfit} />
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 hover:border-blue-500/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-blue-400" />
                <p className="text-xs text-gray-400 font-medium">Stock Value</p>
              </div>
              <p className="text-xl font-bold text-blue-400">
                <CurrencyDisplay amount={canteenData.totalStockValue} />
              </p>
            </div>
          </div>

          {/* Enhanced Profit Margin */}
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-300 font-medium">Profit Margin</span>
              <span className="text-lg font-bold text-orange-400">
                {canteenData.profitMargin.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full transition-all duration-500 ease-out shadow-lg shadow-orange-500/30"
                style={{ width: `${Math.min(canteenData.profitMargin, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Enhanced Product Sales List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-400" />
              <h4 className="text-sm font-semibold text-gray-200">Product Sales</h4>
            </div>
            {canteenData.allProducts.length > 0 ? (
              <ScrollArea className="h-[320px] w-full">
                <div className="space-y-2 pr-2">
                  {canteenData.allProducts.map((product, index) => (
                    <div 
                      key={index} 
                      className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-3 hover:bg-gray-700/30 hover:border-gray-600/50 transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate group-hover:text-orange-200 transition-colors">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {product.quantity} sold
                          </p>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-sm font-bold text-white">
                            <CurrencyDisplay amount={product.sales} />
                          </p>
                          <p className="text-xs text-green-400 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            <CurrencyDisplay amount={product.profit} />
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-6 text-center">
                <Package className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  No product sales data for the selected period
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CanteenSalesProfitWidget;
