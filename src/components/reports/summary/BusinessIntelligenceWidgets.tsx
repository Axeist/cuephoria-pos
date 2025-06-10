
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Clock, Users, Target, AlertCircle } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface Bill {
  id: string;
  total: number;
  createdAt: Date | string;
  customerId: string;
  loyaltyPointsUsed?: number;
  loyaltyPointsEarned?: number;
}

interface Customer {
  id: string;
  isMember: boolean;
  loyaltyPoints: number;
}

interface Session {
  id: string;
  startTime: Date | string;
  endTime?: Date | string;
  duration?: number;
  stationId: string;
}

interface BusinessIntelligenceWidgetsProps {
  bills: Bill[];
  customers: Customer[];
  sessions: Session[];
}

const BusinessIntelligenceWidgets: React.FC<BusinessIntelligenceWidgetsProps> = ({ 
  bills, 
  customers, 
  sessions 
}) => {
  const insights = React.useMemo(() => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    const lastWeek = subDays(today, 7);

    // Today's vs Yesterday's revenue
    const todayRevenue = bills
      .filter(bill => {
        const billDate = bill.createdAt instanceof Date ? bill.createdAt : new Date(bill.createdAt);
        return billDate >= startOfDay(today) && billDate <= endOfDay(today);
      })
      .reduce((sum, bill) => sum + bill.total, 0);

    const yesterdayRevenue = bills
      .filter(bill => {
        const billDate = bill.createdAt instanceof Date ? bill.createdAt : new Date(bill.createdAt);
        return billDate >= startOfDay(yesterday) && billDate <= endOfDay(yesterday);
      })
      .reduce((sum, bill) => sum + bill.total, 0);

    const revenueGrowth = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
      : 0;

    // Customer retention analysis
    const totalCustomers = customers.length;
    const memberCustomers = customers.filter(c => c.isMember).length;
    const membershipRate = totalCustomers > 0 ? (memberCustomers / totalCustomers) * 100 : 0;

    // Average session duration
    const completedSessions = sessions.filter(s => s.endTime);
    const avgSessionDuration = completedSessions.length > 0 
      ? completedSessions.reduce((sum, session) => {
          if (session.duration) return sum + session.duration;
          if (session.endTime) {
            const start = new Date(session.startTime).getTime();
            const end = new Date(session.endTime).getTime();
            return sum + Math.round((end - start) / (1000 * 60));
          }
          return sum;
        }, 0) / completedSessions.length
      : 0;

    // Peak hour analysis
    const sessionsByHour: Record<number, number> = {};
    sessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      sessionsByHour[hour] = (sessionsByHour[hour] || 0) + 1;
    });

    const peakHour = Object.entries(sessionsByHour)
      .reduce((peak, [hour, count]) => 
        count > peak.count ? { hour: parseInt(hour), count } : peak, 
        { hour: 0, count: 0 }
      );

    // Loyalty program effectiveness
    const totalLoyaltyPointsUsed = bills.reduce((sum, bill) => sum + (bill.loyaltyPointsUsed || 0), 0);
    const totalLoyaltyPointsEarned = bills.reduce((sum, bill) => sum + (bill.loyaltyPointsEarned || 0), 0);
    const loyaltyUsageRate = totalLoyaltyPointsEarned > 0 
      ? (totalLoyaltyPointsUsed / totalLoyaltyPointsEarned) * 100 
      : 0;

    // Revenue per customer
    const revenuePerCustomer = totalCustomers > 0 
      ? bills.reduce((sum, bill) => sum + bill.total, 0) / totalCustomers 
      : 0;

    return {
      revenueGrowth,
      todayRevenue,
      membershipRate,
      avgSessionDuration,
      peakHour,
      loyaltyUsageRate,
      revenuePerCustomer
    };
  }, [bills, customers, sessions]);

  const widgets = [
    {
      title: "Revenue Growth",
      value: `${insights.revenueGrowth >= 0 ? '+' : ''}${insights.revenueGrowth.toFixed(1)}%`,
      subtitle: "vs Yesterday",
      icon: insights.revenueGrowth >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />,
      trend: insights.revenueGrowth >= 0 ? 'positive' : 'negative',
      extra: `Today: ₹${insights.todayRevenue.toFixed(0)}`
    },
    {
      title: "Membership Rate",
      value: `${insights.membershipRate.toFixed(1)}%`,
      subtitle: "Customer Conversion",
      icon: <Users className="h-5 w-5" />,
      trend: insights.membershipRate >= 30 ? 'positive' : insights.membershipRate >= 15 ? 'neutral' : 'negative',
      extra: `${customers.filter(c => c.isMember).length} members`
    },
    {
      title: "Avg Session",
      value: `${Math.floor(insights.avgSessionDuration / 60)}h ${Math.floor(insights.avgSessionDuration % 60)}m`,
      subtitle: "Play Duration",
      icon: <Clock className="h-5 w-5" />,
      trend: insights.avgSessionDuration >= 90 ? 'positive' : insights.avgSessionDuration >= 60 ? 'neutral' : 'negative',
      extra: `Peak: ${insights.peakHour.hour}:00`
    },
    {
      title: "Loyalty Usage",
      value: `${insights.loyaltyUsageRate.toFixed(1)}%`,
      subtitle: "Points Redeemed",
      icon: <Target className="h-5 w-5" />,
      trend: insights.loyaltyUsageRate >= 20 ? 'positive' : insights.loyaltyUsageRate >= 10 ? 'neutral' : 'negative',
      extra: "Program Effectiveness"
    }
  ];

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      case 'neutral': return 'text-yellow-500';
      default: return 'text-gray-400';
    }
  };

  const getTrendBg = (trend: string) => {
    switch (trend) {
      case 'positive': return 'bg-green-900/20 border-green-800';
      case 'negative': return 'bg-red-900/20 border-red-800';
      case 'neutral': return 'bg-yellow-900/20 border-yellow-800';
      default: return 'bg-gray-800/50 border-gray-700';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {widgets.map((widget, index) => (
        <Card key={index} className={`border ${getTrendBg(widget.trend)}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={getTrendColor(widget.trend)}>
                {widget.icon}
              </div>
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  widget.trend === 'positive' ? 'border-green-600 text-green-400' :
                  widget.trend === 'negative' ? 'border-red-600 text-red-400' :
                  'border-yellow-600 text-yellow-400'
                }`}
              >
                {widget.trend}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-white">
                {widget.value}
              </div>
              <div className="text-sm text-gray-400">
                {widget.subtitle}
              </div>
              <div className="text-xs text-gray-500">
                {widget.extra}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default BusinessIntelligenceWidgets;
