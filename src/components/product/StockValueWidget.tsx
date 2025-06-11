
import React from 'react';
import { usePOS } from '@/context/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

const StockValueWidget: React.FC = () => {
  const { products } = usePOS();

  // Calculate total stock value based on buying prices
  const totalStockValue = products.reduce((total, product) => {
    // Only include products that have buying price and exclude membership products
    if (product.buyingPrice && product.category !== 'membership') {
      return total + (product.buyingPrice * product.stock);
    }
    return total;
  }, 0);

  // Count products with buying price (excluding membership)
  const productsWithBuyingPrice = products.filter(
    product => product.buyingPrice && product.category !== 'membership'
  ).length;

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Current Stock Value</CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <CurrencyDisplay amount={totalStockValue} />
        </div>
        <p className="text-xs text-muted-foreground">
          Based on buying prices for {productsWithBuyingPrice} products
        </p>
      </CardContent>
    </Card>
  );
};

export default StockValueWidget;
