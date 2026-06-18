import React, { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeOrders } from '@/hooks/cafe/useCafeOrders';
import { useCafePartner } from '@/hooks/cafe/useCafePartner';
import { useCafeKOT } from '@/hooks/cafe/useCafeKOT';
import { useCafeTables } from '@/hooks/cafe/useCafeTables';
import { useCafeSettlements } from '@/hooks/cafe/useCafeSettlements';
import {
  DollarSign, ShoppingCart, TrendingUp, Clock, BarChart2, CookingPot,
  MapPin, Coffee, Flame, UtensilsCrossed, CalendarDays,
} from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { CafePageShell } from '@/components/cafe/CafePageShell';
import {
  CafeDatePreset,
  CAFE_DATE_LABELS,
  getCafeDateRange,
  formatCafeDateRange,
} from '@/lib/cafeDateFilter';

const STORAGE_KEY = 'cafe_dashboard_filter_v1';

interface StoredFilter {
  preset: CafeDatePreset;
  customStart: string;
  customEnd: string;
}

const loadStoredFilter = (): StoredFilter => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredFilter>;
      if (parsed.preset && parsed.preset in CAFE_DATE_LABELS) {
        return {
          preset: parsed.preset,
          customStart: parsed.customStart || today,
          customEnd: parsed.customEnd || today,
        };
      }
    }
  } catch {
    /* ignore */
  }
  return { preset: 'this_month', customStart: today, customEnd: today };
};

const CafeDashboard: React.FC = () => {
  const { user } = useCafeAuth();
  const { activeOrders, orders } = useCafeOrders(user?.locationId);
  const { partner } = useCafePartner(user?.locationId);
  const { pendingKots } = useCafeKOT(user?.locationId);
  const { tables } = useCafeTables(user?.locationId);
  const { settlements } = useCafeSettlements(user?.locationId, partner?.id);
  const [currentTime, setCurrentTime] = useState(new Date());

  const initial = useMemo(loadStoredFilter, []);
  const [datePreset, setDatePreset] = useState<CafeDatePreset>(initial.preset);
  const [customStart, setCustomStart] = useState(initial.customStart);
  const [customEnd, setCustomEnd] = useState(initial.customEnd);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ preset: datePreset, customStart, customEnd })
      );
    } catch {
      /* ignore */
    }
  }, [datePreset, customStart, customEnd]);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const dateRange = useMemo(
    () => getCafeDateRange(datePreset, customStart, customEnd),
    [datePreset, customStart, customEnd]
  );

  const rangeOrders = useMemo(
    () =>
      orders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= dateRange.start && d <= dateRange.end;
      }),
    [orders, dateRange]
  );

  const rangeLabel = formatCafeDateRange(dateRange, datePreset);
  const rangeTitle = CAFE_DATE_LABELS[datePreset];

  const stats = useMemo(() => {
    const nonCancelled = rangeOrders.filter(o => o.status !== 'cancelled');
    const totalRevenue = nonCancelled.reduce((s, o) => s + o.total, 0);
    const partnerShare = nonCancelled.reduce((s, o) => s + o.partnerShare, 0);
    const cuephoriaShare = nonCancelled.reduce((s, o) => s + o.cuephoriaShare, 0);
    const avgOrderValue = nonCancelled.length > 0 ? totalRevenue / nonCancelled.length : 0;
    const cancelledInRange = rangeOrders.filter(o => o.status === 'cancelled').length;
    const selfOrdersInRange = rangeOrders.filter(o => o.orderSource === 'customer').length;
    const occupiedTables = tables.filter(t => t.isOccupied).length;
    const dineInOrders = nonCancelled.filter(o => o.orderType === 'dine_in').length;
    const takeawayOrders = nonCancelled.filter(o => o.orderType === 'takeaway').length;
    const selfOrders = nonCancelled.filter(o => o.orderSource === 'customer').length;
    const cashOrders = nonCancelled.filter(o => o.paymentMethod === 'cash');
    const upiOrders = nonCancelled.filter(o => o.paymentMethod === 'upi');
    const pendingPayOrders = nonCancelled.filter(o => o.paymentMethod === 'pending');
    const cashRevenue = cashOrders.reduce((s, o) => s + o.total, 0);
    const upiRevenue = upiOrders.reduce((s, o) => s + o.total, 0);
    const pendingPayRevenue = pendingPayOrders.reduce((s, o) => s + o.total, 0);

    return {
      totalRevenue, partnerShare, cuephoriaShare, completedOrders: nonCancelled.length,
      avgOrderValue, activeOrdersCount: activeOrders.length,
      cancelledInRange, selfOrdersInRange, occupiedTables, totalTables: tables.length,
      dineInOrders, takeawayOrders, selfOrders, cashRevenue, upiRevenue,
      pendingPayOrders: pendingPayOrders.length, pendingPayRevenue,
    };
  }, [rangeOrders, activeOrders, tables]);

  // Hourly revenue breakdown — only for single-day ranges; otherwise show daily.
  const isSingleDay = useMemo(() => {
    const sameDay =
      dateRange.start.toDateString() === dateRange.end.toDateString();
    return sameDay;
  }, [dateRange]);

  const timeSeries = useMemo(() => {
    const valid = rangeOrders.filter(o => o.status !== 'cancelled');
    if (isSingleDay) {
      const buckets: { label: string; revenue: number; orders: number }[] = [];
      for (let h = 8; h <= 23; h++) {
        const label = `${h > 12 ? h - 12 : h}${h >= 12 ? 'PM' : 'AM'}`;
        const slot = valid.filter(o => new Date(o.createdAt).getHours() === h);
        buckets.push({
          label,
          revenue: slot.reduce((s, o) => s + o.total, 0),
          orders: slot.length,
        });
      }
      return buckets;
    }

    // Multi-day: daily buckets, cap at 31 bars.
    const start = new Date(dateRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);
    const spanDays = Math.min(
      31,
      Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
    );
    const dayLen = Math.floor(
      (end.getTime() - start.getTime()) / spanDays
    );
    const buckets: { label: string; revenue: number; orders: number }[] = [];
    for (let i = 0; i < spanDays; i++) {
      const bStart = new Date(start.getTime() + i * dayLen);
      const bEnd =
        i === spanDays - 1
          ? end
          : new Date(start.getTime() + (i + 1) * dayLen - 1);
      const slot = valid.filter(o => {
        const t = new Date(o.createdAt).getTime();
        return t >= bStart.getTime() && t <= bEnd.getTime();
      });
      buckets.push({
        label: bStart.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        }),
        revenue: slot.reduce((s, o) => s + o.total, 0),
        orders: slot.length,
      });
    }
    return buckets;
  }, [rangeOrders, dateRange, isSingleDay]);

  const maxBarRevenue = Math.max(...timeSeries.map(h => h.revenue), 1);

  // Top selling items (in filtered range)
  const topItems = useMemo(() => {
    const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
    rangeOrders.filter(o => o.status !== 'cancelled' && o.items).forEach(order => {
      order.items?.forEach(item => {
        const key = item.itemName;
        const existing = itemMap.get(key) || { name: key, qty: 0, revenue: 0 };
        existing.qty += item.quantity;
        existing.revenue += item.total;
        itemMap.set(key, existing);
      });
    });
    return [...itemMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [rangeOrders]);

  // Recent activity — always show most recent from the filtered range.
  const recentActivity = useMemo(() => {
    return [...rangeOrders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [rangeOrders]);

  const statCards = [
    { label: `Revenue · ${rangeTitle}`, value: stats.totalRevenue, icon: DollarSign, color: 'text-green-400', bg: 'from-green-500/10 to-green-500/5', format: 'currency' as const },
    { label: 'Completed Orders', value: stats.completedOrders, icon: ShoppingCart, color: 'text-blue-400', bg: 'from-blue-500/10 to-blue-500/5', format: 'number' as const },
    { label: 'Active Orders (live)', value: stats.activeOrdersCount, icon: Clock, color: 'text-orange-400', bg: 'from-orange-500/10 to-orange-500/5', format: 'number' as const },
    { label: 'Avg Order Value', value: stats.avgOrderValue, icon: TrendingUp, color: 'text-purple-400', bg: 'from-purple-500/10 to-purple-500/5', format: 'currency' as const },
    { label: 'Pending KOTs (live)', value: pendingKots.length, icon: CookingPot, color: 'text-yellow-400', bg: 'from-yellow-500/10 to-yellow-500/5', format: 'number' as const },
    { label: 'Tables Occupied (now)', value: `${stats.occupiedTables}/${stats.totalTables}`, icon: MapPin, color: 'text-cyan-400', bg: 'from-cyan-500/10 to-cyan-500/5', format: 'string' as const },
  ];

  const selectCls =
    'bg-white/[0.03] border-white/[0.06] text-white text-xs font-quicksand h-9 rounded-lg [&>span]:truncate';
  const selectContentCls = 'bg-zinc-900/98 border-white/[0.08] backdrop-blur-xl';

  return (
    <CafePageShell
      eyebrow="Overview"
      title="Cafe Dashboard"
      description={`${rangeLabel} · ${rangeOrders.length} orders`}
      action={
        <div className="text-right">
          <p className="text-2xl font-bold text-white font-heading tabular-nums">
            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-xs text-zinc-500 font-quicksand">
            {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
        </div>
      }
      contentClassName="space-y-4"
    >
      {/* ── Global filter bar (applies to the entire dashboard) ── */}
      <div className="cafe-glass-card !rounded-xl p-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 font-quicksand">
          Filter
        </span>
        <Select value={datePreset} onValueChange={v => setDatePreset(v as CafeDatePreset)}>
          <SelectTrigger className={`w-[170px] ${selectCls}`}>
            <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-zinc-500 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={selectContentCls}>
            {(Object.keys(CAFE_DATE_LABELS) as CafeDatePreset[]).map(k => (
              <SelectItem key={k} value={k}>{CAFE_DATE_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {datePreset === 'custom' && (
          <>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="h-9 px-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-xs"
            />
            <span className="text-zinc-600 text-xs">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="h-9 px-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-xs"
            />
          </>
        )}

        <div className="flex-1" />

        <span className="text-[11px] text-zinc-500 font-quicksand">
          {rangeLabel}
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card, i) => (
          <Card key={card.label} className={`cafe-glass-card bg-gradient-to-br ${card.bg} border-white/[0.06] shadow-lg animate-slide-up`} style={{ animationDelay: `${i * 50}ms` }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-white/[0.05] flex items-center justify-center">
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className={`text-xl font-bold ${card.color} font-heading`}>
                {card.format === 'currency' ? <CurrencyDisplay amount={card.value as number} /> : card.value}
              </p>
              <p className="text-xs text-gray-500 font-quicksand mt-0.5">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <Card className="cafe-glass-card lg:col-span-2 border-white/[0.06] shadow-xl animate-slide-up" style={{ animationDelay: '300ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading text-white flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-orange-400" />
              {isSingleDay ? 'Hourly Revenue' : 'Daily Revenue'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {timeSeries.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full flex justify-center">
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-zinc-900 border border-white/[0.08] px-2 py-1 rounded text-[10px] text-white whitespace-nowrap z-10 shadow-lg">
                      <CurrencyDisplay amount={h.revenue} /> ({h.orders})
                    </div>
                    <div
                      className="w-full max-w-[24px] rounded-t-sm bg-gradient-to-t from-orange-500/80 to-orange-400/40 transition-all duration-300 hover:from-orange-500 hover:to-orange-400/60"
                      style={{ height: `${Math.max(2, (h.revenue / maxBarRevenue) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-600 font-quicksand truncate max-w-full">{h.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Type Breakdown */}
        <Card className="cafe-glass-card border-white/[0.06] shadow-xl animate-slide-up" style={{ animationDelay: '350ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading text-white flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-orange-400" /> Order Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Dine-In', value: stats.dineInOrders, total: stats.completedOrders, color: 'bg-blue-500' },
              { label: 'Takeaway', value: stats.takeawayOrders, total: stats.completedOrders, color: 'bg-orange-500' },
              { label: 'Self-Order', value: stats.selfOrders, total: stats.completedOrders, color: 'bg-purple-500' },
            ].map(item => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs font-quicksand">
                  <span className="text-gray-400">{item.label}</span>
                  <span className="text-white font-medium">{item.value}</span>
                </div>
                <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                  <div className={`h-full rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
              <div className="flex justify-between text-xs font-quicksand">
                <span className="text-gray-400">Cash</span>
                <span className="text-green-400 font-medium"><CurrencyDisplay amount={stats.cashRevenue} /></span>
              </div>
              <div className="flex justify-between text-xs font-quicksand">
                <span className="text-gray-400">UPI</span>
                <span className="text-blue-400 font-medium"><CurrencyDisplay amount={stats.upiRevenue} /></span>
              </div>
              {stats.cancelledInRange > 0 && (
                <div className="flex justify-between text-xs font-quicksand">
                  <span className="text-gray-400">Cancelled</span>
                  <span className="text-red-400 font-medium">{stats.cancelledInRange}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Split */}
        {partner && (
          <Card className="cafe-glass-card border-white/[0.06] shadow-xl animate-slide-up" style={{ animationDelay: '400ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-400" /> Revenue Split
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-white font-heading"><CurrencyDisplay amount={stats.totalRevenue} /></p>
                <p className="text-xs text-gray-500 font-quicksand">Total Revenue · {rangeTitle}</p>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-orange-500/10 rounded-lg text-center border border-orange-500/20">
                  <p className="text-lg font-bold text-orange-400"><CurrencyDisplay amount={stats.partnerShare} /></p>
                  <p className="text-xs text-gray-400 font-quicksand">Partner ({partner.partnerRate}%)</p>
                </div>
                <div className="flex-1 p-3 bg-cuephoria-purple/10 rounded-lg text-center border border-cuephoria-purple/20">
                  <p className="text-lg font-bold text-cuephoria-lightpurple"><CurrencyDisplay amount={stats.cuephoriaShare} /></p>
                  <p className="text-xs text-gray-400 font-quicksand">Cuephoria ({partner.cuephoriaRate}%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Selling Items */}
        <Card className="cafe-glass-card border-white/[0.06] shadow-xl animate-slide-up" style={{ animationDelay: '450ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading text-white flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" /> Top Items · {rangeTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <p className="text-xs text-gray-500 font-quicksand text-center py-4">No completed orders in range</p>
            ) : (
              <div className="space-y-2">
                {topItems.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        i === 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-white/[0.04] text-zinc-400'
                      }`}>{i + 1}</span>
                      <span className="text-sm text-white font-quicksand truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-orange-400">{item.qty}x</span>
                      <p className="text-xs text-gray-500"><CurrencyDisplay amount={item.revenue} /></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live / Recent Activity */}
        <Card className="cafe-glass-card border-white/[0.06] shadow-xl animate-slide-up" style={{ animationDelay: '500ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading text-white flex items-center gap-2">
              <Coffee className="h-4 w-4 text-orange-400" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              {recentActivity.length === 0 ? (
                <p className="text-xs text-gray-500 font-quicksand text-center py-4">No orders in range</p>
              ) : (
                <div className="space-y-1.5">
                  {recentActivity.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${
                          order.status === 'completed' ? 'bg-green-400'
                          : order.status === 'cancelled' ? 'bg-red-400'
                          : order.status === 'preparing' ? 'bg-orange-400 animate-pulse'
                          : 'bg-blue-400 animate-pulse'
                        }`} />
                        <div>
                          <p className="text-sm text-white font-quicksand">{order.orderNumber}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white"><CurrencyDisplay amount={order.total} /></p>
                        <p className={`text-xs capitalize ${
                          order.status === 'completed' ? 'text-green-400' : order.status === 'cancelled' ? 'text-red-400' : 'text-orange-400'
                        }`}>{order.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Settlements */}
      {settlements.length > 0 && (
        <Card className="cafe-glass-card border-white/[0.06] shadow-xl animate-slide-up" style={{ animationDelay: '550ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading text-white">Recent Settlements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {settlements.slice(0, 3).map(s => (
                <div key={s.id} className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.05]">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-medium text-white font-quicksand">{s.settlementDate}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                      s.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>{s.status}</span>
                  </div>
                  <p className="text-lg font-bold text-white"><CurrencyDisplay amount={s.netRevenue} /></p>
                  <p className="text-xs text-gray-500">{s.totalOrders} orders</p>
                  <div className="flex gap-2 mt-1.5">
                    <span className="text-xs text-orange-400 font-quicksand">Partner: <CurrencyDisplay amount={s.partnerPayout} /></span>
                    <span className="text-xs text-cuephoria-lightpurple font-quicksand">Cuephoria: <CurrencyDisplay amount={s.cuephoriaRevenue} /></span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </CafePageShell>
  );
};

export default CafeDashboard;
