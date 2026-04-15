import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeOrders } from '@/hooks/cafe/useCafeOrders';
import { CurrencyDisplay } from '@/components/ui/currency';
import type { CafeOrderStatus, CafeOrderItem, CafePaymentMethod } from '@/types/cafe.types';
import { ClipboardList, Search, Clock, CheckCircle2, XCircle, ChefHat, Eye, Banknote, CreditCard, SplitSquareHorizontal, X } from 'lucide-react';
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

const CafeOrders: React.FC = () => {
  const { user } = useCafeAuth();
  const { orders, fetchOrders, fetchOrderItems, updateOrderStatus, cancelOrder } = useCafeOrders(user?.locationId);
  const [filter, setFilter] = useState<'active' | 'all' | CafeOrderStatus>('active');
  const [search, setSearch] = useState('');
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailItems, setDetailItems] = useState<CafeOrderItem[]>([]);
  const [paymentDialog, setPaymentDialog] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<CafePaymentMethod>('cash');

  const filteredOrders = orders.filter(o => {
    if (filter === 'active') return !['completed', 'cancelled'].includes(o.status);
    if (filter !== 'all') return o.status === filter;
    return true;
  }).filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.orderNumber.toLowerCase().includes(q) || o.customerName?.toLowerCase().includes(q) || o.customerPhone?.includes(q);
  });

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

  const handlePayAndComplete = async () => {
    if (!paymentDialog) return;
    await updateOrderStatus(paymentDialog, 'completed', selectedPayment);
    setPaymentDialog(null);
    toast.success('Order completed');
  };

  const detailOrder = orders.find(o => o.id === detailOrderId);

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-4">
      <h1 className="text-2xl sm:text-3xl font-bold gradient-text font-heading animate-slide-down">Orders</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
          {(['active', 'all', 'pending', 'preparing', 'ready', 'completed', 'cancelled'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-quicksand capitalize ${filter === f ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500 hover:text-white'}`}>
              {f}
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
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <div className="divide-y divide-gray-800/50">
              {filteredOrders.map(order => (
                <div key={order.id} className="p-4 hover:bg-gray-800/20 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-white font-heading">{order.orderNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-quicksand uppercase ${statusColors[order.status]}`}>
                        {order.status}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700/30 text-gray-400 capitalize">{order.orderType.replace('_', ' ')}</span>
                      {order.orderSource === 'customer' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cuephoria-purple/20 text-cuephoria-lightpurple">Self-order</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-orange-400"><CurrencyDisplay amount={order.total} /></span>
                      <button onClick={() => handleViewDetails(order.id)} className="p-1.5 rounded-md hover:bg-gray-700/50"><Eye className="h-4 w-4 text-gray-400" /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 font-quicksand">
                    {order.customerName && <span>{order.customerName}</span>}
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="capitalize">{order.paymentMethod}</span>
                  </div>
                  {/* Quick Actions */}
                  {!['completed', 'cancelled'].includes(order.status) && (
                    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {order.status === 'pending' && (
                        <Button size="sm" onClick={() => { updateOrderStatus(order.id, 'confirmed'); toast.success('Order confirmed'); }}
                          className="h-7 text-[10px] bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Confirm
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
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrderId} onOpenChange={() => setDetailOrderId(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader><DialogTitle className="text-white font-heading">Order {detailOrder?.orderNumber}</DialogTitle></DialogHeader>
          {detailOrder && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs text-gray-400 font-quicksand">
                <span className={`px-2 py-0.5 rounded-full ${statusColors[detailOrder.status]}`}>{detailOrder.status}</span>
                <span>{detailOrder.orderType.replace('_', ' ')}</span>
                <span>{new Date(detailOrder.createdAt).toLocaleString('en-IN')}</span>
              </div>
              {detailOrder.customerName && <p className="text-sm text-gray-300 font-quicksand">Customer: {detailOrder.customerName}</p>}
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
                <div className="flex justify-between text-orange-400 text-xs"><span>Partner ({detailOrder.partnerRateSnapshot}%)</span><CurrencyDisplay amount={detailOrder.partnerShare} /></div>
                <div className="flex justify-between text-cuephoria-lightpurple text-xs"><span>Cuephoria ({detailOrder.cuephoriaRateSnapshot}%)</span><CurrencyDisplay amount={detailOrder.cuephoriaShare} /></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader><DialogTitle className="text-white font-heading">Select Payment Method</DialogTitle></DialogHeader>
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
          <Button onClick={handlePayAndComplete} className="w-full h-11 text-white font-quicksand border-0"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Complete Order
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CafeOrders;
