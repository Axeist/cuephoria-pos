import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOS } from '@/context/POSContext';
import { ShoppingCart, TrendingUp, Package, DollarSign, Loader2 } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { useSummaryAnalytics } from '@/context/SummaryAnalyticsContext';

const CanteenSalesProfitWidget: React.FC = () => {
  const { products } = usePOS();
  const { canteen, loading } = useSummaryAnalytics();

  const totalStockValue = useMemo(() => {
    return products.reduce((sum, product) => {
      const category = product.category.toLowerCase();
      const isFoodOrDrinks =
        ['food', 'foods', 'drinks', 'drink', 'beverages', 'beverage', 'snacks'].includes(category);
      const isExcluded = ['challenges', 'challenge', 'tobacco'].includes(category);
      if (isFoodOrDrinks && !isExcluded) {
        return sum + product.stock * (product.buyingPrice || 0);
      }
      return sum;
    }, 0);
  }, [products]);

  const canteenData = canteen
    ? {
        totalSales: canteen.totalSales,
        totalProfit: canteen.totalProfit,
        totalStockValue,
        profitMargin: canteen.totalSales > 0 ? (canteen.totalProfit / canteen.totalSales) * 100 : 0,
        allProducts: canteen.products,
      }
    : null;

  return (
    <Card className="glass-card glass-card-interactive border-white/10 shadow-xl hover:shadow-orange-500/20 hover:border-orange-500/30 transition-all duration-300 backdrop-blur-sm">
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
        {loading || !canteenData ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="theme-inset p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <p className="text-xs text-gray-400 font-medium">Total Sales</p>
                </div>
                <p className="text-xl font-bold text-white">
                  <CurrencyDisplay amount={canteenData.totalSales} />
                </p>
              </div>
              <div className="theme-inset p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <p className="text-xs text-gray-400 font-medium">Total Profit</p>
                </div>
                <p className="text-xl font-bold text-green-400">
                  <CurrencyDisplay amount={canteenData.totalProfit} />
                </p>
              </div>
              <div className="theme-inset p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-blue-400" />
                  <p className="text-xs text-gray-400 font-medium">Stock Value</p>
                </div>
                <p className="text-xl font-bold text-blue-400">
                  <CurrencyDisplay amount={canteenData.totalStockValue} />
                </p>
              </div>
            </div>

            <div className="theme-inset p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-300 font-medium">Profit Margin</span>
                <span className="text-lg font-bold text-orange-400">
                  {canteenData.profitMargin.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full"
                  style={{ width: `${Math.min(canteenData.profitMargin, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-400" />
                <h4 className="text-sm font-semibold text-gray-200">Product Sales</h4>
              </div>
              {canteenData.allProducts.length > 0 ? (
                <ScrollArea className="h-[320px] w-full">
                  <div className="space-y-2 pr-2">
                    {canteenData.allProducts.map((product, index) => (
                      <div key={index} className="theme-inset p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{product.name}</p>
                            <p className="text-xs text-gray-400 mt-1">{product.quantity} sold</p>
                          </div>
                          <div className="text-right ml-3">
                            <p className="text-sm font-bold text-white">
                              <CurrencyDisplay amount={product.sales} />
                            </p>
                            <p className="text-xs text-green-400">
                              <CurrencyDisplay amount={product.profit} />
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="theme-inset p-6 text-center">
                  <Package className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No product sales data for the selected period</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CanteenSalesProfitWidget;
