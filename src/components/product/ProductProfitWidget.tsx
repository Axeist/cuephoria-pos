
import React from 'react';
import { usePOS } from '@/context/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

const ProductProfitWidget: React.FC = () => {
  const { bills, products } = usePOS();

  console.log('ProductProfitWidget - Total bills:', bills.length);
  console.log('ProductProfitWidget - Total products:', products.length);

  // Calculate total profit from food and drinks products (excluding challenges)
  const totalProfit = bills.reduce((total, bill) => {
    console.log('Processing bill for profit:', bill.id, 'with items:', bill.items);
    
    const productProfit = bill.items
      .filter(item => {
        const isProduct = item.type === 'product';
        
        // Look up the product to get its category
        const product = products.find(p => p.id === item.id || p.name === item.name);
        const category = product?.category;
        const isFoodOrDrinks = category === 'food' || category === 'drinks';
        const isChallenges = category === 'challenges';
        
        console.log(`Profit item ${item.name}: type=${item.type}, category=${category}, isProduct=${isProduct}, isFoodOrDrinks=${isFoodOrDrinks}, isChallenges=${isChallenges}`);
        return isProduct && isFoodOrDrinks && !isChallenges;
      })
      .reduce((itemTotal, item) => {
        // Find the product to get its profit margin
        const product = products.find(p => p.id === item.id || p.name === item.name);
        console.log(`Found product for ${item.name}:`, product);
        
        if (product) {
          // Calculate profit per unit
          let profitPerUnit = 0;
          
          if (product.profit) {
            // Use existing profit field if available
            profitPerUnit = product.profit;
            console.log(`Using existing profit: ${profitPerUnit} for ${item.name}`);
          } else if (product.buyingPrice && product.sellingPrice) {
            // Calculate profit from buying and selling price
            profitPerUnit = product.sellingPrice - product.buyingPrice;
            console.log(`Calculated profit from prices: ${profitPerUnit} = ${product.sellingPrice} - ${product.buyingPrice} for ${item.name}`);
          } else if (product.buyingPrice && product.price) {
            // Use product price as selling price if sellingPrice not available
            profitPerUnit = product.price - product.buyingPrice;
            console.log(`Calculated profit using price: ${profitPerUnit} = ${product.price} - ${product.buyingPrice} for ${item.name}`);
          }
          
          const totalProfitForItem = profitPerUnit * item.quantity;
          console.log(`Total profit for ${item.name}: ${totalProfitForItem} = ${profitPerUnit} * ${item.quantity}`);
          return itemTotal + totalProfitForItem;
        } else {
          console.log(`No product found for ${item.name}`);
        }
        return itemTotal;
      }, 0);
    
    console.log('Bill product profit:', productProfit);
    return total + productProfit;
  }, 0);

  // Count products with profit data (excluding challenges)
  const productsWithProfit = products.filter(product => {
    const isFoodOrDrinks = product.category === 'food' || product.category === 'drinks';
    const isChallenges = product.category === 'challenges';
    const hasProfit = product.profit || (product.buyingPrice && (product.sellingPrice || product.price));
    return isFoodOrDrinks && !isChallenges && hasProfit;
  }).length;

  console.log('Total product profit:', totalProfit);
  console.log('Products with profit data:', productsWithProfit);

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
