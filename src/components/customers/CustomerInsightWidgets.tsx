import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, UserCheck, DollarSign, Calendar, Award } from 'lucide-react';
import { Customer } from '@/types/pos.types';
import { CurrencyDisplay } from '@/components/ui/currency';
interface CustomerInsightWidgetsProps {
  customers: Customer[];
}
const CustomerInsightWidgets: React.FC<CustomerInsightWidgetsProps> = ({
  customers
}) => {
  // Calculate insights
  const totalCustomers = customers.length;
  const totalSpent = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);
  const avgSpentPerCustomer = totalCustomers > 0 ? totalSpent / totalCustomers : 0;

  // Members vs Non-members
  const members = customers.filter(c => c.isMember);
  const membersCount = members.length;
  const memberPercentage = totalCustomers > 0 ? membersCount / totalCustomers * 100 : 0;

  // High-value customers (top 20% by spending)
  const sortedBySpending = [...customers].sort((a, b) => b.totalSpent - a.totalSpent);
  const top20Percent = Math.ceil(totalCustomers * 0.2);
  const highValueCustomers = sortedBySpending.slice(0, top20Percent);
  const highValueSpending = highValueCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0);
  const highValuePercentage = totalSpent > 0 ? highValueSpending / totalSpent * 100 : 0;

  // Active customers (customers with recent activity - last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCustomers = customers.filter(customer => new Date(customer.createdAt) >= thirtyDaysAgo || customer.totalSpent > 0);
  const activeCustomersCount = recentCustomers.length;

  // Loyalty points insights
  const totalLoyaltyPoints = customers.reduce((sum, customer) => sum + customer.loyaltyPoints, 0);
  const avgLoyaltyPoints = totalCustomers > 0 ? totalLoyaltyPoints / totalCustomers : 0;
  const widgets = [{
    title: "Total Customers",
    value: totalCustomers.toLocaleString(),
    icon: Users,
    description: "Registered customers",
    color: "text-cuephoria-purple",
    bgColor: "bg-cuephoria-purple/10"
  }, {
    title: "Avg. Sales per Customer",
    value: <CurrencyDisplay amount={avgSpentPerCustomer} />,
    icon: DollarSign,
    description: "Average lifetime value",
    color: "text-green-500",
    bgColor: "bg-green-500/10"
  }, {
    title: "Active Members",
    value: `${membersCount} (${memberPercentage.toFixed(1)}%)`,
    icon: UserCheck,
    description: "Customers with membership",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10"
  }, {
    title: "High-Value Customers",
    value: `${highValueCustomers.length} (${highValuePercentage.toFixed(1)}%)`,
    icon: TrendingUp,
    description: "Top 20% by spending",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10"
  }, {
    title: "Active This Month",
    value: activeCustomersCount.toLocaleString(),
    icon: Calendar,
    description: "Recent customer activity",
    color: "text-cuephoria-blue",
    bgColor: "bg-cuephoria-blue/10"
  }, {
    title: "Avg. Loyalty Points",
    value: Math.round(avgLoyaltyPoints).toLocaleString(),
    icon: Award,
    description: "Points per customer",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10"
  }];
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
      {widgets.map((widget, index) => <Card key={index} className="shadow-lg transition-all duration-300 hover:shadow-xl border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-50">
              {widget.title}
            </CardTitle>
            <div className={`h-8 w-8 rounded-full ${widget.bgColor} flex items-center justify-center`}>
              <widget.icon className={`h-4 w-4 ${widget.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white-900 dark:text-white mb-1 rounded-none bg-inherit">
              {widget.value}
            </div>
            <p className="text-xs text-zinc-500">
              {widget.description}
            </p>
          </CardContent>
        </Card>)}
    </div>;
};
export default CustomerInsightWidgets;