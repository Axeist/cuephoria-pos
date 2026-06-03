import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Coffee, TrendingUp, Users, BarChart2, ShoppingCart } from 'lucide-react';
import { useLocation } from '@/context/LocationContext';

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

type CafeRevenueRpcRow = {
  total_orders: number;
  gross_revenue: number;
  partner_share: number;
  cuephoria_share: number;
  self_orders: number;
};

const CafeRevenueWidget: React.FC<CafeRevenueWidgetProps> = ({ startDate, endDate }) => {
  const [stats, setStats] = useState<CafeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { activeLocationId } = useLocation();

  useEffect(() => {
    if (!activeLocationId) {
      setStats(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_cafe_revenue_stats', {
          p_location_id: activeLocationId,
          p_start: startDate?.toISOString() ?? null,
          p_end: endDate?.toISOString() ?? null,
        });

        if (error) throw error;
        if (cancelled) return;

        const row = data as CafeRevenueRpcRow | null;
        const totalOrders = row?.total_orders ?? 0;
        const grossRevenue = Number(row?.gross_revenue ?? 0);

        setStats({
          totalOrders,
          grossRevenue,
          partnerShare: Number(row?.partner_share ?? 0),
          cuephoriaShare: Number(row?.cuephoria_share ?? 0),
          avgOrderValue: totalOrders > 0 ? grossRevenue / totalOrders : 0,
          selfOrders: row?.self_orders ?? 0,
        });
      } catch (err) {
        console.error('Error fetching cafe stats:', err);
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeLocationId, startDate, endDate]);

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
            <p className="text-lg font-bold text-white">{stats.totalOrders}</p>
          </div>
          <div className="p-3 theme-inset">
            <div className="flex items-center gap-1 mb-1">
              <BarChart2 className="h-3 w-3 text-purple-400" />
              <p className="text-[10px] text-gray-400 font-quicksand">Avg Order</p>
            </div>
            <p className="text-lg font-bold text-white"><CurrencyDisplay amount={stats.avgOrderValue} /></p>
          </div>
          <div className="p-3 theme-inset">
            <div className="flex items-center gap-1 mb-1">
              <Users className="h-3 w-3 text-orange-400" />
              <p className="text-[10px] text-gray-400 font-quicksand">Self Orders</p>
            </div>
            <p className="text-lg font-bold text-white">{stats.selfOrders}</p>
          </div>
          <div className="p-3 theme-inset">
            <p className="text-[10px] text-gray-400 font-quicksand mb-1">Partner Share</p>
            <p className="text-sm font-semibold text-orange-300"><CurrencyDisplay amount={stats.partnerShare} /></p>
          </div>
          <div className="p-3 theme-inset">
            <p className="text-[10px] text-gray-400 font-quicksand mb-1">Cuephoria Share</p>
            <p className="text-sm font-semibold text-purple-300"><CurrencyDisplay amount={stats.cuephoriaShare} /></p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CafeRevenueWidget;
