import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Coffee, TrendingUp, Users, BarChart2, ShoppingCart } from 'lucide-react';

interface CafeRevenueWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

interface CafeStats {
  totalOrders: number;
  grossRevenue: number;
  partnerShare: number;
  cuephoriaShare: number;
  avgOrderValue: number;
  selfOrders: number;
}

const CafeRevenueWidget: React.FC<CafeRevenueWidgetProps> = ({ startDate, endDate }) => {
  const [stats, setStats] = useState<CafeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let query = supabase
          .from('cafe_orders')
          .select('total, discount, partner_share, cuephoria_share, order_source')
          .eq('status', 'completed');

        if (startDate) query = query.gte('created_at', startDate.toISOString());
        if (endDate) query = query.lte('created_at', endDate.toISOString());

        const { data, error } = await query;
        if (error) throw error;

        const orders = data || [];
        const grossRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
        const partnerShare = orders.reduce((s, o) => s + Number(o.partner_share), 0);
        const cuephoriaShare = orders.reduce((s, o) => s + Number(o.cuephoria_share), 0);
        const selfOrders = orders.filter(o => o.order_source === 'customer').length;

        setStats({
          totalOrders: orders.length,
          grossRevenue,
          partnerShare,
          cuephoriaShare,
          avgOrderValue: orders.length > 0 ? grossRevenue / orders.length : 0,
          selfOrders,
        });
      } catch (err) {
        console.error('Error fetching cafe stats:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [startDate, endDate]);

  if (loading || !stats || stats.totalOrders === 0) return null;

  return (
    <Card className="glass-card glass-card-interactive border-white/10 shadow-xl overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-heading text-white flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500 to-cuephoria-purple flex items-center justify-center">
            <Coffee className="h-4 w-4 text-white" />
          </div>
          Cafe Revenue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 theme-inset">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-green-400" />
              <p className="text-[10px] text-gray-400 font-quicksand">Revenue</p>
            </div>
            <p className="text-lg font-bold text-green-400"><CurrencyDisplay amount={stats.grossRevenue} /></p>
          </div>
          <div className="p-3 theme-inset">
            <div className="flex items-center gap-1 mb-1">
              <ShoppingCart className="h-3 w-3 text-blue-400" />
              <p className="text-[10px] text-gray-400 font-quicksand">Orders</p>
            </div>
            <p className="text-lg font-bold text-blue-400">{stats.totalOrders}</p>
          </div>
          <div className="p-3 theme-inset">
            <div className="flex items-center gap-1 mb-1">
              <BarChart2 className="h-3 w-3 text-orange-400" />
              <p className="text-[10px] text-gray-400 font-quicksand">Avg Order</p>
            </div>
            <p className="text-lg font-bold text-orange-400"><CurrencyDisplay amount={stats.avgOrderValue} /></p>
          </div>
        </div>

        {/* Revenue Split Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-400 font-quicksand">
            <span className="flex items-center gap-1"><Users className="h-3 w-3 text-orange-400" /> Partner Share</span>
            <span className="text-orange-400 font-medium"><CurrencyDisplay amount={stats.partnerShare} /></span>
          </div>
          <div className="w-full bg-gray-700/30 rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400"
              style={{ width: `${stats.grossRevenue > 0 ? (stats.partnerShare / stats.grossRevenue) * 100 : 0}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 font-quicksand">
            <span className="flex items-center gap-1"><BarChart2 className="h-3 w-3 text-cuephoria-lightpurple" /> Cuephoria Share</span>
            <span className="text-cuephoria-lightpurple font-medium"><CurrencyDisplay amount={stats.cuephoriaShare} /></span>
          </div>
          <div className="w-full bg-gray-700/30 rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple"
              style={{ width: `${stats.grossRevenue > 0 ? (stats.cuephoriaShare / stats.grossRevenue) * 100 : 0}%` }} />
          </div>
        </div>

        {stats.selfOrders > 0 && (
          <p className="text-[10px] text-gray-500 font-quicksand text-right">{stats.selfOrders} self-orders</p>
        )}
      </CardContent>
    </Card>
  );
};

export default CafeRevenueWidget;
