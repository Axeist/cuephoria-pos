import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeOrders } from '@/hooks/cafe/useCafeOrders';
import { useCafePartner } from '@/hooks/cafe/useCafePartner';
import { useCafeSettlements } from '@/hooks/cafe/useCafeSettlements';
import { useCafeMenu } from '@/hooks/cafe/useCafeMenu';
import { CurrencyDisplay } from '@/components/ui/currency';
import {
  BarChart2, TrendingUp, DollarSign, ShoppingCart, Calendar, FileText,
  CheckCircle2, Download, Flame, Coffee, CreditCard, Banknote,
  ArrowUpRight, ArrowDownRight, Percent, UtensilsCrossed, Clock
} from 'lucide-react';
import { toast } from 'sonner';

type DateRange = 'today' | '7d' | '30d' | 'custom';

const CafeReports: React.FC = () => {
  const { user } = useCafeAuth();
  const { orders } = useCafeOrders(user?.locationId);
  const { partner } = useCafePartner(user?.locationId);
  const { settlements, generateSettlement, updateSettlementStatus } = useCafeSettlements(user?.locationId, partner?.id);
  const { categories, items } = useCafeMenu(user?.locationId);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);

  const dateFilter = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    switch (dateRange) {
      case 'today': return { start: startOfDay, end: now };
      case '7d': { const d = new Date(startOfDay); d.setDate(d.getDate() - 7); return { start: d, end: now }; }
      case '30d': { const d = new Date(startOfDay); d.setDate(d.getDate() - 30); return { start: d, end: now }; }
      case 'custom': return { start: new Date(customStart + 'T00:00:00'), end: new Date(customEnd + 'T23:59:59') };
    }
  }, [dateRange, customStart, customEnd]);

  const filteredOrders = useMemo(() =>
    orders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= dateFilter.start && d <= dateFilter.end;
    }), [orders, dateFilter]);

  const completedOrders = useMemo(() => filteredOrders.filter(o => o.status === 'completed'), [filteredOrders]);
  const cancelledOrders = useMemo(() => filteredOrders.filter(o => o.status === 'cancelled'), [filteredOrders]);

  const summary = useMemo(() => {
    const totalRevenue = completedOrders.reduce((s, o) => s + o.total, 0);
    const partnerShare = completedOrders.reduce((s, o) => s + o.partnerShare, 0);
    const cuephoriaShare = completedOrders.reduce((s, o) => s + o.cuephoriaShare, 0);
    const totalDiscount = completedOrders.reduce((s, o) => s + o.discount, 0);
    const avgOrder = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    const cashOrders = completedOrders.filter(o => o.paymentMethod === 'cash');
    const upiOrders = completedOrders.filter(o => o.paymentMethod === 'upi');
    const splitOrders = completedOrders.filter(o => o.paymentMethod === 'split');
    const cashRevenue = cashOrders.reduce((s, o) => s + o.total, 0);
    const upiRevenue = upiOrders.reduce((s, o) => s + o.total, 0);
    const selfOrders = completedOrders.filter(o => o.orderSource === 'customer');
    const dineIn = completedOrders.filter(o => o.orderType === 'dine_in');
    const takeaway = completedOrders.filter(o => o.orderType === 'takeaway');
    return {
      totalRevenue, partnerShare, cuephoriaShare, totalDiscount, avgOrder,
      totalOrders: completedOrders.length, cancelledCount: cancelledOrders.length,
      cashOrders: cashOrders.length, upiOrders: upiOrders.length, splitOrders: splitOrders.length,
      cashRevenue, upiRevenue, selfOrders: selfOrders.length,
      dineIn: dineIn.length, takeaway: takeaway.length,
    };
  }, [completedOrders, cancelledOrders]);

  // Daily revenue trend
  const dailyTrend = useMemo(() => {
    const dayMap = new Map<string, { revenue: number; orders: number }>();
    completedOrders.forEach(o => {
      const day = new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const existing = dayMap.get(day) || { revenue: 0, orders: 0 };
      existing.revenue += o.total;
      existing.orders += 1;
      dayMap.set(day, existing);
    });
    return [...dayMap.entries()].map(([day, data]) => ({ day, ...data }));
  }, [completedOrders]);
  const maxDailyRevenue = Math.max(...dailyTrend.map(d => d.revenue), 1);

  // Category-wise sales
  const categoryAnalysis = useMemo(() => {
    const catMap = new Map<string, { name: string; qty: number; revenue: number }>();
    completedOrders.forEach(o => o.items?.forEach(item => {
      const menuItem = items.find(i => i.id === item.menuItemId);
      const catId = menuItem?.categoryId || 'uncategorized';
      const catName = categories.find(c => c.id === catId)?.name || 'Other';
      const existing = catMap.get(catName) || { name: catName, qty: 0, revenue: 0 };
      existing.qty += item.quantity;
      existing.revenue += item.total;
      catMap.set(catName, existing);
    }));
    return [...catMap.values()].sort((a, b) => b.revenue - a.revenue);
  }, [completedOrders, items, categories]);
  const maxCatRevenue = Math.max(...categoryAnalysis.map(c => c.revenue), 1);

  // Item-wise sales
  const itemAnalysis = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    completedOrders.forEach(o => o.items?.forEach(item => {
      const existing = map.get(item.itemName) || { name: item.itemName, qty: 0, revenue: 0 };
      existing.qty += item.quantity;
      existing.revenue += item.total;
      map.set(item.itemName, existing);
    }));
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 15);
  }, [completedOrders]);

  const handleExport = useCallback(() => {
    const header = 'Order Number,Date,Time,Type,Source,Customer,Items,Subtotal,Discount,Total,Payment,Partner Share,Cuephoria Share,Status';
    const rows = filteredOrders.map(o => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleDateString('en-IN'),
      new Date(o.createdAt).toLocaleTimeString('en-IN'),
      o.orderType, o.orderSource, o.customerName || '',
      o.items?.map(i => `${i.quantity}x ${i.itemName}`).join(' | ') || '',
      o.subtotal, o.discount, o.total, o.paymentMethod,
      o.partnerShare, o.cuephoriaShare, o.status,
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `cafe_report_${dateRange}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  }, [filteredOrders, dateRange]);

  const handleGenerateSettlement = async () => {
    if (!partner) return;
    const result = await generateSettlement(settlementDate, partner.id);
    if (result) toast.success(`Settlement generated for ${settlementDate}`);
    else toast.error('Failed to generate settlement');
  };

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-5 overflow-x-hidden">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text font-heading animate-slide-down">Reports</h1>
        <Button size="sm" onClick={handleExport} className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-0">
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Date Range Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {(['today', '7d', '30d', 'custom'] as DateRange[]).map(r => (
          <button key={r} onClick={() => setDateRange(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-quicksand transition-all ${
              dateRange === r ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'bg-gray-800/50 text-gray-400 border border-gray-700/30'
            }`}>
            {r === 'today' ? 'Today' : r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'Custom'}
          </button>
        ))}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="h-8 px-2 rounded-md bg-gray-800/50 border border-gray-700 text-white text-xs" />
            <span className="text-gray-500 text-xs">to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="h-8 px-2 rounded-md bg-gray-800/50 border border-gray-700 text-white text-xs" />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Revenue', value: summary.totalRevenue, icon: DollarSign, color: 'text-green-400', type: 'currency' },
          { label: 'Orders', value: summary.totalOrders, icon: ShoppingCart, color: 'text-blue-400', type: 'number' },
          { label: 'Avg Order', value: summary.avgOrder, icon: TrendingUp, color: 'text-orange-400', type: 'currency' },
          { label: 'Discounts', value: summary.totalDiscount, icon: Percent, color: 'text-yellow-400', type: 'currency' },
          { label: 'Cancelled', value: summary.cancelledCount, icon: Clock, color: 'text-red-400', type: 'number' },
          { label: 'Self-Orders', value: summary.selfOrders, icon: Coffee, color: 'text-purple-400', type: 'number' },
        ].map((stat, i) => (
          <Card key={stat.label} className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/30 animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
            <CardContent className="p-3">
              <stat.icon className={`h-4 w-4 ${stat.color} mb-1.5`} />
              <p className={`text-lg font-bold ${stat.color} font-heading`}>
                {stat.type === 'currency' ? <CurrencyDisplay amount={stat.value as number} /> : stat.value}
              </p>
              <p className="text-[10px] text-gray-500 font-quicksand">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        {dailyTrend.length > 1 && (
          <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 animate-slide-up">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-heading text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-400" /> Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-36">
                {dailyTrend.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
                    <div className="relative w-full flex justify-center">
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-gray-800 px-2 py-1 rounded text-[9px] text-white whitespace-nowrap z-10 shadow-lg">
                        <CurrencyDisplay amount={d.revenue} /> ({d.orders})
                      </div>
                      <div className="w-full max-w-[32px] rounded-t-sm bg-gradient-to-t from-orange-500/80 to-orange-400/40 hover:from-orange-500 hover:to-orange-400/60 transition-all"
                        style={{ height: `${Math.max(4, (d.revenue / maxDailyRevenue) * 100)}%` }} />
                    </div>
                    <span className="text-[7px] text-gray-600 font-quicksand truncate w-full text-center">{d.day}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Methods */}
        <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-orange-400" /> Payment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-green-500/5 rounded-lg text-center border border-green-500/10">
                <Banknote className="h-5 w-5 text-green-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-400 font-heading">{summary.cashOrders}</p>
                <p className="text-[10px] text-gray-500">Cash</p>
                <p className="text-xs text-green-400 mt-0.5"><CurrencyDisplay amount={summary.cashRevenue} /></p>
              </div>
              <div className="p-3 bg-blue-500/5 rounded-lg text-center border border-blue-500/10">
                <CreditCard className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-400 font-heading">{summary.upiOrders}</p>
                <p className="text-[10px] text-gray-500">UPI</p>
                <p className="text-xs text-blue-400 mt-0.5"><CurrencyDisplay amount={summary.upiRevenue} /></p>
              </div>
              <div className="p-3 bg-purple-500/5 rounded-lg text-center border border-purple-500/10">
                <UtensilsCrossed className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-purple-400 font-heading">{summary.splitOrders}</p>
                <p className="text-[10px] text-gray-500">Split</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-quicksand">
                <span className="text-gray-400">Dine-In</span><span className="text-white">{summary.dineIn} orders</span>
              </div>
              <div className="flex justify-between text-xs font-quicksand">
                <span className="text-gray-400">Takeaway</span><span className="text-white">{summary.takeaway} orders</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Analysis */}
        <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading text-white flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-orange-400" /> Category Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryAnalysis.length === 0 ? (
              <p className="text-xs text-gray-500 font-quicksand text-center py-6">No data available</p>
            ) : (
              <div className="space-y-2">
                {categoryAnalysis.map(cat => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-quicksand">
                      <span className="text-white">{cat.name}</span>
                      <span className="text-orange-400"><CurrencyDisplay amount={cat.revenue} /> ({cat.qty} items)</span>
                    </div>
                    <div className="w-full bg-gray-700/20 rounded-full h-2">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-cuephoria-purple transition-all duration-500"
                        style={{ width: `${(cat.revenue / maxCatRevenue) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Items */}
        <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading text-white flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" /> Top Selling Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {itemAnalysis.length === 0 ? (
                <p className="text-xs text-gray-500 font-quicksand text-center py-6">No data available</p>
              ) : (
                <div className="space-y-1.5">
                  {itemAnalysis.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between p-2 bg-gray-800/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          i < 3 ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-700/50 text-gray-500'
                        }`}>{i + 1}</span>
                        <span className="text-xs text-white font-quicksand">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{item.qty} sold</span>
                        <span className="text-xs font-bold text-orange-400 min-w-[60px] text-right"><CurrencyDisplay amount={item.revenue} /></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Split + Settlement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {partner && (
          <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 animate-slide-up">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-heading text-white flex items-center gap-2">
                <Percent className="h-4 w-4 text-orange-400" /> Revenue Split
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 p-4 bg-orange-500/5 rounded-xl border border-orange-500/10 text-center">
                  <p className="text-xl font-bold text-orange-400 font-heading"><CurrencyDisplay amount={summary.partnerShare} /></p>
                  <p className="text-xs text-gray-400 font-quicksand">Partner ({partner.partnerRate}%)</p>
                </div>
                <div className="flex-1 p-4 bg-cuephoria-purple/5 rounded-xl border border-cuephoria-purple/10 text-center">
                  <p className="text-xl font-bold text-cuephoria-lightpurple font-heading"><CurrencyDisplay amount={summary.cuephoriaShare} /></p>
                  <p className="text-xs text-gray-400 font-quicksand">Cuephoria ({partner.cuephoriaRate}%)</p>
                </div>
              </div>
              <div className="w-full bg-gray-700/20 rounded-full h-4 overflow-hidden flex">
                <div className="h-full bg-orange-500 transition-all" style={{ width: `${partner.partnerRate}%` }} />
                <div className="h-full bg-cuephoria-purple transition-all" style={{ width: `${partner.cuephoriaRate}%` }} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settlements */}
        <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-heading text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-400" /> Settlements
            </CardTitle>
            <div className="flex items-center gap-2">
              <input type="date" value={settlementDate} onChange={e => setSettlementDate(e.target.value)}
                className="h-7 px-2 rounded-md bg-gray-800/50 border border-gray-700 text-white text-[10px]" />
              <Button size="sm" onClick={handleGenerateSettlement}
                className="h-7 text-[10px] bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-0">
                Generate
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-44">
              {settlements.length === 0 ? (
                <p className="text-xs text-gray-500 font-quicksand text-center py-6">No settlements yet</p>
              ) : (
                <div className="space-y-2">
                  {settlements.map(s => (
                    <div key={s.id} className="p-3 bg-gray-800/20 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-white font-quicksand">{s.settlementDate}</p>
                        <p className="text-[10px] text-gray-500">{s.totalOrders} orders &middot; <CurrencyDisplay amount={s.netRevenue} /></p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          s.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                          s.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>{s.status}</span>
                        {s.status === 'draft' && (
                          <Button size="sm" onClick={() => updateSettlementStatus(s.id, 'confirmed')}
                            className="h-6 text-[10px] bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-0 px-2">
                            <CheckCircle2 className="h-3 w-3 mr-0.5" /> Confirm
                          </Button>
                        )}
                        {s.status === 'confirmed' && (
                          <Button size="sm" onClick={() => updateSettlementStatus(s.id, 'paid')}
                            className="h-6 text-[10px] bg-green-500/20 text-green-400 hover:bg-green-500/30 border-0 px-2">
                            <CheckCircle2 className="h-3 w-3 mr-0.5" /> Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CafeReports;
