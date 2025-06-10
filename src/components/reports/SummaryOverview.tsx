
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  ShoppingCart, 
  Calendar,
  Target,
  Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

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

interface SummaryOverviewProps {
  filteredBills: Bill[];
  filteredExpenses: Expense[];
  customers: Customer[];
  products: Product[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

const SummaryOverview: React.FC<SummaryOverviewProps> = ({ 
  filteredBills, 
  filteredExpenses, 
  customers, 
  products,
  dateRange 
}) => {
  // Calculate core metrics
  const totalRevenue = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Customer metrics
  const uniqueCustomers = new Set(filteredBills.map(bill => bill.customerId)).size;
  const averageOrderValue = filteredBills.length > 0 ? totalRevenue / filteredBills.length : 0;

  // Activity metrics
  const totalTransactions = filteredBills.length;
  const totalItemsSold = filteredBills.reduce((sum, bill) => 
    sum + bill.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  );

  // Gaming vs Canteen revenue
  const gamingRevenue = filteredBills.reduce((sum, bill) => {
    const gamingItems = bill.items.filter(item => item.type === 'session');
    if (gamingItems.length === 0) return sum;
    
    const gamingItemsTotal = gamingItems.reduce((itemSum, item) => itemSum + item.total, 0);
    const proportionalAmount = bill.subtotal > 0 ? (gamingItemsTotal / bill.subtotal) * bill.total : gamingItemsTotal;
    return sum + proportionalAmount;
  }, 0);

  const canteenRevenue = totalRevenue - gamingRevenue;

  // Payment method breakdown
  const cashPayments = filteredBills.filter(bill => bill.paymentMethod === 'cash');
  const upiPayments = filteredBills.filter(bill => bill.paymentMethod === 'upi');
  const splitPayments = filteredBills.filter(bill => bill.paymentMethod === 'split' || bill.isSplitPayment);

  const cashTotal = cashPayments.reduce((sum, bill) => sum + bill.total, 0) +
    splitPayments.reduce((sum, bill) => sum + (bill.cashAmount || 0), 0);
  
  const upiTotal = upiPayments.reduce((sum, bill) => sum + bill.total, 0) +
    splitPayments.reduce((sum, bill) => sum + (bill.upiAmount || 0), 0);

  // Performance indicators
  const isPositiveProfit = netProfit >= 0;
  const isProfitableMargin = profitMargin >= 15; // 15% is considered good
  const isGoodAOV = averageOrderValue >= 500; // 500 INR is considered good

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-100">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-1">
              <CurrencyDisplay amount={totalRevenue} />
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={isPositiveProfit ? "default" : "destructive"} 
                className={isPositiveProfit ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}
              >
                {isPositiveProfit ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(profitMargin).toFixed(1)}% margin
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border-blue-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">Net Profit</CardTitle>
            <Target className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold mb-1 ${isPositiveProfit ? 'text-white' : 'text-red-400'}`}>
              <CurrencyDisplay amount={netProfit} />
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={isProfitableMargin ? "default" : "secondary"} 
                className={isProfitableMargin ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}
              >
                {isProfitableMargin ? "Healthy" : "Needs attention"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 border-emerald-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-100">Active Customers</CardTitle>
            <Users className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-1">
              {uniqueCustomers}
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              >
                {(uniqueCustomers / Math.max(customers.length, 1) * 100).toFixed(1)}% of total
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-900/50 to-amber-800/30 border-amber-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-100">Avg Order Value</CardTitle>
            <ShoppingCart className="h-5 w-5 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-1">
              <CurrencyDisplay amount={averageOrderValue} />
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={isGoodAOV ? "default" : "secondary"} 
                className={isGoodAOV ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}
              >
                {isGoodAOV ? "Good" : "Can improve"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Breakdown */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-400" />
              Revenue Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Gaming Revenue</span>
                <div className="text-right">
                  <div className="font-semibold text-white">
                    <CurrencyDisplay amount={gamingRevenue} />
                  </div>
                  <div className="text-xs text-gray-400">
                    {totalRevenue > 0 ? ((gamingRevenue / totalRevenue) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Canteen Revenue</span>
                <div className="text-right">
                  <div className="font-semibold text-white">
                    <CurrencyDisplay amount={canteenRevenue} />
                  </div>
                  <div className="text-xs text-gray-400">
                    {totalRevenue > 0 ? ((canteenRevenue / totalRevenue) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
              
              <div className="pt-2 border-t border-gray-700">
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-white">Total Revenue</span>
                  <span className="text-white">
                    <CurrencyDisplay amount={totalRevenue} />
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-400" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Cash Payments</span>
                <div className="text-right">
                  <div className="font-semibold text-white">
                    <CurrencyDisplay amount={cashTotal} />
                  </div>
                  <div className="text-xs text-gray-400">
                    {totalRevenue > 0 ? ((cashTotal / totalRevenue) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">UPI Payments</span>
                <div className="text-right">
                  <div className="font-semibold text-white">
                    <CurrencyDisplay amount={upiTotal} />
                  </div>
                  <div className="text-xs text-gray-400">
                    {totalRevenue > 0 ? ((upiTotal / totalRevenue) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Split Payments</span>
                <div className="text-right">
                  <div className="font-semibold text-white">
                    {splitPayments.length}
                  </div>
                  <div className="text-xs text-gray-400">transactions</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Transactions</span>
                <span className="font-semibold text-white">{totalTransactions}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Items Sold</span>
                <span className="font-semibold text-white">{totalItemsSold}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Expenses</span>
                <span className="font-semibold text-white">
                  <CurrencyDisplay amount={totalExpenses} />
                </span>
              </div>
              
              {dateRange.start && dateRange.end && (
                <div className="pt-2 border-t border-gray-700">
                  <div className="text-xs text-gray-400">
                    Period: {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd, yyyy')}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SummaryOverview;
