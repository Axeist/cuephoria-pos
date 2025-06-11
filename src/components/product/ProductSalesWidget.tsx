
import React from 'react';
import { usePOS } from '@/context/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

const ProductSalesWidget: React.FC = () => {
  const { bills } = usePOS();

  // Calculate total sales from food and drinks products
  const totalProductSales = bills.reduce((total, bill) => {
    const productSales = bill.items
      .filter(item => item.type === 'product' && (item.category === 'food' || item.category === 'drinks'))
      .reduce((itemTotal, item) => itemTotal + item.total, 0);
    return total + productSales;
  }, 0);

  // Count total food and drinks items sold
  const totalItemsSold = bills.reduce((total, bill) => {
    const itemCount = bill.items
      .filter(item => item.type === 'product' && (item.category === 'food' || item.category === 'drinks'))
      .reduce((count, item) => count + item.quantity, 0);
    return total + itemCount;
  }, 0);

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Product Sales</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <CurrencyDisplay amount={totalProductSales} />
        </div>
        <p className="text-xs text-muted-foreground">
          Food & drinks sold ({totalItemsSold} items)
        </p>
      </CardContent>
    </Card>
  );
};

export default ProductSalesWidget;
