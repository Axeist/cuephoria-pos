
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp,
  Calendar
} from 'lucide-react';
import { format, parseISO, startOfDay, eachDayOfInterval, isWithinInterval } from 'date-fns';

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

interface SummaryChartsProps {
  filteredBills: Bill[];
  filteredExpenses: Expense[];
  customers: Customer[];
  products: Product[];
}

const COLORS = {
  primary: '#8b5cf6',
  secondary: '#06b6d4',
  accent: '#f59e0b',
  success: '#10b981',
  warning: '#f97316',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  indigo: '#6366f1'
};

const SummaryCharts: React.FC<SummaryChartsProps> = ({ 
  filteredBills, 
  filteredExpenses, 
  customers, 
  products 
}) => {
  // Revenue vs Expenses by Category
  const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.entries(expensesByCategory).map(([category, amount]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    expenses: amount
  }));

  // Revenue breakdown pie chart
  const totalRevenue = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
  
  const gamingRevenue = filteredBills.reduce((sum, bill) => {
    const gamingItems = bill.items.filter(item => item.type === 'session');
    if (gamingItems.length === 0) return sum;
    
    const gamingTotal = gamingItems.reduce((itemSum, item) => itemSum + item.total, 0);
    const proportionalAmount = bill.subtotal > 0 ? (gamingTotal / bill.subtotal) * bill.total : gamingTotal;
    return sum + proportionalAmount;
  }, 0);

  const canteenRevenue = totalRevenue - gamingRevenue;

  const revenueBreakdown = [
    { name: 'Gaming', value: gamingRevenue, color: COLORS.primary },
    { name: 'Canteen', value: canteenRevenue, color: COLORS.secondary }
  ].filter(item => item.value > 0);

  // Payment method distribution
  const paymentData = [
    {
      method: 'Cash',
      amount: filteredBills.filter(bill => bill.paymentMethod === 'cash').reduce((sum, bill) => sum + bill.total, 0) +
              filteredBills.filter(bill => bill.isSplitPayment).reduce((sum, bill) => sum + (bill.cashAmount || 0), 0),
      color: COLORS.success
    },
    {
      method: 'UPI',
      amount: filteredBills.filter(bill => bill.paymentMethod === 'upi').reduce((sum, bill) => sum + bill.total, 0) +
              filteredBills.filter(bill => bill.isSplitPayment).reduce((sum, bill) => sum + (bill.upiAmount || 0), 0),
      color: COLORS.info
    },
    {
      method: 'Split',
      amount: filteredBills.filter(bill => bill.paymentMethod === 'split' || bill.isSplitPayment).length,
      color: COLORS.warning
    }
  ].filter(item => item.amount > 0);

  // Daily revenue trend (last 7 days of available data)
  const billDates = filteredBills.map(bill => startOfDay(new Date(bill.createdAt)));
  const uniqueDates = Array.from(new Set(billDates.map(date => date.getTime())))
    .map(time => new Date(time))
    .sort((a, b) => a.getTime() - b.getTime());

  const last7Days = uniqueDates.slice(-7);
  
  const dailyRevenue = last7Days.map(date => {
    const dayBills = filteredBills.filter(bill => {
      const billDate = startOfDay(new Date(bill.createdAt));
      return billDate.getTime() === date.getTime();
    });
    
    const revenue = dayBills.reduce((sum, bill) => sum + bill.total, 0);
    
    return {
      date: format(date, 'MMM dd'),
      revenue,
      bills: dayBills.length
    };
  });

  // Gaming station performance
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

  const stationData = [
    { station: 'PS5 Stations', revenue: ps5Revenue, color: COLORS.purple },
    { station: '8-Ball Pool', revenue: poolRevenue, color: COLORS.accent }
  ].filter(item => item.revenue > 0);

  return (
    <div className="space-y-6">
      {/* Revenue Trend */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            Daily Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any, name: string) => [
                    name === 'revenue' ? <CurrencyDisplay amount={value} /> : value,
                    name === 'revenue' ? 'Revenue' : 'Bills'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke={COLORS.primary}
                  fill={COLORS.primary}
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              No revenue data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Breakdown */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-purple-400" />
            Revenue Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenueBreakdown.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="w-full lg:w-1/2">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={revenueBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {revenueBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: any) => <CurrencyDisplay amount={value} />}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full lg:w-1/2 space-y-3">
                {revenueBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-gray-300">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-white">
                        <CurrencyDisplay amount={item.value} />
                      </div>
                      <div className="text-xs text-gray-400">
                        {totalRevenue > 0 ? ((item.value / totalRevenue) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400">
              No revenue data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gaming Station Performance */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            Gaming Station Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="station" 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => <CurrencyDisplay amount={value} />}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {stationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              No gaming revenue data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Categories */}
      {categoryData.length > 0 && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-red-400" />
              Expense Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="category" 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => <CurrencyDisplay amount={value} />}
                />
                <Bar 
                  dataKey="expenses" 
                  fill={COLORS.danger}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SummaryCharts;
