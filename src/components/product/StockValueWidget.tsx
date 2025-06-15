
import React from 'react';
import { usePOS } from '@/context/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

const StockValueWidget: React.FC = () => {
  const { products } = usePOS();

  // Log all products first for debugging
  console.log("[StockValueWidget] All products:", products);

  // Debug: Build list of included items
  let debugIncluded: {name: string, buyingPrice: number, stock: number, category: string, increment: number}[] = [];

  // Calculate total stock value based on buying prices for food and drinks only
  const totalStockValue = products.reduce((total, product) => {
    const isFoodOrDrinks = product.category === 'food' || product.category === 'drinks';
    const hasValidBuyingPrice = product.buyingPrice !== undefined && product.buyingPrice !== null && !isNaN(Number(product.buyingPrice));
    const hasValidStock = typeof product.stock === 'number' && !isNaN(product.stock);

    if (isFoodOrDrinks && hasValidBuyingPrice && hasValidStock) {
      const increment = Number(product.buyingPrice) * Number(product.stock);
      debugIncluded.push({
        name: product.name,
        buyingPrice: Number(product.buyingPrice),
        stock: Number(product.stock),
        category: product.category,
        increment
      });
      return total + increment;
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

  // Log included and excluded products in reducer for debug
  React.useEffect(() => {
    console.log("[StockValueWidget] Included products in stock value calculation:");
    debugIncluded.forEach(item => {
      console.log(
        `[StockValueWidget] - Name: ${item.name} | Category: ${item.category} | Buying Price: ${item.buyingPrice} | Stock: ${item.stock} | Increment: ${item.increment}`
      );
    });
    console.log("[StockValueWidget] Stock Value Sum:", debugIncluded.reduce((sum, i) => sum + i.increment, 0));
    const excluded = products.filter(
      p =>
        (p.category === 'food' || p.category === 'drinks') &&
        (
          p.buyingPrice === undefined || p.buyingPrice === null
          || isNaN(Number(p.buyingPrice))
          || typeof p.stock !== 'number'
          || isNaN(p.stock)
        )
    );
    if (excluded.length > 0) {
      console.log("[StockValueWidget] Excluded food/drink products due to invalid buyingPrice/stock:");
      excluded.forEach(p => {
        console.log(`[StockValueWidget] (Excluded) Name: ${p.name}, BuyingPrice: ${p.buyingPrice}, Stock: ${p.stock}, Category: ${p.category}`);
      });
    }
  }, [products]);

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

