import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeOrders } from '@/hooks/cafe/useCafeOrders';
import { CurrencyDisplay } from '@/components/ui/currency';
import type { CafeOrderStatus, CafeOrderItem, CafePaymentMethod } from '@/types/cafe.types';
import {
  ClipboardList, Search, Clock, CheckCircle2, XCircle, Eye, Banknote,
  CreditCard, SplitSquareHorizontal, Download, Printer, CookingPot,
  ShoppingCart, Coffee, UtensilsCrossed, AlertCircle, Pencil, Trash2,
  TrendingUp, Hash, ChevronRight, Package, IndianRupee,
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

type DateFilter = 'today' | '7d' | '30d' | 'all';

const CafeOrders: React.FC = () => {
  const { user } = useCafeAuth();
  const { orders, fetchOrderItems, updateOrderStatus, cancelOrder, deleteOrder, updateOrderDetails } = useCafeOrders(user?.locationId);
  const [filter, setFilter] = useState<'active' | 'all' | 'pending_payment' | CafeOrderStatus>('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailItems, setDetailItems] = useState<CafeOrderItem[]>([]);
  const [paymentDialog, setPaymentDialog] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<CafePaymentMethod>('cash');
  const [editDialog, setEditDialog] = useState<string | null>(null);
  const [editDiscount, setEditDiscount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    switch (dateFilter) {
      case 'today': return { start: startOfDay, end: now };
      case '7d': { const d = new Date(startOfDay); d.setDate(d.getDate() - 7); return { start: d, end: now }; }
      case '30d': { const d = new Date(startOfDay); d.setDate(d.getDate() - 30); return { start: d, end: now }; }
      case 'all': return { start: new Date(0), end: now };
    }
  }, [dateFilter]);

  const filteredOrders = useMemo(() => {
    return orders
      .filter(o => {
        const d = new Date(o.createdAt);
        return d >= dateRange.start && d <= dateRange.end;
      })
      .filter(o => {
        if (filter === 'active') return !['completed', 'cancelled'].includes(o.status);
        if (filter === 'pending_payment') return o.paymentMethod === 'pending' && !['cancelled', 'completed'].includes(o.status);
        if (filter !== 'all') return o.status === filter;
        return true;
      })
      .filter(o => {
        if (!search) return true;
        const q = search.toLowerCase();
        return o.orderNumber.toLowerCase().includes(q) || o.customerName?.toLowerCase().includes(q) || o.customerPhone?.includes(q);
      });
  }, [orders, dateRange, filter, search]);

  const pendingPaymentCount = useMemo(() =>
    orders.filter(o => o.paymentMethod === 'pending' && !['cancelled', 'completed'].includes(o.status)).length,
  [orders]);
  const pendingPaymentTotal = useMemo(() =>
    orders.filter(o => o.paymentMethod === 'pending' && !['cancelled', 'completed'].includes(o.status)).reduce((s, o) => s + o.total, 0),
  [orders]);

  const stats = useMemo(() => ({
    total: filteredOrders.length,
    active: filteredOrders.filter(o => !['completed', 'cancelled'].includes(o.status)).length,
    completed: filteredOrders.filter(o => o.status === 'completed').length,
    cancelled: filteredOrders.filter(o => o.status === 'cancelled').length,
    revenue: filteredOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
  }), [filteredOrders]);

  const handleViewDetails = async (orderId: string) => {
    setDetailOrderId(orderId);
    const items = await fetchOrderItems(orderId);
    setDetailItems(items);
  };

  const handleCompleteOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order?.paymentMethod === 'pending') {
      setPaymentDialog(orderId);
    } else {
      updateOrderStatus(orderId, 'completed');
      toast.success('Order completed');
    }
  };

  const handlePayAndComplete = async (completeOrder: boolean = true) => {
    if (!paymentDialog) return;
    const order = orders.find(o => o.id === paymentDialog);
    if (!order) return;
    const newStatus: CafeOrderStatus = completeOrder ? 'completed' : order.status;
    await updateOrderStatus(paymentDialog, newStatus, selectedPayment);
    if (order.customerId && order.total > 0 && order.paymentMethod === 'pending') {
      const { supabase } = await import('@/integrations/supabase/client');
      try { await supabase.rpc('increment_customer_total_spent', { p_customer_id: order.customerId, p_amount: order.total }); } catch {}
    }
    setPaymentDialog(null);
    toast.success(completeOrder ? 'Payment settled & order completed' : 'Payment settled');
  };

  const handleEditOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    setEditDiscount(String(order.discount || 0));
    setEditNotes(order.notes || '');
    setEditDialog(orderId);
  };

  const handleSaveEdit = async () => {
    if (!editDialog) return;
    const ok = await updateOrderDetails(editDialog, { discount: Number(editDiscount) || 0, notes: editNotes });
    if (ok) { toast.success('Order updated'); setEditDialog(null); }
    else toast.error('Failed to update');
  };

  const handleDeleteOrder = async () => {
    if (!deleteDialog) return;
    const ok = await deleteOrder(deleteDialog);
    if (ok) { toast.success('Order deleted'); setDeleteDialog(null); }
    else toast.error('Failed to delete order');
  };

  const handleExport = useCallback(() => {
    const header = 'Order Number,Date,Time,Type,Source,Customer,Phone,Subtotal,Discount,Total,Payment,Status';
    const rows = filteredOrders.map(o => [
      o.orderNumber, new Date(o.createdAt).toLocaleDateString('en-IN'),
      new Date(o.createdAt).toLocaleTimeString('en-IN'),
      o.orderType, o.orderSource, o.customerName || '', o.customerPhone || '',
      o.subtotal, o.discount, o.total, o.paymentMethod, o.status,
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `cafe_orders_${dateFilter}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Orders exported');
  }, [filteredOrders, dateFilter]);

  const handlePrintOrder = useCallback((orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const printWindow = window.open('', '_blank', 'width=300,height=500');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Order</title>
      <style>body{font-family:monospace;font-size:12px;padding:8px;max-width:280px;margin:0 auto}
      .center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:6px 0}
      .row{display:flex;justify-content:space-between}</style></head><body>
      <div class="center bold" style="font-size:16px">CUEPHORIA CAFE</div>
      <div class="center">${order.orderNumber}</div>
      <div class="center">${new Date(order.createdAt).toLocaleString('en-IN')}</div>
      ${order.customerName ? `<div class="center">${order.customerName}${order.customerPhone ? ' · ' + order.customerPhone : ''}</div>` : ''}
      <div class="line"></div>
      <div class="row bold"><span>Total</span><span>₹${order.total.toFixed(2)}</span></div>
      <div class="row"><span>Payment</span><span>${order.paymentMethod}</span></div>
      <div class="row"><span>Status</span><span>${order.status}</span></div>
      <div class="line"></div>
      <div class="center" style="margin-top:8px;font-size:10px">Thank you!</div>
      <script>setTimeout(()=>{window.print();window.close()},300)</script></body></html>`);
    printWindow.document.close();
  }, [orders]);

  const detailOrder = orders.find(o => o.id === detailOrderId);
  const detailStatusIndex = detailOrder ? statusTimeline.findIndex(s => s.key === detailOrder.status) : -1;

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <CafePageShell
      eyebrow="Operations"
      title="Orders"
      description={`${stats.total} orders${dateFilter !== 'all' ? ` · ${dateFilter === 'today' ? 'Today' : dateFilter === '7d' ? 'Last 7 days' : 'Last 30 days'}` : ''}`}
      action={
        <Button size="sm" onClick={handleExport}
          className="h-8 text-xs cafe-glass-card !rounded-lg !py-0 !px-3 text-orange-300 hover:text-white border-orange-500/20 hover:border-orange-500/40">
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
        </Button>
      }
    >
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
        {[
          { label: 'Total Orders', value: stats.total, icon: Hash, color: 'text-zinc-100', accent: 'text-zinc-400' },
          { label: 'Active', value: stats.active, icon: Clock, color: 'text-orange-300', accent: 'text-orange-500/70' },
          { label: 'Revenue', value: stats.revenue, icon: IndianRupee, color: 'text-emerald-300', accent: 'text-emerald-500/70', currency: true },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-blue-300', accent: 'text-blue-500/70' },
          ...(pendingPaymentCount > 0 ? [{
            label: 'Unpaid', value: pendingPaymentTotal, icon: AlertCircle, color: 'text-amber-300', accent: 'text-amber-500/70', currency: true,
            onClick: () => setFilter('pending_payment'),
          }] : stats.cancelled > 0 ? [{
            label: 'Cancelled', value: stats.cancelled, icon: XCircle, color: 'text-red-300', accent: 'text-red-500/70',
          }] : []),
        ].map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={'onClick' in kpi ? (kpi as any).onClick : undefined}
            className="cafe-glass-card !rounded-xl p-3 text-left transition-all hover:border-white/[0.14] group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
              {kpi.label === 'Active' && stats.active > 0 && <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />}
            </div>
            <p className={`text-lg font-bold font-heading leading-none ${kpi.color}`}>
              {'currency' in kpi && kpi.currency ? <CurrencyDisplay amount={kpi.value as number} /> : kpi.value}
            </p>
            <p className="text-[10px] text-zinc-500 mt-1 font-quicksand">{kpi.label}</p>
          </button>
        ))}
      </div>

      {/* Controls bar */}
      <div className="cafe-glass-card !rounded-xl p-3 flex flex-wrap items-center gap-2">
        {/* Date chips */}
        <div className="flex gap-1 mr-1">
          {(['today', '7d', '30d', 'all'] as DateFilter[]).map(d => (
            <button key={d} onClick={() => setDateFilter(d)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium font-quicksand transition-all ${
                dateFilter === d
                  ? 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}>
              {d === 'today' ? 'Today' : d === '7d' ? '7 Days' : d === '30d' ? '30 Days' : 'All Time'}
            </button>
          ))}
        </div>

        <span className="h-4 w-px bg-white/[0.08] hidden sm:block" />

        {/* Status chips */}
        <div className="flex gap-1 flex-wrap">
          {([
            { key: 'all' as const, label: 'All' },
            { key: 'active' as const, label: 'Active' },
            { key: 'pending_payment' as const, label: `Unpaid${pendingPaymentCount > 0 ? ` (${pendingPaymentCount})` : ''}` },
            { key: 'pending' as const, label: 'Pending' },
            { key: 'preparing' as const, label: 'Preparing' },
            { key: 'ready' as const, label: 'Ready' },
            { key: 'completed' as const, label: 'Done' },
            { key: 'cancelled' as const, label: 'Cancelled' },
          ]).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium font-quicksand transition-all ${
                filter === f.key
                  ? f.key === 'pending_payment'
                    ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/25'
                    : 'bg-white/[0.08] text-white ring-1 ring-white/[0.1]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-full sm:w-auto sm:min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Order #, name, phone..."
            className="h-8 pl-8 text-xs bg-white/[0.03] border-white/[0.06] text-white placeholder:text-zinc-600 font-quicksand rounded-lg"
          />
        </div>
      </div>

      {/* Orders table */}
      <div className="cafe-glass-card !rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_100px_100px_80px_110px_90px] gap-3 px-4 py-2.5 border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-wider text-zinc-500 font-quicksand hidden lg:grid">
          <span>Order</span>
          <span>Customer</span>
          <span>Amount</span>
          <span>Payment</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: 'calc(100vh - 21rem)' }}>
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <ClipboardList className="h-10 w-10 mb-3 opacity-20" />
              <p className="font-quicksand text-sm">No orders found</p>
              <p className="text-xs text-zinc-600 mt-1">Adjust the date range or filter</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {filteredOrders.map(order => {
                const sc = STATUS_CFG[order.status] ?? STATUS_CFG.pending;
                const isTerminal = ['completed', 'cancelled'].includes(order.status);
                return (
                  <div
                    key={order.id}
                    className="group px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => handleViewDetails(order.id)}
                  >
                    {/* Desktop row */}
                    <div className="hidden lg:grid grid-cols-[1fr_100px_100px_80px_110px_90px] gap-3 items-center">
                      {/* Order info */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${sc.dot} ${!isTerminal ? 'animate-pulse' : ''}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white font-heading">{order.orderNumber}</span>
                            <span className="text-[10px] text-zinc-600 capitalize">{order.orderType.replace('_', ' ')}</span>
                            {order.orderSource === 'customer' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 font-medium">Self</span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-600 font-quicksand">{formatDate(order.createdAt)} · {formatTime(order.createdAt)}</p>
                        </div>
                      </div>
                      {/* Customer */}
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-300 truncate font-quicksand">{order.customerName || '—'}</p>
                      </div>
                      {/* Amount */}
                      <div>
                        <span className="text-sm font-bold text-white"><CurrencyDisplay amount={order.total} /></span>
                        {order.discount > 0 && <p className="text-[10px] text-emerald-500">-<CurrencyDisplay amount={order.discount} /></p>}
                      </div>
                      {/* Payment */}
                      <div className="flex items-center gap-1">
                        {order.paymentMethod === 'pending' && !isTerminal ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium border border-amber-500/20">Unpaid</span>
                        ) : (
                          <span className="text-[11px] text-zinc-400 capitalize font-quicksand">{order.paymentMethod}</span>
                        )}
                      </div>
                      {/* Status */}
                      <span className={`text-[11px] px-2 py-1 rounded-md font-medium font-quicksand border w-fit ${sc.bg} ${sc.text}`}>
                        {sc.label}
                      </span>
                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        {!isTerminal && order.status === 'pending' && (
                          <button onClick={() => { updateOrderStatus(order.id, 'confirmed'); toast.success('Confirmed'); }}
                            className="p-1.5 rounded-md hover:bg-blue-500/15 text-blue-400" title="Confirm">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!isTerminal && order.paymentMethod === 'pending' && (
                          <button onClick={() => { setPaymentDialog(order.id); setSelectedPayment('cash'); }}
                            className="p-1.5 rounded-md hover:bg-amber-500/15 text-amber-400" title="Settle">
                            <Banknote className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!isTerminal && ['confirmed', 'ready', 'served'].includes(order.status) && (
                          <button onClick={() => handleCompleteOrder(order.id)}
                            className="p-1.5 rounded-md hover:bg-emerald-500/15 text-emerald-400" title="Complete">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => handleEditOrder(order.id)} className="p-1.5 rounded-md hover:bg-white/[0.06] text-zinc-500" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handlePrintOrder(order.id)} className="p-1.5 rounded-md hover:bg-white/[0.06] text-zinc-500" title="Print">
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        {!isTerminal && (
                          <button onClick={() => { cancelOrder(order.id); toast.success('Cancelled'); }}
                            className="p-1.5 rounded-md hover:bg-red-500/15 text-zinc-500 hover:text-red-400" title="Cancel">
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isTerminal && (
                          <button onClick={() => setDeleteDialog(order.id)} className="p-1.5 rounded-md hover:bg-red-500/15 text-zinc-500 hover:text-red-400" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="lg:hidden space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${sc.dot} ${!isTerminal ? 'animate-pulse' : ''}`} />
                          <span className="text-sm font-bold text-white font-heading">{order.orderNumber}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
                        </div>
                        <span className="text-sm font-bold text-white"><CurrencyDisplay amount={order.total} /></span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-quicksand">
                        {order.customerName && <span>{order.customerName}</span>}
                        <span>{formatDate(order.createdAt)} · {formatTime(order.createdAt)}</span>
                        <span className="capitalize">{order.paymentMethod}</span>
                        {order.paymentMethod === 'pending' && !isTerminal && (
                          <span className="text-amber-400 font-medium">Unpaid</span>
                        )}
                      </div>
                      {!isTerminal && (
                        <div className="flex gap-1.5 pt-1" onClick={e => e.stopPropagation()}>
                          {order.status === 'pending' && (
                            <Button size="sm" onClick={() => { updateOrderStatus(order.id, 'confirmed'); toast.success('Confirmed'); }}
                              className="h-7 text-[11px] bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border-0 px-2">
                              Confirm
                            </Button>
                          )}
                          {order.paymentMethod === 'pending' && (
                            <Button size="sm" onClick={() => { setPaymentDialog(order.id); setSelectedPayment('cash'); }}
                              className="h-7 text-[11px] bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border-0 px-2">
                              Settle
                            </Button>
                          )}
                          {['confirmed', 'ready', 'served'].includes(order.status) && (
                            <Button size="sm" onClick={() => handleCompleteOrder(order.id)}
                              className="h-7 text-[11px] bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border-0 px-2">
                              Complete
                            </Button>
                          )}
                          <Button size="sm" onClick={() => { cancelOrder(order.id); toast.success('Cancelled'); }}
                            className="h-7 text-[11px] bg-red-500/10 text-red-400 hover:bg-red-500/20 border-0 px-2">
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer summary */}
        {filteredOrders.length > 0 && (
          <div className="border-t border-white/[0.06] px-4 py-2 flex items-center justify-between text-[11px] text-zinc-500 font-quicksand">
            <span>{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}</span>
            <span>Total: <span className="text-white font-semibold"><CurrencyDisplay amount={stats.revenue} /></span></span>
          </div>
        )}
      </div>

      {/* ── Order Detail Dialog ── */}
      <Dialog open={!!detailOrderId} onOpenChange={() => setDetailOrderId(null)}>
        <DialogContent className="cafe-glass-card !rounded-2xl border-white/[0.08] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white font-heading flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-400" />
              Order {detailOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4 mt-1">
              {detailOrder.status !== 'cancelled' && (
                <div className="flex items-center gap-0 px-1">
                  {statusTimeline.map((step, i) => {
                    const isActive = step.key === detailOrder.status;
                    const isCompleted = i < detailStatusIndex || detailOrder.status === 'completed';
                    return (
                      <React.Fragment key={step.key}>
                        {i > 0 && <div className={`flex-1 h-px ${isCompleted || i <= detailStatusIndex ? 'bg-emerald-500' : 'bg-white/[0.06]'}`} />}
                        <div className="flex flex-col items-center" title={step.label}>
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${
                            isCompleted ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                            : isActive ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30'
                            : 'bg-white/[0.04] text-zinc-600 ring-1 ring-white/[0.06]'
                          }`}>
                            <step.icon className="h-3 w-3" />
                          </div>
                          <span className={`text-[9px] mt-1 font-quicksand ${isActive ? 'text-orange-400' : isCompleted ? 'text-emerald-500' : 'text-zinc-600'}`}>
                            {step.label}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
              {detailOrder.status === 'cancelled' && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                  <span className="text-sm text-red-400 font-quicksand font-medium">Order Cancelled</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400 font-quicksand">
                {(() => { const sc = STATUS_CFG[detailOrder.status]; return sc ? <span className={`px-2 py-0.5 rounded-md border ${sc.bg} ${sc.text}`}>{sc.label}</span> : null; })()}
                <span className="capitalize">{detailOrder.orderType.replace('_', ' ')}</span>
                <span>{new Date(detailOrder.createdAt).toLocaleString('en-IN')}</span>
              </div>

              {(detailOrder.customerName || detailOrder.customerPhone) && (
                <div className="text-sm text-zinc-300 font-quicksand">
                  {detailOrder.customerName} {detailOrder.customerPhone && <span className="text-zinc-500 ml-1">{detailOrder.customerPhone}</span>}
                </div>
              )}
              {detailOrder.notes && (
                <p className="text-xs text-amber-400 font-quicksand italic bg-amber-500/5 px-3 py-1.5 rounded-lg border border-amber-500/10">Notes: {detailOrder.notes}</p>
              )}

              <div className="space-y-1.5">
                {detailItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <div>
                      <span className="text-sm text-white font-quicksand">{item.quantity}× {item.itemName}</span>
                      {item.notes && <p className="text-[11px] text-amber-400 italic mt-0.5">"{item.notes}"</p>}
                    </div>
                    <span className="text-sm font-semibold text-orange-300"><CurrencyDisplay amount={item.total} /></span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/[0.06] pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-zinc-400"><span>Subtotal</span><CurrencyDisplay amount={detailOrder.subtotal} /></div>
                {detailOrder.discount > 0 && <div className="flex justify-between text-emerald-400"><span>Discount</span>-<CurrencyDisplay amount={detailOrder.discount} /></div>}
                <div className="flex justify-between text-white font-bold text-base pt-1"><span>Total</span><CurrencyDisplay amount={detailOrder.total} /></div>
                <div className="flex justify-between text-[11px] text-zinc-500 pt-1"><span>Payment</span><span className="capitalize">{detailOrder.paymentMethod}</span></div>
                {detailOrder.cashAmount != null && detailOrder.cashAmount > 0 && <div className="flex justify-between text-[11px] text-zinc-500"><span>Cash</span><CurrencyDisplay amount={detailOrder.cashAmount} /></div>}
                {detailOrder.upiAmount != null && detailOrder.upiAmount > 0 && <div className="flex justify-between text-[11px] text-zinc-500"><span>UPI</span><CurrencyDisplay amount={detailOrder.upiAmount} /></div>}
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
          <DialogHeader>
            <DialogTitle className="text-white font-heading flex items-center gap-2">
              <Pencil className="h-4 w-4 text-blue-400" /> Edit Order
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const eOrder = orders.find(o => o.id === editDialog);
            if (!eOrder) return null;
            return (
              <div className="space-y-4 mt-1">
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-white">#{eOrder.orderNumber}</span>
                    <span className="text-sm text-orange-300 font-bold"><CurrencyDisplay amount={eOrder.subtotal} /></span>
                  </div>
                  {eOrder.customerName && <p className="text-xs text-zinc-500 mt-1">{eOrder.customerName}</p>}
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 font-quicksand block mb-1">Discount Amount</label>
                  <Input type="number" value={editDiscount} onChange={e => setEditDiscount(e.target.value)}
                    className="bg-white/[0.03] border-white/[0.06] text-white rounded-lg" placeholder="0" min="0" />
                  {Number(editDiscount) > 0 && (
                    <p className="text-[11px] text-emerald-400 mt-1">New total: <CurrencyDisplay amount={Math.max(0, eOrder.subtotal - Number(editDiscount))} /></p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 font-quicksand block mb-1">Order Notes</label>
                  <Input value={editNotes} onChange={e => setEditNotes(e.target.value)}
                    className="bg-white/[0.03] border-white/[0.06] text-white rounded-lg" placeholder="Add notes..." />
                </div>
                <Button onClick={handleSaveEdit} className="w-full h-9 text-sm text-white border-0 rounded-lg"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>
                  Save Changes
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="cafe-glass-card !rounded-2xl border-white/[0.08] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white font-heading flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-400" /> Delete Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <p className="text-sm text-zinc-400 font-quicksand">Permanently delete this order? This cannot be undone.</p>
            {(() => {
              const dOrder = orders.find(o => o.id === deleteDialog);
              if (!dOrder) return null;
              return (
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                  <span className="text-sm font-bold text-white">#{dOrder.orderNumber}</span>
                  <span className="text-sm text-red-400 font-bold ml-2"><CurrencyDisplay amount={dOrder.total} /></span>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setDeleteDialog(null)} variant="outline" className="border-white/[0.08] text-zinc-400 rounded-lg">Cancel</Button>
              <Button onClick={handleDeleteOrder} className="bg-red-500 hover:bg-red-600 text-white border-0 rounded-lg">Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Payment Dialog ── */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent className="cafe-glass-card !rounded-2xl border-white/[0.08] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-heading flex items-center gap-2">
              <Banknote className="h-4 w-4 text-amber-400" /> Settle Payment
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const pOrder = orders.find(o => o.id === paymentDialog);
            if (!pOrder) return null;
            return (
              <div className="space-y-4 mt-1">
                <div className="flex justify-between items-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div>
                    <span className="text-sm font-bold text-white font-heading">#{pOrder.orderNumber}</span>
                    {pOrder.customerName && <span className="text-xs text-zinc-500 ml-2">{pOrder.customerName}</span>}
                  </div>
                  <span className="text-lg font-bold text-orange-300"><CurrencyDisplay amount={pOrder.total} /></span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { method: 'cash' as const, label: 'Cash', icon: Banknote },
                    { method: 'upi' as const, label: 'UPI', icon: CreditCard },
                    { method: 'split' as const, label: 'Split', icon: SplitSquareHorizontal },
                  ]).map(p => (
                    <button key={p.method} onClick={() => setSelectedPayment(p.method)}
                      className={`py-3 rounded-xl flex flex-col items-center gap-1.5 text-xs font-quicksand transition-all border ${
                        selectedPayment === p.method
                          ? 'bg-orange-500/15 border-orange-500/30 text-orange-300 ring-1 ring-orange-500/20'
                          : 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:border-white/[0.12]'
                      }`}>
                      <p.icon className="h-5 w-5" /> {p.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => handlePayAndComplete(false)} variant="outline"
                    className="h-9 text-xs font-quicksand border-amber-500/25 text-amber-400 hover:bg-amber-500/10 rounded-lg">
                    Settle Only
                  </Button>
                  <Button onClick={() => handlePayAndComplete(true)} className="h-9 text-xs text-white font-quicksand border-0 rounded-lg"
                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                    Settle & Complete
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </CafePageShell>
  );
};

export default CafeOrders;
