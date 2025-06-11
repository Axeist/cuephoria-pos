
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Package } from 'lucide-react';

const StockValueWidget: React.FC = () => {
  const { products } = usePOS();

  // Calculate total stock value based on buying price
  const totalStockValue = products.reduce((total, product) => {
    // Only include products that have buying price and current stock
    if (product.buyingPrice && product.stock > 0) {
      return total + (product.buyingPrice * product.stock);
    }
    return total;
  }, 0);

  // Count products with stock and buying price
  const productsWithValue = products.filter(product => 
    product.buyingPrice && product.stock > 0
  ).length;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Current Stock Value</CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <CurrencyDisplay amount={totalStockValue} />
        </div>
        <p className="text-xs text-muted-foreground">
          {productsWithValue} products with inventory value
        </p>
      </CardContent>
    </Card>
  );
};

export default StockValueWidget;
