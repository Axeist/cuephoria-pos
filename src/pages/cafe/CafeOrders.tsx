import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeOrders } from '@/hooks/cafe/useCafeOrders';
import { CurrencyDisplay } from '@/components/ui/currency';
import type { CafeOrderStatus, CafeOrderItem, CafePaymentMethod } from '@/types/cafe.types';
import {
  ClipboardList, Search, Clock, CheckCircle2, XCircle, Eye, Banknote,
  CreditCard, SplitSquareHorizontal, Download, Calendar, Printer, ChefHat,
  ShoppingCart, Coffee, UtensilsCrossed, ArrowRight, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  preparing: 'bg-orange-500/20 text-orange-400',
  ready: 'bg-green-500/20 text-green-400',
  served: 'bg-purple-500/20 text-purple-400',
  completed: 'bg-gray-500/20 text-gray-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

const statusTimeline: { key: CafeOrderStatus; label: string; icon: React.ElementType }[] = [
  { key: 'pending', label: 'Placed', icon: ShoppingCart },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'ready', label: 'Ready', icon: Coffee },
  { key: 'served', label: 'Served', icon: UtensilsCrossed },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

type DateFilter = 'today' | '7d' | '30d' | 'custom';

const CafeOrders: React.FC = () => {
  const { user } = useCafeAuth();
  const { orders, fetchOrderItems, updateOrderStatus, cancelOrder } = useCafeOrders(user?.locationId);
  const [filter, setFilter] = useState<'active' | 'all' | 'pending_payment' | CafeOrderStatus>('active');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailItems, setDetailItems] = useState<CafeOrderItem[]>([]);
  const [paymentDialog, setPaymentDialog] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<CafePaymentMethod>('cash');

  const dateRange = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    switch (dateFilter) {
      case 'today': return { start: startOfDay, end: now };
      case '7d': { const d = new Date(startOfDay); d.setDate(d.getDate() - 7); return { start: d, end: now }; }
      case '30d': { const d = new Date(startOfDay); d.setDate(d.getDate() - 30); return { start: d, end: now }; }
      case 'custom': return { start: new Date(customStart + 'T00:00:00'), end: new Date(customEnd + 'T23:59:59') };
    }
  }, [dateFilter, customStart, customEnd]);

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
    revenue: filteredOrders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0),
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
      await supabase.rpc('increment_customer_total_spent', { p_customer_id: order.customerId, p_amount: order.total }).catch(() => {});
    }
    setPaymentDialog(null);
    toast.success(completeOrder ? 'Payment settled & order completed' : 'Payment settled');
  };

  const handleExport = useCallback(() => {
    const header = 'Order Number,Date,Time,Type,Source,Customer,Phone,Subtotal,Discount,Total,Payment,Status';
    const rows = filteredOrders.map(o => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleDateString('en-IN'),
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

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-4 overflow-x-hidden">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text font-heading animate-slide-down">Orders</h1>
        <Button size="sm" onClick={handleExport} className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-0">
          <Download className="h-3.5 w-3.5 mr-1" /> Export
        </Button>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(['today', '7d', '30d', 'custom'] as DateFilter[]).map(d => (
          <button key={d} onClick={() => setDateFilter(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-quicksand transition-all ${
              dateFilter === d ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'bg-gray-800/50 text-gray-400 border border-gray-700/30'
            }`}>
            {d === 'today' ? 'Today' : d === '7d' ? '7 Days' : d === '30d' ? '30 Days' : 'Custom'}
          </button>
        ))}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="h-8 px-2 rounded-md bg-gray-800/50 border border-gray-700 text-white text-xs" />
            <span className="text-gray-500 text-xs">to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="h-8 px-2 rounded-md bg-gray-800/50 border border-gray-700 text-white text-xs" />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="px-3 py-1.5 rounded-lg bg-gray-800/30 border border-gray-700/20">
          <span className="text-xs text-gray-400 font-quicksand">Total: </span>
          <span className="text-xs text-white font-bold">{stats.total}</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <span className="text-xs text-gray-400 font-quicksand">Active: </span>
          <span className="text-xs text-orange-400 font-bold">{stats.active}</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
          <span className="text-xs text-gray-400 font-quicksand">Revenue: </span>
          <span className="text-xs text-green-400 font-bold"><CurrencyDisplay amount={stats.revenue} /></span>
        </div>
        {pendingPaymentCount > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:border-amber-500/40 transition-colors"
            onClick={() => setFilter('pending_payment')}>
            <span className="text-xs text-gray-400 font-quicksand">Unpaid: </span>
            <span className="text-xs text-amber-400 font-bold">{pendingPaymentCount}</span>
            <span className="text-xs text-amber-400/60 ml-1">(<CurrencyDisplay amount={pendingPaymentTotal} />)</span>
          </div>
        )}
        {stats.cancelled > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <span className="text-xs text-gray-400 font-quicksand">Cancelled: </span>
            <span className="text-xs text-red-400 font-bold">{stats.cancelled}</span>
          </div>
        )}
      </div>

      {/* Status Filters + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1 flex-wrap">
          {([
            { key: 'active' as const, label: 'Active' },
            { key: 'all' as const, label: 'All' },
            { key: 'pending_payment' as const, label: 'Unpaid' },
            { key: 'pending' as const, label: 'Pending' },
            { key: 'preparing' as const, label: 'Preparing' },
            { key: 'ready' as const, label: 'Ready' },
            { key: 'completed' as const, label: 'Completed' },
            { key: 'cancelled' as const, label: 'Cancelled' },
          ]).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-quicksand ${filter === f.key
                ? f.key === 'pending_payment' ? 'bg-amber-500/20 text-amber-400' : 'bg-orange-500/20 text-orange-400'
                : 'text-gray-500 hover:text-white'
              }`}>
              {f.label}
              {f.key === 'pending_payment' && pendingPaymentCount > 0 && (
                <span className="ml-1 text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded-full">{pendingPaymentCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." className="h-8 pl-8 text-xs bg-gray-800/50 border-gray-700/50 text-white font-quicksand" />
        </div>
      </div>

      {/* Orders List */}
      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 animate-slide-up">
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-22rem)]">
            <div className="divide-y divide-gray-800/50">
              {filteredOrders.map(order => (
                <div key={order.id} className="p-4 hover:bg-gray-800/20 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-base font-bold text-white font-heading">{order.orderNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-quicksand uppercase ${statusColors[order.status]}`}>
                        {order.status}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700/30 text-gray-400 capitalize">{order.orderType.replace('_', ' ')}</span>
                      {order.paymentMethod === 'pending' && !['cancelled', 'completed'].includes(order.status) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium flex items-center gap-1">
                          <AlertCircle className="h-2.5 w-2.5" /> Unpaid
                        </span>
                      )}
                      {order.orderSource === 'customer' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cuephoria-purple/20 text-cuephoria-lightpurple">Self-order</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-orange-400"><CurrencyDisplay amount={order.total} /></span>
                      <button onClick={() => handlePrintOrder(order.id)} className="p-1.5 rounded-md hover:bg-gray-700/50" title="Print">
                        <Printer className="h-4 w-4 text-gray-500" />
                      </button>
                      <button onClick={() => handleViewDetails(order.id)} className="p-1.5 rounded-md hover:bg-gray-700/50" title="Details">
                        <Eye className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 font-quicksand">
                    {order.customerName && <span>{order.customerName}</span>}
                    {order.customerPhone && <span>{order.customerPhone}</span>}
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(order.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                    <span className="capitalize">{order.paymentMethod}</span>
                    {order.discount > 0 && <span className="text-green-400">-<CurrencyDisplay amount={order.discount} /> disc</span>}
                  </div>
                  {!['completed', 'cancelled'].includes(order.status) && (
                    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {order.status === 'pending' && (
                        <Button size="sm" onClick={() => { updateOrderStatus(order.id, 'confirmed'); toast.success('Order confirmed'); }}
                          className="h-7 text-[10px] bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Confirm
                        </Button>
                      )}
                      {order.paymentMethod === 'pending' && (
                        <Button size="sm" onClick={() => {
                          setPaymentDialog(order.id);
                          setSelectedPayment('cash');
                        }}
                          className="h-7 text-[10px] bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-0">
                          <Banknote className="h-3 w-3 mr-1" /> Settle Payment
                        </Button>
                      )}
                      {['confirmed', 'ready', 'served'].includes(order.status) && (
                        <Button size="sm" onClick={() => handleCompleteOrder(order.id)}
                          className="h-7 text-[10px] bg-green-500/20 text-green-400 hover:bg-green-500/30 border-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                        </Button>
                      )}
                      <Button size="sm" onClick={() => { cancelOrder(order.id); toast.success('Order cancelled'); }}
                        className="h-7 text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0">
                        <XCircle className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {filteredOrders.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="font-quicksand">No orders found</p>
                  <p className="text-xs text-gray-600 font-quicksand mt-1">Try changing the date or filter</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrderId} onOpenChange={() => setDetailOrderId(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
          <DialogHeader><DialogTitle className="text-white font-heading">Order {detailOrder?.orderNumber}</DialogTitle></DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              {/* Order Timeline */}
              {detailOrder.status !== 'cancelled' && (
                <div className="flex items-center gap-0 px-2">
                  {statusTimeline.map((step, i) => {
                    const isActive = step.key === detailOrder.status;
                    const isCompleted = i < detailStatusIndex || detailOrder.status === 'completed';
                    return (
                      <React.Fragment key={step.key}>
                        {i > 0 && (
                          <div className={`flex-1 h-0.5 ${isCompleted || i <= detailStatusIndex ? 'bg-green-500' : 'bg-gray-700'}`} />
                        )}
                        <div className="flex flex-col items-center" title={step.label}>
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${
                            isCompleted ? 'bg-green-500 text-white'
                            : isActive ? 'bg-orange-500 text-white ring-2 ring-orange-500/30'
                            : 'bg-gray-800 text-gray-600 border border-gray-700'
                          }`}>
                            <step.icon className="h-3 w-3" />
                          </div>
                          <span className={`text-[8px] mt-0.5 font-quicksand ${isActive ? 'text-orange-400' : isCompleted ? 'text-green-400' : 'text-gray-600'}`}>
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

              <div className="flex flex-wrap gap-2 text-xs text-gray-400 font-quicksand">
                <span className={`px-2 py-0.5 rounded-full ${statusColors[detailOrder.status]}`}>{detailOrder.status}</span>
                <span className="capitalize">{detailOrder.orderType.replace('_', ' ')}</span>
                <span>{new Date(detailOrder.createdAt).toLocaleString('en-IN')}</span>
                {detailOrder.completedAt && <span>Completed: {new Date(detailOrder.completedAt).toLocaleTimeString('en-IN')}</span>}
              </div>
              {(detailOrder.customerName || detailOrder.customerPhone) && (
                <div className="text-sm text-gray-300 font-quicksand">
                  {detailOrder.customerName && <span>{detailOrder.customerName}</span>}
                  {detailOrder.customerPhone && <span className="ml-2 text-gray-500">{detailOrder.customerPhone}</span>}
                </div>
              )}
              {detailOrder.notes && (
                <p className="text-xs text-yellow-400 font-quicksand italic bg-yellow-500/5 px-3 py-1.5 rounded-lg">Notes: {detailOrder.notes}</p>
              )}
              <div className="space-y-1">
                {detailItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-gray-800/30 rounded-lg">
                    <div>
                      <span className="text-sm text-white font-quicksand">{item.quantity}x {item.itemName}</span>
                      {item.notes && <p className="text-[10px] text-yellow-400 italic">"{item.notes}"</p>}
                    </div>
                    <span className="text-sm text-orange-400"><CurrencyDisplay amount={item.total} /></span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-700/30 pt-2 space-y-1 text-sm">
                <div className="flex justify-between text-gray-400"><span>Subtotal</span><CurrencyDisplay amount={detailOrder.subtotal} /></div>
                {detailOrder.discount > 0 && <div className="flex justify-between text-green-400"><span>Discount</span>-<CurrencyDisplay amount={detailOrder.discount} /></div>}
                <div className="flex justify-between text-white font-bold text-base"><span>Total</span><CurrencyDisplay amount={detailOrder.total} /></div>
                <div className="flex justify-between text-xs text-gray-500"><span>Payment</span><span className="capitalize">{detailOrder.paymentMethod}</span></div>
                {detailOrder.cashAmount && <div className="flex justify-between text-xs text-gray-500"><span>Cash</span><CurrencyDisplay amount={detailOrder.cashAmount} /></div>}
                {detailOrder.upiAmount && <div className="flex justify-between text-xs text-gray-500"><span>UPI</span><CurrencyDisplay amount={detailOrder.upiAmount} /></div>}
                <div className="flex justify-between text-orange-400 text-xs"><span>Partner ({detailOrder.partnerRateSnapshot}%)</span><CurrencyDisplay amount={detailOrder.partnerShare} /></div>
                <div className="flex justify-between text-cuephoria-lightpurple text-xs"><span>Cuephoria ({detailOrder.cuephoriaRateSnapshot}%)</span><CurrencyDisplay amount={detailOrder.cuephoriaShare} /></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-heading flex items-center gap-2">
              <Banknote className="h-5 w-5 text-amber-400" /> Settle Payment
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const pOrder = orders.find(o => o.id === paymentDialog);
            if (!pOrder) return null;
            return (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50 border border-gray-700/30">
                  <div>
                    <span className="text-sm font-bold text-white font-heading">#{pOrder.orderNumber}</span>
                    {pOrder.customerName && <span className="text-xs text-gray-400 ml-2">{pOrder.customerName}</span>}
                  </div>
                  <span className="text-lg font-bold text-orange-400"><CurrencyDisplay amount={pOrder.total} /></span>
                </div>
                <div className="flex gap-2">
                  {([
                    { method: 'cash' as const, label: 'Cash', icon: Banknote },
                    { method: 'upi' as const, label: 'UPI', icon: CreditCard },
                    { method: 'split' as const, label: 'Split', icon: SplitSquareHorizontal },
                  ]).map(p => (
                    <button key={p.method} onClick={() => setSelectedPayment(p.method)}
                      className={`flex-1 py-4 rounded-xl flex flex-col items-center gap-2 text-sm font-quicksand transition-all ${
                        selectedPayment === p.method ? 'bg-orange-500/20 border-2 border-orange-500 text-orange-400' : 'bg-gray-800/50 border-2 border-gray-700/30 text-gray-400'
                      }`}>
                      <p.icon className="h-6 w-6" /> {p.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => handlePayAndComplete(false)} variant="outline"
                    className="h-10 text-sm font-quicksand border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                    <Banknote className="mr-1.5 h-4 w-4" /> Settle Only
                  </Button>
                  <Button onClick={() => handlePayAndComplete(true)} className="h-10 text-sm text-white font-quicksand border-0"
                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Settle & Complete
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CafeOrders;
