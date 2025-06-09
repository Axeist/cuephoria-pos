
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Progress } from '@/components/ui/progress';
import { 
  Gamepad2, 
  Coffee, 
  Trophy, 
  Users, 
  Star,
  TrendingUp,
  Package,
  Clock
} from 'lucide-react';

interface BillItem {
  id: string;
  name: string;
  quantity: number;
  total: number;
  type: 'product' | 'session';
}

interface Bill {
  id: string;
  customerId: string;
  items: BillItem[];
  subtotal: number;
  discountValue?: number;
  loyaltyPointsUsed?: number;
  total: number;
  paymentMethod: string;
  isSplitPayment?: boolean;
  cashAmount?: number;
  upiAmount?: number;
  createdAt: Date | string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyaltyPoints?: number;
  totalSpent?: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

interface Expense {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
}

interface SummaryMetricsProps {
  filteredBills: Bill[];
  filteredExpenses: Expense[];
  customers: Customer[];
  products: Product[];
}

const SummaryMetrics: React.FC<SummaryMetricsProps> = ({ 
  filteredBills, 
  filteredExpenses, 
  customers, 
  products 
}) => {
  // Gaming station analysis
  const ps5Revenue = filteredBills.reduce((sum, bill) => {
    const ps5Items = bill.items.filter(item => 
      item.type === 'session' && 
      (item.name.toLowerCase().includes('ps5') || item.name.toLowerCase().includes('playstation'))
    );
    if (ps5Items.length === 0) return sum;
    
    const ps5Total = ps5Items.reduce((itemSum, item) => itemSum + item.total, 0);
    const proportionalAmount = bill.subtotal > 0 ? (ps5Total / bill.subtotal) * bill.total : ps5Total;
    return sum + proportionalAmount;
  }, 0);

  const poolRevenue = filteredBills.reduce((sum, bill) => {
    const poolItems = bill.items.filter(item => 
      item.type === 'session' && 
      (item.name.toLowerCase().includes('pool') || 
       item.name.toLowerCase().includes('8-ball') ||
       item.name.toLowerCase().includes('8 ball'))
    );
    if (poolItems.length === 0) return sum;
    
    const poolTotal = poolItems.reduce((itemSum, item) => itemSum + item.total, 0);
    const proportionalAmount = bill.subtotal > 0 ? (poolTotal / bill.subtotal) * bill.total : poolTotal;
    return sum + proportionalAmount;
  }, 0);

  const totalGamingRevenue = ps5Revenue + poolRevenue;

  // Product categories analysis
  const categoryRevenue = products.reduce((acc, product) => {
    const category = product.category.toLowerCase();
    const productSales = filteredBills.reduce((sum, bill) => {
      const productItems = bill.items.filter(item => 
        item.type === 'product' && item.id === product.id
      );
      
      if (productItems.length === 0) return sum;
      
      const productTotal = productItems.reduce((itemSum, item) => itemSum + item.total, 0);
      const proportionalAmount = bill.subtotal > 0 ? (productTotal / bill.subtotal) * bill.total : productTotal;
      return sum + proportionalAmount;
    }, 0);
    
    acc[category] = (acc[category] || 0) + productSales;
    return acc;
  }, {} as Record<string, number>);

  const foodRevenue = (categoryRevenue['food'] || 0) + (categoryRevenue['snacks'] || 0);
  const beverageRevenue = (categoryRevenue['beverage'] || 0) + (categoryRevenue['drinks'] || 0);
  const tobaccoRevenue = categoryRevenue['tobacco'] || 0;

  // Customer insights
  const activeCustomers = customers.filter(customer => 
    filteredBills.some(bill => bill.customerId === customer.id)
  );

  const topCustomers = activeCustomers
    .map(customer => {
      const customerBills = filteredBills.filter(bill => bill.customerId === customer.id);
      const spent = customerBills.reduce((sum, bill) => sum + bill.total, 0);
      return { ...customer, spent, visits: customerBills.length };
    })
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  // Performance metrics
  const totalRevenue = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const loyaltyPointsUsed = filteredBills.reduce((sum, bill) => sum + (bill.loyaltyPointsUsed || 0), 0);
  const loyaltyPointsEarned = filteredBills.reduce((sum, bill) => sum + (bill.loyaltyPointsEarned || 0), 0);

  // Most popular items
  const itemPopularity = filteredBills.reduce((acc, bill) => {
    bill.items.forEach(item => {
      acc[item.name] = (acc[item.name] || 0) + item.quantity;
    });
    return acc;
  }, {} as Record<string, number>);

  const popularItems = Object.entries(itemPopularity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Gaming Performance */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-purple-400" />
            Gaming Station Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">PS5 Stations</span>
                <span className="font-semibold text-white">
                  <CurrencyDisplay amount={ps5Revenue} />
                </span>
              </div>
              <Progress 
                value={totalGamingRevenue > 0 ? (ps5Revenue / totalGamingRevenue) * 100 : 0} 
                className="h-2"
              />
              <div className="text-xs text-gray-400 mt-1">
                {totalGamingRevenue > 0 ? ((ps5Revenue / totalGamingRevenue) * 100).toFixed(1) : 0}% of gaming revenue
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">8-Ball Pool</span>
                <span className="font-semibold text-white">
                  <CurrencyDisplay amount={poolRevenue} />
                </span>
              </div>
              <Progress 
                value={totalGamingRevenue > 0 ? (poolRevenue / totalGamingRevenue) * 100 : 0} 
                className="h-2"
              />
              <div className="text-xs text-gray-400 mt-1">
                {totalGamingRevenue > 0 ? ((poolRevenue / totalGamingRevenue) * 100).toFixed(1) : 0}% of gaming revenue
              </div>
            </div>
            
            <div className="pt-2 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold">Total Gaming</span>
                <span className="text-white font-semibold">
                  <CurrencyDisplay amount={totalGamingRevenue} />
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canteen Performance */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Coffee className="h-5 w-5 text-amber-400" />
            Canteen Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Food & Snacks</span>
                <span className="font-semibold text-white">
                  <CurrencyDisplay amount={foodRevenue} />
                </span>
              </div>
              <Progress 
                value={totalRevenue > 0 ? (foodRevenue / totalRevenue) * 100 : 0} 
                className="h-2"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Beverages</span>
                <span className="font-semibold text-white">
                  <CurrencyDisplay amount={beverageRevenue} />
                </span>
              </div>
              <Progress 
                value={totalRevenue > 0 ? (beverageRevenue / totalRevenue) * 100 : 0} 
                className="h-2"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Tobacco Products</span>
                <span className="font-semibold text-white">
                  <CurrencyDisplay amount={tobaccoRevenue} />
                </span>
              </div>
              <Progress 
                value={totalRevenue > 0 ? (tobaccoRevenue / totalRevenue) * 100 : 0} 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Customers */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            Top Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topCustomers.length > 0 ? (
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{customer.name}</div>
                      <div className="text-xs text-gray-400">{customer.visits} visits</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-white">
                      <CurrencyDisplay amount={customer.spent} />
                    </div>
                    <div className="text-xs text-gray-400">
                      {totalRevenue > 0 ? ((customer.spent / totalRevenue) * 100).toFixed(1) : 0}% of revenue
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400">
              No customer data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Popular Items */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-green-400" />
            Most Popular Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {popularItems.length > 0 ? (
            <div className="space-y-3">
              {popularItems.map(([itemName, quantity], index) => (
                <div key={itemName} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="font-medium text-white truncate">{itemName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-white">{quantity}</div>
                    <div className="text-xs text-gray-400">sold</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400">
              No sales data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SummaryMetrics;
