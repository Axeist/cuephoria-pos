
import React from 'react';
import { usePOS } from '@/context/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

const StockValueWidget: React.FC = () => {
  const { products } = usePOS();

  // Calculate total stock value based on buying prices for food and drinks only
  const totalStockValue = products.reduce((total, product) => {
    // Only include food and drinks products that have buying price
    if (product.buyingPrice && (product.category === 'food' || product.category === 'drinks')) {
      return total + (product.buyingPrice * product.stock);
    }
    return total;
  }, 0);

  // Count food and drinks products with buying price
  const productsWithBuyingPrice = products.filter(
    product => product.buyingPrice && (product.category === 'food' || product.category === 'drinks')
  ).length;

  return (
    <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-orange-500/20 hover:border-orange-500/30 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700/30">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <Package className="h-5 w-5 text-orange-400" />
          Current Stock Value
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
          <Package className="h-4 w-4 text-orange-400" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 hover:border-orange-500/30 transition-colors">
            <div className="text-3xl font-bold text-orange-400 mb-2">
              <CurrencyDisplay amount={totalStockValue} />
            </div>
            <p className="text-sm text-gray-300">
              Food & drinks inventory ({productsWithBuyingPrice} products)
            </p>
          </div>
          
          <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Average per product:</span>
              <span className="text-sm font-medium text-orange-300">
                <CurrencyDisplay amount={productsWithBuyingPrice > 0 ? totalStockValue / productsWithBuyingPrice : 0} />
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StockValueWidget;
