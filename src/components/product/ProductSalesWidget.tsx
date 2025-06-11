
import React from 'react';
import { usePOS } from '@/context/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

const ProductSalesWidget: React.FC = () => {
  const { bills, products } = usePOS();

  console.log('ProductSalesWidget - Total bills:', bills.length);
  console.log('ProductSalesWidget - Total products:', products.length);

  // Calculate total sales from food and drinks products
  const totalProductSales = bills.reduce((total, bill) => {
    console.log('Processing bill:', bill.id, 'with items:', bill.items);
    
    const productSales = bill.items
      .filter(item => {
        const isProduct = item.type === 'product';
        
        // Look up the product to get its category
        const product = products.find(p => p.id === item.id || p.name === item.name);
        const category = product?.category;
        const isFoodOrDrinks = category === 'food' || category === 'drinks';
        
        console.log(`Item ${item.name}: type=${item.type}, category=${category}, isProduct=${isProduct}, isFoodOrDrinks=${isFoodOrDrinks}`);
        return isProduct && isFoodOrDrinks;
      })
      .reduce((itemTotal, item) => {
        console.log(`Adding item total: ${item.total} for ${item.name}`);
        return itemTotal + item.total;
      }, 0);
    
    console.log('Bill product sales:', productSales);
    return total + productSales;
  }, 0);

  // Count total food and drinks items sold
  const totalItemsSold = bills.reduce((total, bill) => {
    const itemCount = bill.items
      .filter(item => {
        const isProduct = item.type === 'product';
        const product = products.find(p => p.id === item.id || p.name === item.name);
        const category = product?.category;
        return isProduct && (category === 'food' || category === 'drinks');
      })
      .reduce((count, item) => count + item.quantity, 0);
    return total + itemCount;
  }, 0);

  console.log('Total product sales:', totalProductSales);
  console.log('Total items sold:', totalItemsSold);

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
