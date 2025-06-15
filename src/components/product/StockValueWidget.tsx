
import React from 'react';
import { usePOS } from '@/context/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

const StockValueWidget: React.FC = () => {
  const { products } = usePOS();

  // Calculate total stock value based on buying prices for food and drinks only
  const totalStockValue = products.reduce((total, product) => {
    // Only include food and drinks products that have a buying price (including 0)
    if (
      (product.category === 'food' || product.category === 'drinks') &&
      product.buyingPrice !== undefined &&
      !isNaN(product.buyingPrice)
    ) {
      return total + (product.buyingPrice * product.stock);
    }
    return total;
  }, 0);

  // Count food and drinks products with buying price (including 0)
  const productsWithBuyingPrice = products.filter(
    product =>
      (product.category === 'food' || product.category === 'drinks') &&
      product.buyingPrice !== undefined &&
      !isNaN(product.buyingPrice)
  ).length;

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Current Stock Value</CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <CurrencyDisplay amount={totalStockValue} />
        </div>
        <p className="text-xs text-muted-foreground">
          Food & drinks inventory ({productsWithBuyingPrice} products)
        </p>
      </CardContent>
    </Card>
  );
};

export default StockValueWidget;
