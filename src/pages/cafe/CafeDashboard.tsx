import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeOrders } from '@/hooks/cafe/useCafeOrders';
import { useCafePartner } from '@/hooks/cafe/useCafePartner';
import { useCafeSettlements } from '@/hooks/cafe/useCafeSettlements';
import { DollarSign, ShoppingCart, TrendingUp, Clock, Users, BarChart2 } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

const CafeDashboard: React.FC = () => {
  const { user } = useCafeAuth();
  const { todayOrders, activeOrders, loading: ordersLoading } = useCafeOrders(user?.locationId);
  const { partner } = useCafePartner(user?.locationId);
  const { settlements } = useCafeSettlements(user?.locationId, partner?.id);

  const stats = useMemo(() => {
    const completed = todayOrders.filter(o => o.status === 'completed');
    const totalRevenue = completed.reduce((s, o) => s + o.total, 0);
    const partnerShare = completed.reduce((s, o) => s + o.partnerShare, 0);
    const cuephoriaShare = completed.reduce((s, o) => s + o.cuephoriaShare, 0);
    const avgOrderValue = completed.length > 0 ? totalRevenue / completed.length : 0;
    const pendingOrders = activeOrders.filter(o => o.status === 'pending').length;

    return { totalRevenue, partnerShare, cuephoriaShare, completedOrders: completed.length, avgOrderValue, pendingOrders, activeOrdersCount: activeOrders.length };
  }, [todayOrders, activeOrders]);

  const statCards = [
    { label: "Today's Revenue", value: stats.totalRevenue, icon: DollarSign, color: 'text-green-400', format: 'currency' as const },
    { label: 'Orders Today', value: stats.completedOrders, icon: ShoppingCart, color: 'text-blue-400', format: 'number' as const },
    { label: 'Active Orders', value: stats.activeOrdersCount, icon: Clock, color: 'text-orange-400', format: 'number' as const },
    { label: 'Avg Order Value', value: stats.avgOrderValue, icon: TrendingUp, color: 'text-purple-400', format: 'currency' as const },
    { label: 'Partner Share', value: stats.partnerShare, icon: Users, color: 'text-orange-400', format: 'currency' as const },
    { label: 'Cuephoria Share', value: stats.cuephoriaShare, icon: BarChart2, color: 'text-cuephoria-lightpurple', format: 'currency' as const },
  ];

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text font-heading animate-slide-down">
          Cafe Dashboard
        </h1>
        <div className="text-sm text-gray-400 font-quicksand">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <Card key={card.label} className={`bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl animate-slide-up`} style={{ animationDelay: `${i * 50}ms` }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`h-4 w-4 ${card.color}`} />
                <p className="text-xs text-gray-400 font-quicksand">{card.label}</p>
              </div>
              <p className={`text-xl font-bold ${card.color} font-heading`}>
                {card.format === 'currency' ? <CurrencyDisplay amount={card.value} /> : card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Split */}
      {partner && (
        <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl animate-slide-up" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <CardTitle className="text-lg font-heading text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-400" /> Revenue Split
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 font-quicksand">Partner ({partner.partnerRate}%)</span>
              <span className="text-orange-400 font-bold"><CurrencyDisplay amount={stats.partnerShare} /></span>
            </div>
            <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
                style={{ width: `${stats.totalRevenue > 0 ? (stats.partnerShare / stats.totalRevenue) * 100 : 0}%` }} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 font-quicksand">Cuephoria ({partner.cuephoriaRate}%)</span>
              <span className="text-cuephoria-lightpurple font-bold"><CurrencyDisplay amount={stats.cuephoriaShare} /></span>
            </div>
            <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple transition-all duration-500"
                style={{ width: `${stats.totalRevenue > 0 ? (stats.cuephoriaShare / stats.totalRevenue) * 100 : 0}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Settlements */}
      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl animate-slide-up" style={{ animationDelay: '400ms' }}>
        <CardHeader>
          <CardTitle className="text-lg font-heading text-white">Recent Settlements</CardTitle>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <p className="text-sm text-gray-500 font-quicksand">No settlements yet</p>
          ) : (
            <div className="space-y-2">
              {settlements.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
                  <div>
                    <p className="text-sm font-medium text-white font-quicksand">{s.settlementDate}</p>
                    <p className="text-xs text-gray-400">{s.totalOrders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white"><CurrencyDisplay amount={s.netRevenue} /></p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                      s.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CafeDashboard;
