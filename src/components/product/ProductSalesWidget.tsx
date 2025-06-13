
import React from 'react';
import { usePOS } from '@/context/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

const ProductSalesWidget: React.FC = () => {
  const { bills, products } = usePOS();

  console.log('ProductSalesWidget - Total bills:', bills.length);
  console.log('ProductSalesWidget - Total products:', products.length);

  // Calculate total sales from food and drinks products (excluding challenges)
  const totalProductSales = bills.reduce((total, bill) => {
    console.log('ProductSalesWidget - Processing bill:', bill.id, 'with items:', bill.items);
    
    const productSales = bill.items
      .filter(item => {
        const isProduct = item.type === 'product';
        
        // Look up the product to get its category
        const product = products.find(p => p.id === item.id || p.name === item.name);
        const category = product?.category?.toLowerCase();
        const isFoodOrDrinks = category === 'food' || category === 'drinks' || category === 'snacks' || category === 'beverage' || category === 'tobacco';
        const isChallenges = category === 'challenges' || category === 'challenge';
        
        console.log(`ProductSalesWidget - Item ${item.name}: type=${item.type}, category=${category}, isProduct=${isProduct}, isFoodOrDrinks=${isFoodOrDrinks}, isChallenges=${isChallenges}`);
        return isProduct && isFoodOrDrinks && !isChallenges;
      })
      .reduce((itemTotal, item) => {
        // Take the item total directly without applying any discount
        console.log(`ProductSalesWidget - Adding item total: ${item.total} for ${item.name}`);
        return itemTotal + item.total;
      }, 0);
    
    console.log('ProductSalesWidget - Bill product sales:', productSales);
    return total + productSales;
  }, 0);

  // Count total food and drinks items sold (excluding challenges)
  const totalItemsSold = bills.reduce((total, bill) => {
    const itemCount = bill.items
      .filter(item => {
        const isProduct = item.type === 'product';
        const product = products.find(p => p.id === item.id || p.name === item.name);
        const category = product?.category?.toLowerCase();
        const isFoodOrDrinks = category === 'food' || category === 'drinks' || category === 'snacks' || category === 'beverage' || category === 'tobacco';
        const isChallenges = category === 'challenges' || category === 'challenge';
        return isProduct && isFoodOrDrinks && !isChallenges;
      })
      .reduce((count, item) => count + item.quantity, 0);
    return total + itemCount;
  }, 0);

  console.log('ProductSalesWidget - Total product sales:', totalProductSales);
  console.log('ProductSalesWidget - Total items sold:', totalItemsSold);

  return (
    <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-blue-500/20 hover:border-blue-500/30 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700/30">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          Total Product Sales
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-blue-400" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 hover:border-blue-500/30 transition-colors">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              <CurrencyDisplay amount={totalProductSales} />
            </div>
            <p className="text-sm text-gray-300">
              Food & drinks sold ({totalItemsSold} items)
            </p>
          </div>
          
          <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Average per item:</span>
              <span className="text-sm font-medium text-blue-300">
                <CurrencyDisplay amount={totalItemsSold > 0 ? totalProductSales / totalItemsSold : 0} />
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductSalesWidget;
