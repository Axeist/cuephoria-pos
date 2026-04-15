import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeOrders } from '@/hooks/cafe/useCafeOrders';
import { useCafePartner } from '@/hooks/cafe/useCafePartner';
import { useCafeSettlements } from '@/hooks/cafe/useCafeSettlements';
import { useCafeMenu } from '@/hooks/cafe/useCafeMenu';
import { CurrencyDisplay } from '@/components/ui/currency';
import {
  BarChart2, TrendingUp, DollarSign, ShoppingCart, Calendar, FileText,
  CheckCircle2, Download, Flame, Coffee, CreditCard, Banknote,
  Percent, UtensilsCrossed, Clock, Package, AlertTriangle, SlidersHorizontal, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CafePageShell } from '@/components/cafe/CafePageShell';
import type { CafeInventoryMovementRow, CafeOrderType, CafePaymentMethod, CafeOrderSource } from '@/types/cafe.types';

type DateRange = 'today' | '7d' | '30d' | 'custom';

const LOW_STOCK_THRESHOLD = 5;

const CafeReports: React.FC = () => {
  const { user } = useCafeAuth();
  const { orders } = useCafeOrders(user?.locationId);
  const { partner } = useCafePartner(user?.locationId);
  const { settlements, generateSettlement, updateSettlementStatus } = useCafeSettlements(user?.locationId, partner?.id);
  const { categories, items } = useCafeMenu(user?.locationId);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
  const [filterOrderType, setFilterOrderType] = useState<'all' | CafeOrderType>('all');
  const [filterPayment, setFilterPayment] = useState<'all' | CafePaymentMethod>('all');
  const [filterSource, setFilterSource] = useState<'all' | CafeOrderSource>('all');
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [inventoryMovements, setInventoryMovements] = useState<CafeInventoryMovementRow[]>([]);

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

  useEffect(() => {
    if (!user?.locationId) return;
    let cancelled = false;
    (async () => {
      const startIso = dateFilter.start.toISOString();
      const endIso = dateFilter.end.toISOString();
      const { data, error } = await supabase
        .from('cafe_inventory_movements')
        .select('*')
        .eq('location_id', user.locationId)
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (!error && data) setInventoryMovements(data as CafeInventoryMovementRow[]);
      else setInventoryMovements([]);
    })();
    return () => { cancelled = true; };
  }, [user?.locationId, dateFilter.start, dateFilter.end]);

  const inventorySummary = useMemo(() => {
    const trackedItems = items.filter(i => categories.find(c => c.id === i.categoryId)?.tracksInventory);
    const totalUnits = trackedItems.reduce((s, i) => s + i.stockQuantity, 0);
    const lowStockCount = trackedItems.filter(i => i.stockQuantity <= LOW_STOCK_THRESHOLD).length;
    const trackedSkus = trackedItems.length;
    const movementNet = inventoryMovements.reduce((s, m) => s + m.quantity_delta, 0);
    return { totalUnits, lowStockCount, trackedSkus, movementNet };
  }, [items, categories, inventoryMovements]);

  const ordersInDateRange = useMemo(() =>
    orders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= dateFilter.start && d <= dateFilter.end;
    }), [orders, dateFilter]);

  const filteredOrders = useMemo(() => {
    let list = ordersInDateRange;
    if (filterOrderType !== 'all') list = list.filter(o => o.orderType === filterOrderType);
    if (filterPayment !== 'all') list = list.filter(o => o.paymentMethod === filterPayment);
    if (filterSource !== 'all') list = list.filter(o => o.orderSource === filterSource);
    return list;
  }, [ordersInDateRange, filterOrderType, filterPayment, filterSource]);

  const completedOrders = useMemo(() => filteredOrders.filter(o => o.status !== 'cancelled'), [filteredOrders]);
  const paidOrders = useMemo(() => filteredOrders.filter(o => o.status === 'completed'), [filteredOrders]);
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
    const pendingPayOrders = completedOrders.filter(o => o.paymentMethod === 'pending');
    const cashRevenue = cashOrders.reduce((s, o) => s + o.total, 0);
    const upiRevenue = upiOrders.reduce((s, o) => s + o.total, 0);
    const pendingPayRevenue = pendingPayOrders.reduce((s, o) => s + o.total, 0);
    const selfOrders = completedOrders.filter(o => o.orderSource === 'customer');
    const dineIn = completedOrders.filter(o => o.orderType === 'dine_in');
    const takeaway = completedOrders.filter(o => o.orderType === 'takeaway');
    return {
      totalRevenue, partnerShare, cuephoriaShare, totalDiscount, avgOrder,
      totalOrders: completedOrders.length, cancelledCount: cancelledOrders.length,
      cashOrders: cashOrders.length, upiOrders: upiOrders.length, splitOrders: splitOrders.length,
      pendingPayOrders: pendingPayOrders.length, pendingPayRevenue,
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

  const activeFilterCount =
    (filterOrderType !== 'all' ? 1 : 0) +
    (filterPayment !== 'all' ? 1 : 0) +
    (filterSource !== 'all' ? 1 : 0);

  return (
    <CafePageShell
      eyebrow="Analytics"
      title="Reports"
      description="Slice revenue, payments, inventory, and settlements for any period."
      action={
        <Button size="sm" onClick={handleExport} className="border border-orange-500/30 bg-orange-500/15 text-orange-200 hover:bg-orange-500/25">
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      }
      contentClassName="space-y-5 overflow-x-hidden"
    >
      {/* Period + advanced filters (dropdowns, like main POS) */}
      <div className="cafe-glass-card border-white/[0.06] p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3 flex-wrap">
          <div className="space-y-1.5 min-w-[200px] flex-1 max-w-xs">
            <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-quicksand flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-orange-400" /> Date range
            </Label>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="h-10 bg-gray-950/80 border-gray-700/80 text-white font-quicksand">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent className="bg-gray-950 border-gray-700">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="custom">Custom range…</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {dateRange === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="h-10 px-3 rounded-lg bg-gray-950/80 border border-gray-700/80 text-white text-xs font-quicksand" />
              <span className="text-gray-500 text-xs">to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="h-10 px-3 rounded-lg bg-gray-950/80 border border-gray-700/80 text-white text-xs font-quicksand" />
            </div>
          )}
          <Collapsible open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen} className="w-full lg:w-auto lg:ml-auto">
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" size="sm"
                className="border-gray-600/80 bg-white/[0.04] text-gray-200 hover:bg-white/[0.08] font-quicksand gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-orange-400" />
                Advanced filters
                {activeFilterCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/25 text-orange-300">{activeFilterCount}</span>
                )}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedFiltersOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out">
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-white/[0.06] bg-black/25">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-quicksand">Order type</Label>
                  <Select value={filterOrderType} onValueChange={(v) => setFilterOrderType(v as 'all' | CafeOrderType)}>
                    <SelectTrigger className="h-9 bg-gray-950/80 border-gray-700/80 text-white text-xs font-quicksand">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-950 border-gray-700">
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="dine_in">Dine in</SelectItem>
                      <SelectItem value="takeaway">Takeaway</SelectItem>
                      <SelectItem value="delivery_to_station">To station</SelectItem>
                      <SelectItem value="self_order">Self-order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-quicksand">Payment</Label>
                  <Select value={filterPayment} onValueChange={(v) => setFilterPayment(v as 'all' | CafePaymentMethod)}>
                    <SelectTrigger className="h-9 bg-gray-950/80 border-gray-700/80 text-white text-xs font-quicksand">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-950 border-gray-700">
                      <SelectItem value="all">All methods</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="split">Split</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="complimentary">Complimentary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-quicksand">Source</Label>
                  <Select value={filterSource} onValueChange={(v) => setFilterSource(v as 'all' | CafeOrderSource)}>
                    <SelectTrigger className="h-9 bg-gray-950/80 border-gray-700/80 text-white text-xs font-quicksand">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-950 border-gray-700">
                      <SelectItem value="all">All sources</SelectItem>
                      <SelectItem value="pos">POS</SelectItem>
                      <SelectItem value="customer">Customer app</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {activeFilterCount > 0 && (
                  <div className="sm:col-span-3 flex justify-end">
                    <Button type="button" variant="ghost" size="sm" className="text-xs text-gray-400 h-8"
                      onClick={() => { setFilterOrderType('all'); setFilterPayment('all'); setFilterSource('all'); }}>
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
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
          <Card key={stat.label} className="cafe-glass-card border-white/[0.06] animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
            <CardContent className="p-3">
              <stat.icon className={`h-4 w-4 ${stat.color} mb-1.5`} />
              <p className={`text-lg font-bold ${stat.color} font-heading`}>
                {stat.type === 'currency' ? <CurrencyDisplay amount={stat.value as number} /> : stat.value}
              </p>
              <p className="text-xs text-gray-500 font-quicksand">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {inventorySummary.trackedSkus > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Stock on hand (units)', value: inventorySummary.totalUnits, icon: Package, color: 'text-cyan-400', type: 'number' as const },
            { label: 'Tracked SKUs', value: inventorySummary.trackedSkus, icon: UtensilsCrossed, color: 'text-slate-300', type: 'number' as const },
            { label: `Low stock (≤${LOW_STOCK_THRESHOLD})`, value: inventorySummary.lowStockCount, icon: AlertTriangle, color: 'text-amber-400', type: 'number' as const },
            { label: 'Net movement (period)', value: inventorySummary.movementNet, icon: BarChart2, color: inventorySummary.movementNet >= 0 ? 'text-emerald-400' : 'text-rose-400', type: 'number' as const },
          ].map((stat, i) => (
            <Card key={stat.label} className="cafe-glass-card border-white/[0.06] animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
              <CardContent className="p-3">
                <stat.icon className={`h-4 w-4 ${stat.color} mb-1.5`} />
                <p className={`text-lg font-bold ${stat.color} font-heading tabular-nums`}>{stat.value}</p>
                <p className="text-xs text-gray-500 font-quicksand">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {inventorySummary.trackedSkus > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="cafe-glass-card border-white/[0.06] animate-slide-up">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-cyan-400" /> Current stock (tracked items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-56">
                <div className="space-y-1.5 pr-2">
                  {items
                    .filter(i => categories.find(c => c.id === i.categoryId)?.tracksInventory)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(i => {
                      const catName = categories.find(c => c.id === i.categoryId)?.name ?? '—';
                      const low = i.stockQuantity <= LOW_STOCK_THRESHOLD;
                      return (
                        <div key={i.id} className={`flex items-center justify-between p-2 rounded-lg text-sm font-quicksand ${low ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-gray-800/20'}`}>
                          <div className="min-w-0">
                            <p className="text-white truncate">{i.name}</p>
                            <p className="text-[10px] text-gray-500">{catName}</p>
                          </div>
                          <span className={`tabular-nums font-semibold shrink-0 ${low ? 'text-amber-400' : 'text-cyan-400'}`}>{i.stockQuantity}</span>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="cafe-glass-card border-white/[0.06] animate-slide-up">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading text-white flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-orange-400" /> Inventory activity (period)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-56">
                {inventoryMovements.length === 0 ? (
                  <p className="text-xs text-gray-500 font-quicksand text-center py-8">No stock movements in this range</p>
                ) : (
                  <div className="space-y-1.5 pr-2">
                    {inventoryMovements.map(m => {
                      const itemName = items.find(i => i.id === m.menu_item_id)?.name ?? 'Item';
                      const label =
                        m.movement_type === 'sale' ? 'Sale' :
                        m.movement_type === 'adjustment_add' ? 'Add' : 'Reduce';
                      return (
                        <div key={m.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-800/20 text-xs font-quicksand">
                          <div className="min-w-0">
                            <p className="text-white truncate">{itemName}</p>
                            <p className="text-[10px] text-gray-500">
                              {label} · {new Date(m.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                          </div>
                          <span className={`tabular-nums font-semibold shrink-0 ${m.quantity_delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {m.quantity_delta >= 0 ? '+' : ''}{m.quantity_delta}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        {dailyTrend.length > 1 && (
          <Card className="cafe-glass-card border-white/[0.06] animate-slide-up">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-400" /> Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-36">
                {dailyTrend.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
                    <div className="relative w-full flex justify-center">
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-gray-800 px-2 py-1 rounded text-[10px] text-white whitespace-nowrap z-10 shadow-lg">
                        <CurrencyDisplay amount={d.revenue} /> ({d.orders})
                      </div>
                      <div className="w-full max-w-[32px] rounded-t-sm bg-gradient-to-t from-orange-500/80 to-orange-400/40 hover:from-orange-500 hover:to-orange-400/60 transition-all"
                        style={{ height: `${Math.max(4, (d.revenue / maxDailyRevenue) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-600 font-quicksand truncate w-full text-center">{d.day}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Methods */}
        <Card className="cafe-glass-card border-white/[0.06] animate-slide-up">
          <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-orange-400" /> Payment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-green-500/5 rounded-lg text-center border border-green-500/10">
                <Banknote className="h-5 w-5 text-green-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-400 font-heading">{summary.cashOrders}</p>
                <p className="text-xs text-gray-500">Cash</p>
                <p className="text-xs text-green-400 mt-0.5"><CurrencyDisplay amount={summary.cashRevenue} /></p>
              </div>
              <div className="p-3 bg-blue-500/5 rounded-lg text-center border border-blue-500/10">
                <CreditCard className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-400 font-heading">{summary.upiOrders}</p>
                <p className="text-xs text-gray-500">UPI</p>
                <p className="text-xs text-blue-400 mt-0.5"><CurrencyDisplay amount={summary.upiRevenue} /></p>
              </div>
              <div className="p-3 bg-purple-500/5 rounded-lg text-center border border-purple-500/10">
                <UtensilsCrossed className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-purple-400 font-heading">{summary.splitOrders}</p>
                <p className="text-xs text-gray-500">Split</p>
              </div>
              {summary.pendingPayOrders > 0 && (
                <div className="p-3 bg-amber-500/5 rounded-lg text-center border border-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-amber-400 font-heading">{summary.pendingPayOrders}</p>
                  <p className="text-xs text-gray-500">Unpaid</p>
                  <p className="text-xs text-amber-400 mt-0.5"><CurrencyDisplay amount={summary.pendingPayRevenue} /></p>
                </div>
              )}
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
        <Card className="cafe-glass-card border-white/[0.06] animate-slide-up">
          <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading text-white flex items-center gap-2">
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
        <Card className="cafe-glass-card border-white/[0.06] animate-slide-up">
          <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading text-white flex items-center gap-2">
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
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i < 3 ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-700/50 text-gray-500'
                        }`}>{i + 1}</span>
                        <span className="text-sm text-white font-quicksand">{item.name}</span>
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
          <Card className="cafe-glass-card border-white/[0.06] animate-slide-up">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading text-white flex items-center gap-2">
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
        <Card className="cafe-glass-card border-white/[0.06] animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-heading text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-400" /> Settlements
            </CardTitle>
            <div className="flex items-center gap-2">
              <input type="date" value={settlementDate} onChange={e => setSettlementDate(e.target.value)}
                className="h-8 px-2 rounded-md bg-gray-800/50 border border-gray-700 text-white text-xs" />
              <Button size="sm" onClick={handleGenerateSettlement}
                className="h-8 text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-0">
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
                    <div key={s.id} className="p-3 bg-gray-800/20 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-white font-quicksand">{s.settlementDate}</p>
                          <p className="text-xs text-gray-500">{s.totalOrders} orders &middot; Total: <CurrencyDisplay amount={s.netRevenue} /></p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            s.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                            s.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>{s.status}</span>
                          {s.status === 'draft' && (
                            <Button size="sm" onClick={() => updateSettlementStatus(s.id, 'confirmed')}
                              className="h-7 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-0 px-2">
                              <CheckCircle2 className="h-3 w-3 mr-0.5" /> Confirm
                            </Button>
                          )}
                          {s.status === 'confirmed' && (
                            <Button size="sm" onClick={() => updateSettlementStatus(s.id, 'paid')}
                              className="h-7 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 border-0 px-2">
                              <CheckCircle2 className="h-3 w-3 mr-0.5" /> Mark Paid
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 px-2 py-1 rounded bg-orange-500/5 border border-orange-500/10">
                          <p className="text-xs text-gray-500 font-quicksand">Partner (70%)</p>
                          <p className="text-sm font-bold text-orange-400"><CurrencyDisplay amount={s.partnerPayout} /></p>
                        </div>
                        <div className="flex-1 px-2 py-1 rounded bg-purple-500/5 border border-purple-500/10">
                          <p className="text-xs text-gray-500 font-quicksand">Cuephoria (30%)</p>
                          <p className="text-sm font-bold text-cuephoria-lightpurple"><CurrencyDisplay amount={s.cuephoriaRevenue} /></p>
                        </div>
                      </div>
                      {s.totalDiscount > 0 && (
                        <p className="text-xs text-green-400 font-quicksand">Discounts: <CurrencyDisplay amount={s.totalDiscount} /></p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </CafePageShell>
  );
};

export default CafeReports;
