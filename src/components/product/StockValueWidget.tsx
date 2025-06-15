
import React from 'react';
import { usePOS } from '@/context/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

const StockValueWidget: React.FC = () => {
  const { products } = usePOS();

  // Helper: case-insensitive category check
  const isFoodOrDrinks = (cat: string) =>
    cat && (cat.toLowerCase() === 'food' || cat.toLowerCase() === 'drinks');

  // Deep debug - collect all increments and log them
  let debugIncluded: {
    name: string;
    buyingPrice: number;
    stock: number;
    category: string;
    increment: number;
  }[] = [];

  // Calculate total stock value with explicit type casting and case-insensitive category match
  const totalStockValue = products.reduce((total, product) => {
    const cat = typeof product.category === 'string' ? product.category : '';
    if (isFoodOrDrinks(cat)) {
      // Defensive casting for both fields
      let buyingPrice = typeof product.buyingPrice === 'number'
        ? product.buyingPrice
        : Number(product.buyingPrice);
      let stock = typeof product.stock === 'number'
        ? product.stock
        : Number(product.stock);

      const hasValidBuyingPrice = !isNaN(buyingPrice) && buyingPrice !== null && buyingPrice !== undefined;
      const hasValidStock = !isNaN(stock) && stock !== null && stock !== undefined;

      if (hasValidBuyingPrice && hasValidStock) {
        const increment = buyingPrice * stock;
        debugIncluded.push({
          name: product.name,
          buyingPrice,
          stock,
          category: cat,
          increment,
        });
        console.log(
          `[StockValueWidget DEBUG] Name: ${product.name} | Category: ${cat} | Buying: ${buyingPrice} | Stock: ${stock} | Increment: ${increment}`
        );
        return total + increment;
      } else {
        // Log why it was skipped
        console.log(
          `[StockValueWidget DEBUG] SKIPPED ${product.name} | Category: ${cat} | Invalid buying or stock | buyingPrice: ${product.buyingPrice}, stock: ${product.stock}`
        );
      }
    }
    return total;
  }, 0);

  // Count number of food/drinks with buying price
  const productsWithBuyingPrice = products.filter(product =>
    isFoodOrDrinks(product.category) &&
    product.buyingPrice !== undefined &&
    !isNaN(Number(product.buyingPrice))
  ).length;

  React.useEffect(() => {
    // Summary console logs for full debug
    const debugSum = debugIncluded.reduce((sum, i) => sum + i.increment, 0);
    console.log("[StockValueWidget DEBUG] --- Included in computation:");
    debugIncluded.forEach(item =>
      console.log(
        `[StockValueWidget DEBUG SUM] - Name: ${item.name} | Category: ${item.category} | Buying Price: ${item.buyingPrice} | Stock: ${item.stock} | Increment: ${item.increment}`
      )
    );
    console.log("[StockValueWidget DEBUG] Raw sum (unrounded):", debugSum);
    // Log skipped products
    const skipped = products.filter(p =>
      isFoodOrDrinks(p.category) &&
      (
        p.buyingPrice === undefined ||
        p.buyingPrice === null ||
        isNaN(Number(p.buyingPrice)) ||
        p.stock === undefined ||
        p.stock === null ||
        isNaN(Number(p.stock))
      )
    );
    if (skipped.length > 0) {
      console.log("[StockValueWidget DEBUG] Skipped (invalid) food/drink products:");
      skipped.forEach(p => {
        console.log(`[StockValueWidget DEBUG] (Skipped) Name: ${p.name}, BuyingPrice: ${p.buyingPrice}, Stock: ${p.stock}, Category: ${p.category}`);
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
        {/* DEBUG: Show raw calculated value as number */}
        <div className="text-xs mt-2 text-yellow-500">
          Raw value (debug): {totalStockValue}
        </div>
        <p className="text-xs text-muted-foreground">
          Food & drinks inventory ({productsWithBuyingPrice} products)
        </p>
      </CardContent>
    </Card>
  );
};

export default StockValueWidget;
