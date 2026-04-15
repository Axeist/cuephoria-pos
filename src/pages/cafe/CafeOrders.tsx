import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeOrders } from '@/hooks/cafe/useCafeOrders';
import { CurrencyDisplay } from '@/components/ui/currency';
import type { CafeOrderStatus, CafeOrderItem, CafePaymentMethod } from '@/types/cafe.types';
import {
  ClipboardList, Search, Clock, CheckCircle2, XCircle, Eye, Banknote,
  CreditCard, SplitSquareHorizontal, Download, Printer, CookingPot,
  ShoppingCart, Coffee, UtensilsCrossed, AlertCircle, Pencil, Trash2,
  TrendingUp, Hash, Package, IndianRupee, Wallet, CalendarDays, Filter,
  Users, ReceiptText, ArrowUpDown, Gift
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CafePageShell } from '@/components/cafe/CafePageShell';

const STATUS_CFG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  pending:   { dot: 'bg-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/25', text: 'text-yellow-300', label: 'Pending' },
  confirmed: { dot: 'bg-blue-400',   bg: 'bg-blue-500/15 border-blue-500/25',   text: 'text-blue-300',   label: 'Confirmed' },
  preparing: { dot: 'bg-orange-400', bg: 'bg-orange-500/15 border-orange-500/25', text: 'text-orange-300', label: 'Preparing' },
  ready:     { dot: 'bg-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/25', text: 'text-emerald-300', label: 'Ready' },
  served:    { dot: 'bg-violet-400', bg: 'bg-violet-500/15 border-violet-500/25', text: 'text-violet-300', label: 'Served' },
  completed: { dot: 'bg-zinc-400',   bg: 'bg-zinc-500/15 border-zinc-500/25',   text: 'text-zinc-400',   label: 'Done' },
  cancelled: { dot: 'bg-red-400',    bg: 'bg-red-500/15 border-red-500/25',     text: 'text-red-400',    label: 'Cancelled' },
};

const statusTimeline: { key: CafeOrderStatus; label: string; icon: React.ElementType }[] = [
  { key: 'pending', label: 'Placed', icon: ShoppingCart },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'preparing', label: 'Preparing', icon: CookingPot },
  { key: 'ready', label: 'Ready', icon: Coffee },
  { key: 'served', label: 'Served', icon: UtensilsCrossed },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'last_year' | 'all_time' | 'custom';

const DATE_LABELS: Record<DatePreset, string> = {
  today: 'Today', yesterday: 'Yesterday', this_week: 'This week', this_month: 'This month',
  last_month: 'Last month', last_3_months: 'Last 3 months', this_year: 'This year',
  last_year: 'Last year', all_time: 'All time', custom: 'Custom range',
};

function getDateRange(preset: DatePreset, customStart: string, customEnd: string) {
  const now = new Date();
  const sod = new Date(now); sod.setHours(0, 0, 0, 0);
  switch (preset) {
    case 'today': return { start: sod, end: now };
    case 'yesterday': { const y = new Date(sod); y.setDate(y.getDate() - 1); const ye = new Date(sod); ye.setMilliseconds(-1); return { start: y, end: ye }; }
    case 'this_week': { const d = new Date(sod); d.setDate(d.getDate() - d.getDay()); return { start: d, end: now }; }
    case 'this_month': { const d = new Date(sod); d.setDate(1); return { start: d, end: now }; }
    case 'last_month': { const s = new Date(sod); s.setMonth(s.getMonth() - 1); s.setDate(1); const e = new Date(sod); e.setDate(0); e.setHours(23, 59, 59, 999); return { start: s, end: e }; }
    case 'last_3_months': { const d = new Date(sod); d.setMonth(d.getMonth() - 3); return { start: d, end: now }; }
    case 'this_year': { const d = new Date(sod.getFullYear(), 0, 1); return { start: d, end: now }; }
    case 'last_year': { const s = new Date(sod.getFullYear() - 1, 0, 1); const e = new Date(sod.getFullYear() - 1, 11, 31, 23, 59, 59, 999); return { start: s, end: e }; }
    case 'all_time': return { start: new Date(0), end: now };
    case 'custom': return { start: new Date(customStart + 'T00:00:00'), end: new Date(customEnd + 'T23:59:59') };
  }
}

const CafeOrders: React.FC = () => {
  const { user } = useCafeAuth();
  const { orders, fetchOrderItems, updateOrderStatus, cancelOrder, deleteOrder, updateOrderDetails } = useCafeOrders(user?.locationId);

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | CafeOrderStatus>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | CafePaymentMethod>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'dine_in' | 'takeaway' | 'to_station'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'pos' | 'customer'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Dialogs
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailItems, setDetailItems] = useState<CafeOrderItem[]>([]);
  const [paymentDialog, setPaymentDialog] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<CafePaymentMethod>('cash');
  const [editDialog, setEditDialog] = useState<string | null>(null);
  const [editDiscount, setEditDiscount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);

  const dateRange = useMemo(() => getDateRange(datePreset, customStart, customEnd), [datePreset, customStart, customEnd]);

  const filteredOrders = useMemo(() => {
    let result = orders
      .filter(o => { const d = new Date(o.createdAt); return d >= dateRange.start && d <= dateRange.end; })
      .filter(o => {
        if (statusFilter === 'active') return !['completed', 'cancelled'].includes(o.status);
        if (statusFilter !== 'all') return o.status === statusFilter;
        return true;
      })
      .filter(o => paymentFilter === 'all' || o.paymentMethod === paymentFilter)
      .filter(o => orderTypeFilter === 'all' || o.orderType === orderTypeFilter)
      .filter(o => sourceFilter === 'all' || o.orderSource === sourceFilter)
      .filter(o => {
        if (!search) return true;
        const q = search.toLowerCase();
        return o.orderNumber.toLowerCase().includes(q) || o.customerName?.toLowerCase().includes(q) || o.customerPhone?.includes(q);
      });

    switch (sortBy) {
      case 'oldest': result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case 'highest': result.sort((a, b) => b.total - a.total); break;
      case 'lowest': result.sort((a, b) => a.total - b.total); break;
      default: result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  }, [orders, dateRange, statusFilter, paymentFilter, orderTypeFilter, sourceFilter, search, sortBy]);

  // KPI stats
  const stats = useMemo(() => {
    const nonCancelled = filteredOrders.filter(o => o.status !== 'cancelled');
    const revenue = nonCancelled.reduce((s, o) => s + o.total, 0);
    const cashRev = nonCancelled.filter(o => o.paymentMethod === 'cash').reduce((s, o) => s + o.total, 0);
    const upiRev = nonCancelled.filter(o => o.paymentMethod === 'upi').reduce((s, o) => s + o.total, 0);
    const splitRev = nonCancelled.filter(o => o.paymentMethod === 'split').reduce((s, o) => s + o.total, 0);
    const pendingPay = filteredOrders.filter(o => o.paymentMethod === 'pending' && !['cancelled', 'completed'].includes(o.status));
    const compRev = nonCancelled.filter(o => o.paymentMethod === 'complimentary').reduce((s, o) => s + o.total, 0);
    const avgVal = nonCancelled.length > 0 ? revenue / nonCancelled.length : 0;
    const dineIn = nonCancelled.filter(o => o.orderType === 'dine_in').length;
    const takeaway = nonCancelled.filter(o => o.orderType === 'takeaway').length;
    const selfOrder = nonCancelled.filter(o => o.orderSource === 'customer').length;
    const partnerShare = nonCancelled.reduce((s, o) => s + o.partnerShare, 0);
    const cuephoriaShare = nonCancelled.reduce((s, o) => s + o.cuephoriaShare, 0);
    return {
      total: filteredOrders.length, active: filteredOrders.filter(o => !['completed', 'cancelled'].includes(o.status)).length,
      completed: filteredOrders.filter(o => o.status === 'completed').length,
      cancelled: filteredOrders.filter(o => o.status === 'cancelled').length,
      revenue, cashRev, upiRev, splitRev, compRev, avgVal,
      pendingPayCount: pendingPay.length, pendingPayTotal: pendingPay.reduce((s, o) => s + o.total, 0),
      dineIn, takeaway, selfOrder, partnerShare, cuephoriaShare,
    };
  }, [filteredOrders]);

  const handleViewDetails = async (orderId: string) => { setDetailOrderId(orderId); setDetailItems(await fetchOrderItems(orderId)); };

  const handleCompleteOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order?.paymentMethod === 'pending') setPaymentDialog(orderId);
    else { updateOrderStatus(orderId, 'completed'); toast.success('Order completed'); }
  };

  const handlePayAndComplete = async (completeOrder = true) => {
    if (!paymentDialog) return;
    const order = orders.find(o => o.id === paymentDialog);
    if (!order) return;
    await updateOrderStatus(paymentDialog, completeOrder ? 'completed' : order.status, selectedPayment);
    if (order.customerId && order.total > 0 && order.paymentMethod === 'pending') {
      const { supabase } = await import('@/integrations/supabase/client');
      try { await supabase.rpc('increment_customer_total_spent', { p_customer_id: order.customerId, p_amount: order.total }); } catch {}
    }
    setPaymentDialog(null);
    toast.success(completeOrder ? 'Payment settled & completed' : 'Payment settled');
  };

  const handleEditOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    setEditDiscount(String(order.discount || 0)); setEditNotes(order.notes || ''); setEditDialog(orderId);
  };

  const handleSaveEdit = async () => {
    if (!editDialog) return;
    const ok = await updateOrderDetails(editDialog, { discount: Number(editDiscount) || 0, notes: editNotes });
    if (ok) { toast.success('Order updated'); setEditDialog(null); } else toast.error('Failed to update');
  };

  const handleDeleteOrder = async () => {
    if (!deleteDialog) return;
    const ok = await deleteOrder(deleteDialog);
    if (ok) { toast.success('Order deleted'); setDeleteDialog(null); } else toast.error('Failed to delete');
  };

  const handleExport = useCallback(() => {
    const header = 'Order Number,Date,Time,Type,Source,Customer,Phone,Subtotal,Discount,Total,Payment,Status';
    const rows = filteredOrders.map(o => [o.orderNumber, new Date(o.createdAt).toLocaleDateString('en-IN'), new Date(o.createdAt).toLocaleTimeString('en-IN'), o.orderType, o.orderSource, o.customerName || '', o.customerPhone || '', o.subtotal, o.discount, o.total, o.paymentMethod, o.status].join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `cafe_orders_${datePreset}.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success('Exported');
  }, [filteredOrders, datePreset]);

  const handlePrintOrder = useCallback((orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const pw = window.open('', '_blank', 'width=300,height=500');
    if (!pw) return;
    pw.document.write(`<html><head><title>Order</title><style>body{font-family:monospace;font-size:12px;padding:8px;max-width:280px;margin:0 auto}.center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:6px 0}.row{display:flex;justify-content:space-between}</style></head><body><div class="center bold" style="font-size:16px">CUEPHORIA CAFE</div><div class="center">${order.orderNumber}</div><div class="center">${new Date(order.createdAt).toLocaleString('en-IN')}</div>${order.customerName ? `<div class="center">${order.customerName}${order.customerPhone ? ' · ' + order.customerPhone : ''}</div>` : ''}<div class="line"></div><div class="row bold"><span>Total</span><span>₹${order.total.toFixed(2)}</span></div><div class="row"><span>Payment</span><span>${order.paymentMethod}</span></div><div class="line"></div><div class="center" style="margin-top:8px;font-size:10px">Thank you!</div><script>setTimeout(()=>{window.print();window.close()},300)</script></body></html>`);
    pw.document.close();
  }, [orders]);

  const detailOrder = orders.find(o => o.id === detailOrderId);
  const detailStatusIndex = detailOrder ? statusTimeline.findIndex(s => s.key === detailOrder.status) : -1;
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const selectCls = "bg-white/[0.03] border-white/[0.06] text-white text-xs font-quicksand h-9 rounded-lg [&>span]:truncate";
  const selectContentCls = "bg-zinc-900/98 border-white/[0.08] backdrop-blur-xl";

  return (
    <CafePageShell eyebrow="Operations" title="Orders" description={`${stats.total} orders · ${DATE_LABELS[datePreset]}`}
      action={<Button size="sm" onClick={handleExport} className="h-8 text-xs cafe-glass-card !rounded-lg !py-0 !px-3 text-orange-300 hover:text-white border-orange-500/20 hover:border-orange-500/40"><Download className="h-3.5 w-3.5 mr-1.5" /> Export</Button>}
    >
      {/* KPI Widgets — 2 rows */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { label: 'Total Orders', val: stats.total, icon: Hash, color: 'text-zinc-100', accent: 'text-zinc-500' },
          { label: 'Revenue', val: stats.revenue, icon: IndianRupee, color: 'text-emerald-300', accent: 'text-emerald-500/60', currency: true },
          { label: 'Avg Order', val: stats.avgVal, icon: TrendingUp, color: 'text-violet-300', accent: 'text-violet-500/60', currency: true },
          { label: 'Cash', val: stats.cashRev, icon: Banknote, color: 'text-green-300', accent: 'text-green-500/60', currency: true },
          { label: 'UPI', val: stats.upiRev, icon: CreditCard, color: 'text-blue-300', accent: 'text-blue-500/60', currency: true },
          { label: 'Split', val: stats.splitRev, icon: SplitSquareHorizontal, color: 'text-cyan-300', accent: 'text-cyan-500/60', currency: true },
        ].map(k => (
          <div key={k.label} className="cafe-glass-card !rounded-xl p-3">
            <div className="flex items-center justify-between mb-1"><k.icon className={`h-4 w-4 ${k.accent}`} /></div>
            <p className={`text-lg font-bold font-heading leading-none ${k.color}`}>{k.currency ? <CurrencyDisplay amount={k.val as number} /> : k.val}</p>
            <p className="text-[10px] text-zinc-500 mt-1 font-quicksand">{k.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { label: 'Active', val: stats.active, icon: Clock, color: 'text-orange-300', accent: 'text-orange-500/60', pulse: stats.active > 0 },
          { label: 'Completed', val: stats.completed, icon: CheckCircle2, color: 'text-zinc-300', accent: 'text-zinc-500' },
          { label: 'Cancelled', val: stats.cancelled, icon: XCircle, color: 'text-red-300', accent: 'text-red-500/60' },
          { label: 'Unpaid', val: stats.pendingPayTotal, icon: AlertCircle, color: 'text-amber-300', accent: 'text-amber-500/60', currency: true, sub: `${stats.pendingPayCount} orders` },
          { label: 'Dine-In / Takeaway', val: `${stats.dineIn} / ${stats.takeaway}`, icon: UtensilsCrossed, color: 'text-zinc-200', accent: 'text-zinc-500' },
          { label: 'Comp', val: stats.compRev, icon: Gift, color: 'text-pink-300', accent: 'text-pink-500/60', currency: true },
        ].map(k => (
          <div key={k.label} className="cafe-glass-card !rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <k.icon className={`h-4 w-4 ${k.accent}`} />
              {'pulse' in k && k.pulse && <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />}
            </div>
            <p className={`text-lg font-bold font-heading leading-none ${k.color}`}>{k.currency ? <CurrencyDisplay amount={k.val as number} /> : k.val}</p>
            <p className="text-[10px] text-zinc-500 mt-1 font-quicksand">{k.label}</p>
            {'sub' in k && k.sub && <p className="text-[9px] text-zinc-600 font-quicksand">{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="cafe-glass-card !rounded-xl p-3 flex flex-wrap items-center gap-2">
        {/* Date preset */}
        <Select value={datePreset} onValueChange={v => setDatePreset(v as DatePreset)}>
          <SelectTrigger className={`w-[150px] ${selectCls}`}><CalendarDays className="h-3.5 w-3.5 mr-1.5 text-zinc-500 shrink-0" /><SelectValue /></SelectTrigger>
          <SelectContent className={selectContentCls}>
            {(Object.keys(DATE_LABELS) as DatePreset[]).map(k => <SelectItem key={k} value={k}>{DATE_LABELS[k]}</SelectItem>)}
          </SelectContent>
        </Select>

        {datePreset === 'custom' && (
          <>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-9 px-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-xs" />
            <span className="text-zinc-600 text-xs">to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-9 px-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-xs" />
          </>
        )}

        <span className="h-5 w-px bg-white/[0.06] hidden sm:block" />

        {/* Status */}
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <SelectTrigger className={`w-[120px] ${selectCls}`}><Filter className="h-3.5 w-3.5 mr-1.5 text-zinc-500 shrink-0" /><SelectValue /></SelectTrigger>
          <SelectContent className={selectContentCls}>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="served">Served</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Payment */}
        <Select value={paymentFilter} onValueChange={v => setPaymentFilter(v as any)}>
          <SelectTrigger className={`w-[120px] ${selectCls}`}><Wallet className="h-3.5 w-3.5 mr-1.5 text-zinc-500 shrink-0" /><SelectValue /></SelectTrigger>
          <SelectContent className={selectContentCls}>
            <SelectItem value="all">All Payment</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="split">Split</SelectItem>
            <SelectItem value="pending">Unpaid</SelectItem>
            <SelectItem value="complimentary">Comp</SelectItem>
          </SelectContent>
        </Select>

        {/* Order type */}
        <Select value={orderTypeFilter} onValueChange={v => setOrderTypeFilter(v as any)}>
          <SelectTrigger className={`w-[120px] ${selectCls}`}><UtensilsCrossed className="h-3.5 w-3.5 mr-1.5 text-zinc-500 shrink-0" /><SelectValue /></SelectTrigger>
          <SelectContent className={selectContentCls}>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="dine_in">Dine In</SelectItem>
            <SelectItem value="takeaway">Takeaway</SelectItem>
            <SelectItem value="to_station">To Station</SelectItem>
          </SelectContent>
        </Select>

        {/* Source */}
        <Select value={sourceFilter} onValueChange={v => setSourceFilter(v as any)}>
          <SelectTrigger className={`w-[110px] ${selectCls}`}><Users className="h-3.5 w-3.5 mr-1.5 text-zinc-500 shrink-0" /><SelectValue /></SelectTrigger>
          <SelectContent className={selectContentCls}>
            <SelectItem value="all">All Source</SelectItem>
            <SelectItem value="pos">POS</SelectItem>
            <SelectItem value="customer">Self-Order</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
          <SelectTrigger className={`w-[110px] ${selectCls}`}><ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-zinc-500 shrink-0" /><SelectValue /></SelectTrigger>
          <SelectContent className={selectContentCls}>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="highest">Highest ₹</SelectItem>
            <SelectItem value="lowest">Lowest ₹</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-full sm:w-auto sm:min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Order #, name, phone..."
            className="h-9 pl-8 text-xs bg-white/[0.03] border-white/[0.06] text-white placeholder:text-zinc-600 font-quicksand rounded-lg" />
        </div>
      </div>

      {/* Orders table */}
      <div className="cafe-glass-card !rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="grid grid-cols-[1fr_100px_90px_80px_100px_80px] gap-3 px-4 py-2.5 border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-wider text-zinc-500 font-quicksand hidden lg:grid">
          <span>Order</span><span>Customer</span><span>Amount</span><span>Payment</span><span>Status</span><span className="text-right">Actions</span>
        </div>

        <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: 'calc(100vh - 26rem)' }}>
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <ClipboardList className="h-10 w-10 mb-3 opacity-20" /><p className="font-quicksand text-sm">No orders found</p><p className="text-xs text-zinc-600 mt-1">Adjust filters or date range</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {filteredOrders.map(order => {
                const sc = STATUS_CFG[order.status] ?? STATUS_CFG.pending;
                const isTerminal = ['completed', 'cancelled'].includes(order.status);
                return (
                  <div key={order.id} className="group px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => handleViewDetails(order.id)}>
                    {/* Desktop */}
                    <div className="hidden lg:grid grid-cols-[1fr_100px_90px_80px_100px_80px] gap-3 items-center">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${sc.dot} ${!isTerminal ? 'animate-pulse' : ''}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white font-heading">{order.orderNumber}</span>
                            <span className="text-[10px] text-zinc-600 capitalize">{order.orderType.replace('_', ' ')}</span>
                            {order.orderSource === 'customer' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 font-medium">Self</span>}
                          </div>
                          <p className="text-[11px] text-zinc-600 font-quicksand">{fmtDate(order.createdAt)} · {fmt(order.createdAt)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-300 truncate font-quicksand">{order.customerName || '—'}</p>
                      <div>
                        <span className="text-sm font-bold text-white"><CurrencyDisplay amount={order.total} /></span>
                        {order.discount > 0 && <p className="text-[10px] text-emerald-500">-<CurrencyDisplay amount={order.discount} /></p>}
                      </div>
                      <div>
                        {order.paymentMethod === 'pending' && !isTerminal
                          ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium border border-amber-500/20">Unpaid</span>
                          : <span className="text-[11px] text-zinc-400 capitalize font-quicksand">{order.paymentMethod}</span>}
                      </div>
                      <span className={`text-[11px] px-2 py-1 rounded-md font-medium font-quicksand border w-fit ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        {!isTerminal && order.status === 'pending' && <button onClick={() => { updateOrderStatus(order.id, 'confirmed'); toast.success('Confirmed'); }} className="p-1.5 rounded-md hover:bg-blue-500/15 text-blue-400" title="Confirm"><CheckCircle2 className="h-3.5 w-3.5" /></button>}
                        {!isTerminal && order.paymentMethod === 'pending' && <button onClick={() => { setPaymentDialog(order.id); setSelectedPayment('cash'); }} className="p-1.5 rounded-md hover:bg-amber-500/15 text-amber-400" title="Settle"><Banknote className="h-3.5 w-3.5" /></button>}
                        {!isTerminal && ['confirmed', 'ready', 'served'].includes(order.status) && <button onClick={() => handleCompleteOrder(order.id)} className="p-1.5 rounded-md hover:bg-emerald-500/15 text-emerald-400" title="Complete"><CheckCircle2 className="h-3.5 w-3.5" /></button>}
                        <button onClick={() => handleEditOrder(order.id)} className="p-1.5 rounded-md hover:bg-white/[0.06] text-zinc-500" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handlePrintOrder(order.id)} className="p-1.5 rounded-md hover:bg-white/[0.06] text-zinc-500" title="Print"><Printer className="h-3.5 w-3.5" /></button>
                        {!isTerminal && <button onClick={() => { cancelOrder(order.id); toast.success('Cancelled'); }} className="p-1.5 rounded-md hover:bg-red-500/15 text-zinc-500 hover:text-red-400" title="Cancel"><XCircle className="h-3.5 w-3.5" /></button>}
                        {isTerminal && <button onClick={() => setDeleteDialog(order.id)} className="p-1.5 rounded-md hover:bg-red-500/15 text-zinc-500 hover:text-red-400" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>}
                      </div>
                    </div>
                    {/* Mobile */}
                    <div className="lg:hidden space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${sc.dot} ${!isTerminal ? 'animate-pulse' : ''}`} />
                          <span className="text-sm font-bold text-white font-heading">{order.orderNumber}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
                        </div>
                        <span className="text-sm font-bold text-white"><CurrencyDisplay amount={order.total} /></span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-quicksand flex-wrap">
                        {order.customerName && <span>{order.customerName}</span>}
                        <span>{fmtDate(order.createdAt)} · {fmt(order.createdAt)}</span>
                        <span className="capitalize">{order.paymentMethod}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {filteredOrders.length > 0 && (
          <div className="border-t border-white/[0.06] px-4 py-2 flex items-center justify-between text-[11px] text-zinc-500 font-quicksand">
            <span>{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}</span>
            <span>Revenue: <span className="text-white font-semibold"><CurrencyDisplay amount={stats.revenue} /></span></span>
          </div>
        )}
      </div>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!detailOrderId} onOpenChange={() => setDetailOrderId(null)}>
        <DialogContent className="cafe-glass-card !rounded-2xl border-white/[0.08] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white font-heading flex items-center gap-2"><Package className="h-4 w-4 text-orange-400" /> Order {detailOrder?.orderNumber}</DialogTitle></DialogHeader>
          {detailOrder && (
            <div className="space-y-4 mt-1">
              {detailOrder.status !== 'cancelled' && (
                <div className="flex items-center gap-0 px-1">
                  {statusTimeline.map((step, i) => {
                    const isActive = step.key === detailOrder.status;
                    const isDone = i < detailStatusIndex || detailOrder.status === 'completed';
                    return (<React.Fragment key={step.key}>
                      {i > 0 && <div className={`flex-1 h-px ${isDone || i <= detailStatusIndex ? 'bg-emerald-500' : 'bg-white/[0.06]'}`} />}
                      <div className="flex flex-col items-center" title={step.label}>
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${isDone ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' : isActive ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30' : 'bg-white/[0.04] text-zinc-600 ring-1 ring-white/[0.06]'}`}><step.icon className="h-3 w-3" /></div>
                        <span className={`text-[9px] mt-1 font-quicksand ${isActive ? 'text-orange-400' : isDone ? 'text-emerald-500' : 'text-zinc-600'}`}>{step.label}</span>
                      </div>
                    </React.Fragment>);
                  })}
                </div>
              )}
              {detailOrder.status === 'cancelled' && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-center"><span className="text-sm text-red-400 font-quicksand font-medium">Order Cancelled</span></div>}
              <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400 font-quicksand">
                {(() => { const s = STATUS_CFG[detailOrder.status]; return s ? <span className={`px-2 py-0.5 rounded-md border ${s.bg} ${s.text}`}>{s.label}</span> : null; })()}
                <span className="capitalize">{detailOrder.orderType.replace('_', ' ')}</span>
                <span>{new Date(detailOrder.createdAt).toLocaleString('en-IN')}</span>
              </div>
              {(detailOrder.customerName || detailOrder.customerPhone) && <div className="text-sm text-zinc-300 font-quicksand">{detailOrder.customerName} {detailOrder.customerPhone && <span className="text-zinc-500 ml-1">{detailOrder.customerPhone}</span>}</div>}
              {detailOrder.notes && <p className="text-xs text-amber-400 font-quicksand italic bg-amber-500/5 px-3 py-1.5 rounded-lg border border-amber-500/10">Notes: {detailOrder.notes}</p>}
              <div className="space-y-1.5">
                {detailItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <div><span className="text-sm text-white font-quicksand">{item.quantity}× {item.itemName}</span>{item.notes && <p className="text-[11px] text-amber-400 italic mt-0.5">"{item.notes}"</p>}</div>
                    <span className="text-sm font-semibold text-orange-300"><CurrencyDisplay amount={item.total} /></span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/[0.06] pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-zinc-400"><span>Subtotal</span><CurrencyDisplay amount={detailOrder.subtotal} /></div>
                {detailOrder.discount > 0 && <div className="flex justify-between text-emerald-400"><span>Discount</span>-<CurrencyDisplay amount={detailOrder.discount} /></div>}
                <div className="flex justify-between text-white font-bold text-base pt-1"><span>Total</span><CurrencyDisplay amount={detailOrder.total} /></div>
                <div className="flex justify-between text-[11px] text-zinc-500 pt-1"><span>Payment</span><span className="capitalize">{detailOrder.paymentMethod}</span></div>
                <div className="flex justify-between text-orange-400 text-[11px]"><span>Partner ({detailOrder.partnerRateSnapshot}%)</span><CurrencyDisplay amount={detailOrder.partnerShare} /></div>
                <div className="flex justify-between text-violet-400 text-[11px]"><span>Cuephoria ({detailOrder.cuephoriaRateSnapshot}%)</span><CurrencyDisplay amount={detailOrder.cuephoriaShare} /></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="cafe-glass-card !rounded-2xl border-white/[0.08] sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white font-heading flex items-center gap-2"><Pencil className="h-4 w-4 text-blue-400" /> Edit Order</DialogTitle></DialogHeader>
          {(() => { const e = orders.find(o => o.id === editDialog); if (!e) return null; return (
            <div className="space-y-4 mt-1">
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"><div className="flex justify-between items-center"><span className="text-sm font-bold text-white">#{e.orderNumber}</span><span className="text-sm text-orange-300 font-bold"><CurrencyDisplay amount={e.subtotal} /></span></div>{e.customerName && <p className="text-xs text-zinc-500 mt-1">{e.customerName}</p>}</div>
              <div><label className="text-[11px] text-zinc-500 font-quicksand block mb-1">Discount Amount</label><Input type="number" value={editDiscount} onChange={ev => setEditDiscount(ev.target.value)} className="bg-white/[0.03] border-white/[0.06] text-white rounded-lg" placeholder="0" min="0" />{Number(editDiscount) > 0 && <p className="text-[11px] text-emerald-400 mt-1">New total: <CurrencyDisplay amount={Math.max(0, e.subtotal - Number(editDiscount))} /></p>}</div>
              <div><label className="text-[11px] text-zinc-500 font-quicksand block mb-1">Order Notes</label><Input value={editNotes} onChange={ev => setEditNotes(ev.target.value)} className="bg-white/[0.03] border-white/[0.06] text-white rounded-lg" placeholder="Add notes..." /></div>
              <Button onClick={handleSaveEdit} className="w-full h-9 text-sm text-white border-0 rounded-lg" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>Save Changes</Button>
            </div>
          ); })()}
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="cafe-glass-card !rounded-2xl border-white/[0.08] sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-white font-heading flex items-center gap-2"><Trash2 className="h-4 w-4 text-red-400" /> Delete Order</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-1">
            <p className="text-sm text-zinc-400 font-quicksand">Permanently delete this order?</p>
            {(() => { const d = orders.find(o => o.id === deleteDialog); return d ? <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15"><span className="text-sm font-bold text-white">#{d.orderNumber}</span><span className="text-sm text-red-400 font-bold ml-2"><CurrencyDisplay amount={d.total} /></span></div> : null; })()}
            <div className="grid grid-cols-2 gap-2"><Button onClick={() => setDeleteDialog(null)} variant="outline" className="border-white/[0.08] text-zinc-400 rounded-lg">Cancel</Button><Button onClick={handleDeleteOrder} className="bg-red-500 hover:bg-red-600 text-white border-0 rounded-lg">Delete</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Payment Dialog ── */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent className="cafe-glass-card !rounded-2xl border-white/[0.08] sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white font-heading flex items-center gap-2"><Banknote className="h-4 w-4 text-amber-400" /> Settle Payment</DialogTitle></DialogHeader>
          {(() => { const p = orders.find(o => o.id === paymentDialog); if (!p) return null; return (
            <div className="space-y-4 mt-1">
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"><div><span className="text-sm font-bold text-white font-heading">#{p.orderNumber}</span>{p.customerName && <span className="text-xs text-zinc-500 ml-2">{p.customerName}</span>}</div><span className="text-lg font-bold text-orange-300"><CurrencyDisplay amount={p.total} /></span></div>
              <div className="grid grid-cols-3 gap-2">
                {([{ method: 'cash' as const, label: 'Cash', icon: Banknote }, { method: 'upi' as const, label: 'UPI', icon: CreditCard }, { method: 'split' as const, label: 'Split', icon: SplitSquareHorizontal }]).map(pm => (
                  <button key={pm.method} onClick={() => setSelectedPayment(pm.method)} className={`py-3 rounded-xl flex flex-col items-center gap-1.5 text-xs font-quicksand transition-all border ${selectedPayment === pm.method ? 'bg-orange-500/15 border-orange-500/30 text-orange-300 ring-1 ring-orange-500/20' : 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:border-white/[0.12]'}`}><pm.icon className="h-5 w-5" /> {pm.label}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => handlePayAndComplete(false)} variant="outline" className="h-9 text-xs font-quicksand border-amber-500/25 text-amber-400 hover:bg-amber-500/10 rounded-lg">Settle Only</Button>
                <Button onClick={() => handlePayAndComplete(true)} className="h-9 text-xs text-white font-quicksand border-0 rounded-lg" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>Settle & Complete</Button>
              </div>
            </div>
          ); })()}
        </DialogContent>
      </Dialog>
    </CafePageShell>
  );
};

export default CafeOrders;
