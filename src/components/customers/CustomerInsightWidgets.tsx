import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, UserCheck, DollarSign, Calendar, Award } from 'lucide-react';
import { Customer } from '@/types/pos.types';
import { CurrencyDisplay } from '@/components/ui/currency';

interface CustomerInsightWidgetsProps {
  customers: Customer[];
}

const CustomerInsightWidgets: React.FC<CustomerInsightWidgetsProps> = ({ customers }) => {
  const widgets = useMemo(() => {
    const totalCustomers = customers.length;
    const totalSpent = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);
    const avgSpentPerCustomer = totalCustomers > 0 ? totalSpent / totalCustomers : 0;

    const members = customers.filter((c) => c.isMember);
    const membersCount = members.length;
    const memberPercentage = totalCustomers > 0 ? (membersCount / totalCustomers) * 100 : 0;

    const sortedBySpending = [...customers].sort((a, b) => b.totalSpent - a.totalSpent);
    const top20Percent = Math.ceil(totalCustomers * 0.2);
    const highValueCustomers = sortedBySpending.slice(0, top20Percent);
    const highValueSpending = highValueCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0);
    const highValuePercentage = totalSpent > 0 ? (highValueSpending / totalSpent) * 100 : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCustomers = customers.filter(
      (customer) => new Date(customer.createdAt) >= thirtyDaysAgo || customer.totalSpent > 0
    );
    const activeCustomersCount = recentCustomers.length;

    const totalLoyaltyPoints = customers.reduce((sum, customer) => sum + customer.loyaltyPoints, 0);
    const avgLoyaltyPoints = totalCustomers > 0 ? totalLoyaltyPoints / totalCustomers : 0;

    return [
      {
        title: 'Total Customers',
        value: totalCustomers.toLocaleString(),
        icon: Users,
        description: 'Registered customers',
        color: 'text-cuephoria-purple',
        bgColor: 'bg-cuephoria-purple/10',
      },
      {
        title: 'Avg. Sales per Customer',
        value: <CurrencyDisplay amount={avgSpentPerCustomer} />,
        icon: DollarSign,
        description: 'Average lifetime value',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
      },
      {
        title: 'Active Members',
        value: `${membersCount} (${memberPercentage.toFixed(1)}%)`,
        icon: UserCheck,
        description: 'Customers with membership',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
      },
      {
        title: 'High-Value Customers',
        value: `${highValueCustomers.length} (${highValuePercentage.toFixed(1)}%)`,
        icon: TrendingUp,
        description: 'Top 20% by spending',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
      },
      {
        title: 'Active This Month',
        value: activeCustomersCount.toLocaleString(),
        icon: Calendar,
        description: 'Recent customer activity',
        color: 'text-cuephoria-blue',
        bgColor: 'bg-cuephoria-blue/10',
      },
      {
        title: 'Avg. Loyalty Points',
        value: Math.round(avgLoyaltyPoints).toLocaleString(),
        icon: Award,
        description: 'Points per customer',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
      },
    ];
  }, [customers]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
      {widgets.map((widget, index) => (
        <Card
          key={index}
          className="glass-card glass-card-interactive border-white/10 shadow-xl hover:shadow-cuephoria-purple/25 transition-all duration-300"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium text-white">{widget.title}</CardTitle>
            <div className={`h-8 w-8 rounded-full ${widget.bgColor} flex items-center justify-center`}>
              <widget.icon className={`h-4 w-4 ${widget.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">{widget.value}</div>
            <p className="text-xs text-white/55">{widget.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CustomerInsightWidgets;
