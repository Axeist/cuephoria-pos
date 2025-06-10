
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  CreditCard,
  Gamepad2
} from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { format, subDays } from 'date-fns';

interface Bill {
  id: string;
  total: number;
  createdAt: Date | string;
  paymentMethod: string;
}

interface Customer {
  id: string;
  name: string;
  isMember: boolean;
}

interface Session {
  id: string;
  startTime: string;
  endTime?: string | null;
}

interface EnhancedBusinessMetricsProps {
  bills: Bill[];
  customers: Customer[];
  sessions: Session[];
}

const EnhancedBusinessMetrics: React.FC<EnhancedBusinessMetricsProps> = ({ 
  bills, 
  customers, 
  sessions 
}) => {
  const metrics = React.useMemo(() => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    
    // Today's revenue
    const todayRevenue = bills
      .filter(bill => {
        const billDate = bill.createdAt instanceof Date ? bill.createdAt : new Date(bill.createdAt);
        return billDate.toDateString() === today.toDateString();
      })
      .reduce((sum, bill) => sum + bill.total, 0);
    
    // Yesterday's revenue
    const yesterdayRevenue = bills
      .filter(bill => {
        const billDate = bill.createdAt instanceof Date ? bill.createdAt : new Date(bill.createdAt);
        return billDate.toDateString() === yesterday.toDateString();
      })
      .reduce((sum, bill) => sum + bill.total, 0);
    
    // Revenue comparison
    const revenueChange = yesterdayRevenue > 0 ? 
      ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
    
    // Customer conversion (members vs total)
    const memberCount = customers.filter(c => c.isMember).length;
    const conversionRate = customers.length > 0 ? (memberCount / customers.length) * 100 : 0;
    
    // Peak play time calculation
    const sessionsByHour: Record<number, number> = {};
    sessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      sessionsByHour[hour] = (sessionsByHour[hour] || 0) + 1;
    });
    
    const peakHour = Object.entries(sessionsByHour)
      .sort(([,a], [,b]) => b - a)[0];
    
    const peakTime = peakHour ? 
      `${peakHour[0].padStart(2, '0')}:00` : '17:00';
    
    // Active sessions
    const activeSessions = sessions.filter(s => !s.endTime).length;
    
    // Payment method split
    const cashSales = bills.filter(b => b.paymentMethod === 'cash').length;
    const digitalPayments = bills.filter(b => b.paymentMethod !== 'cash').length;
    const digitalPercentage = bills.length > 0 ? (digitalPayments / bills.length) * 100 : 0;

    return {
      todayRevenue,
      revenueChange,
      conversionRate,
      peakTime,
      activeSessions,
      digitalPercentage
    };
  }, [bills, customers, sessions]);

  const getStatusColor = (value: number, isPercentage = false) => {
    if (isPercentage) {
      if (value >= 50) return 'positive';
      if (value >= 20) return 'neutral';
      return 'negative';
    } else {
      if (value > 5) return 'positive';
      if (value > -5) return 'neutral';
      return 'negative';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'positive':
        return 'bg-green-900/30 text-green-400 border-green-800';
      case 'neutral':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
      case 'negative':
        return 'bg-red-900/30 text-red-400 border-red-800';
      default:
        return 'bg-gray-800/50 text-gray-400 border-gray-700';
    }
  };

  const metricCards = [
    {
      title: 'Today vs Yesterday',
      value: <CurrencyDisplay amount={metrics.todayRevenue} />,
      subtitle: `Today: ₹${metrics.todayRevenue.toFixed(0)}`,
      status: getStatusColor(metrics.revenueChange),
      badge: `${metrics.revenueChange >= 0 ? '+' : ''}${metrics.revenueChange.toFixed(1)}%`,
      icon: metrics.revenueChange >= 0 ? TrendingUp : TrendingDown
    },
    {
      title: 'Customer Conversion',
      value: `${metrics.conversionRate.toFixed(1)}%`,
      subtitle: `${customers.filter(c => c.isMember).length} members`,
      status: getStatusColor(metrics.conversionRate, true),
      badge: 'membership',
      icon: Users
    },
    {
      title: 'Peak Hours',
      value: metrics.peakTime,
      subtitle: `${metrics.activeSessions} active now`,
      status: 'neutral',
      badge: 'peak time',
      icon: Clock
    },
    {
      title: 'Digital Payments',
      value: `${metrics.digitalPercentage.toFixed(1)}%`,
      subtitle: `${bills.filter(b => b.paymentMethod !== 'cash').length} transactions`,
      status: getStatusColor(metrics.digitalPercentage, true),
      badge: 'cashless',
      icon: CreditCard
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((metric, index) => {
        const IconComponent = metric.icon;
        return (
          <Card key={index} className="border-gray-800 bg-[#1A1F2C] shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <IconComponent className="h-5 w-5 text-purple-500" />
                <Badge 
                  variant="outline" 
                  className={getStatusBadge(metric.status)}
                >
                  {metric.badge}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <div className="text-2xl font-bold text-white">
                  {metric.value}
                </div>
                <div className="text-sm font-medium text-gray-300">
                  {metric.title}
                </div>
                <div className="text-xs text-gray-400">
                  {metric.subtitle}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default EnhancedBusinessMetrics;
