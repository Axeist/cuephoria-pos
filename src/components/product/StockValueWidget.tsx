
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
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-medium">Current Stock Value</CardTitle>
        <Package className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          <CurrencyDisplay amount={totalStockValue} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Food & drinks inventory ({productsWithBuyingPrice} products)
        </p>
      </CardContent>
    </Card>
  );
};

export default StockValueWidget;
