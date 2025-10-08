import React, { useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, TrendingUp } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

const StockValueWidget: React.FC = () => {
  const { products } = usePOS();

  // Calculate total stock value for food and drinks only (optimized with useMemo)
  const totalStockValue = useMemo(() => {
    return products.reduce((total, product) => {
      const category = product.category.toLowerCase();
      
      // Only include food and drinks products
      if (category === 'food' || category === 'drinks') {
        // Use buying price if available, otherwise fall back to regular price
        const pricePerUnit = product.buyingPrice || product.price;
        return total + (pricePerUnit * product.stock);
      }
      return total;
    }, 0);
  }, [products]);

  // Count food and drinks products (optimized with useMemo)
  const productsWithStock = useMemo(() => {
    return products.filter(
      product => {
        const category = product.category.toLowerCase();
        return (category === 'food' || category === 'drinks');
      }
    ).length;
  }, [products]);

  // Count total items in stock for food and drinks
  const totalItems = useMemo(() => {
    return products
      .filter(product => {
        const category = product.category.toLowerCase();
        return category === 'food' || category === 'drinks';
      })
      .reduce((total, product) => total + product.stock, 0);
  }, [products]);

  return (
    <Card className="mb-6 bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-xl hover:shadow-cuephoria-purple/20 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium text-white">
          Food & Drinks Stock Value
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Package className="h-4 w-4 text-purple-400" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white mb-2">
          <CurrencyDisplay amount={totalStockValue} />
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{totalItems.toLocaleString()} items in stock</span>
          <span>•</span>
          <span>{productsWithStock} products</span>
        </div>
        <div className="flex items-center pt-2">
          <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
          <span className="text-xs text-green-400">
            Food & Drinks inventory only
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default StockValueWidget;
