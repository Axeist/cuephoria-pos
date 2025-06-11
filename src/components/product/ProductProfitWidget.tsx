
import React from 'react';
import { usePOS } from '@/context/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

const ProductProfitWidget: React.FC = () => {
  const { bills, products } = usePOS();

  // Calculate total profit from food and drinks products
  const totalProfit = bills.reduce((total, bill) => {
    const productProfit = bill.items
      .filter(item => item.type === 'product' && (item.category === 'food' || item.category === 'drinks'))
      .reduce((itemTotal, item) => {
        // Find the product to get its profit margin
        const product = products.find(p => p.name === item.name);
        if (product && product.profit) {
          return itemTotal + (product.profit * item.quantity);
        }
        return itemTotal;
      }, 0);
    return total + productProfit;
  }, 0);

  // Count products with profit data
  const productsWithProfit = products.filter(
    product => product.profit && (product.category === 'food' || product.category === 'drinks')
  ).length;

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Product Profit</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <CurrencyDisplay amount={totalProfit} />
        </div>
        <p className="text-xs text-muted-foreground">
          Food & drinks profit ({productsWithProfit} products tracked)
        </p>
      </CardContent>
    </Card>
  );
};

export default ProductProfitWidget;
