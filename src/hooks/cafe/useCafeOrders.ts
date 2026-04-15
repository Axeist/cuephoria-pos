import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  CafeOrder, CafeOrderRow, CafeOrderItem, CafeOrderItemRow,
  CafeCartItem, CafeOrderType, CafeOrderSource, CafePaymentMethod, CafeOrderStatus,
} from '@/types/cafe.types';
import { transformOrderRow, transformOrderItemRow } from '@/types/cafe.types';
import { RealtimeChannel } from '@supabase/supabase-js';

interface CreateOrderParams {
  locationId: string;
  partnerId: string;
  partnerRate: number;
  cuephoriaRate: number;
  orderType: CafeOrderType;
  orderSource: CafeOrderSource;
  cafeTableId?: string | null;
  stationId?: string | null;
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string;
  items: CafeCartItem[];
  discount?: number;
  paymentMethod?: CafePaymentMethod;
  cashAmount?: number;
  upiAmount?: number;
  notes?: string;
  createdBy?: string | null;
}

export function useCafeOrders(locationId?: string) {
  const [orders, setOrders] = useState<CafeOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async (opts?: { limit?: number; status?: CafeOrderStatus[]; silent?: boolean }) => {
    if (!locationId) { setLoading(false); return; }
    if (!opts?.silent) setLoading(true);
    try {
      let query = supabase
        .from('cafe_orders')
        .select('*, cafe_order_items(*)')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false })
        .limit(opts?.limit || 500);

      if (opts?.status && opts.status.length > 0) {
        query = query.in('status', opts.status);
      }

      const { data, error } = await query;
      if (!error && data) {
        setOrders(data.map(r => {
          const order = transformOrderRow(r as unknown as CafeOrderRow);
          const rawItems = (r as any).cafe_order_items;
          if (Array.isArray(rawItems) && rawItems.length > 0) {
            order.items = rawItems.map((ri: any) => transformOrderItemRow(ri as CafeOrderItemRow));
          }
          return order;
        }));
      }
    } catch (err) {
      console.error('Error fetching cafe orders:', err);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [locationId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Realtime for order status changes with reconnect
  useEffect(() => {
    if (!locationId) return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let channelRef: RealtimeChannel | null = null;
    let keepalive: ReturnType<typeof setInterval> | null = null;

    const setup = () => {
      if (channelRef) supabase.removeChannel(channelRef);
      channelRef = supabase
        .channel(`cafe-orders-${locationId}-${Date.now()}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'cafe_orders',
          filter: `location_id=eq.${locationId}`,
        }, () => {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => fetchOrders({ silent: true }), 300);
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setTimeout(() => setup(), 3000);
          }
        });
    };

    setup();
    keepalive = setInterval(() => fetchOrders({ silent: true }), 30000);

    const onVisible = () => { if (document.visibilityState === 'visible') fetchOrders({ silent: true }); };
    document.addEventListener('visibilitychange', onVisible);
    const onOnline = () => { fetchOrders({ silent: true }); setup(); };
    window.addEventListener('online', onOnline);

    return () => {
      if (debounce) clearTimeout(debounce);
      if (keepalive) clearInterval(keepalive);
      if (channelRef) supabase.removeChannel(channelRef);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [locationId, fetchOrders]);

  const fetchOrderItems = useCallback(async (orderId: string): Promise<CafeOrderItem[]> => {
    const { data, error } = await supabase
      .from('cafe_order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at');
    if (error) { console.error(error); return []; }
    return (data || []).map(r => transformOrderItemRow(r as unknown as CafeOrderItemRow));
  }, []);

  const createOrder = useCallback(async (params: CreateOrderParams): Promise<CafeOrder | null> => {
    try {
      // Re-fetch menu item prices from DB (server-side price validation)
      const menuItemIds = params.items.map(i => i.menuItemId);
      const { data: dbItems, error: menuErr } = await supabase
        .from('cafe_menu_items')
        .select('id, price, is_available')
        .in('id', menuItemIds);

      if (menuErr) throw menuErr;

      const priceMap = new Map((dbItems || []).map(i => [i.id, { price: Number(i.price), available: i.is_available }]));

      // Validate availability
      for (const item of params.items) {
        const dbItem = priceMap.get(item.menuItemId);
        if (!dbItem || !dbItem.available) {
          throw new Error(`${item.name} is no longer available`);
        }
      }

      // Calculate totals with DB prices
      const subtotal = params.items.reduce((sum, item) => {
        const dbPrice = priceMap.get(item.menuItemId)?.price ?? item.price;
        return sum + (dbPrice * item.quantity);
      }, 0);
      const discount = params.discount || 0;
      const total = Math.max(0, subtotal - discount);
      const partnerShare = Number(((total * params.partnerRate) / 100).toFixed(2));
      const cuephoriaShare = Number((total - partnerShare).toFixed(2));

      // Insert order
      const { data: orderData, error: orderErr } = await supabase
        .from('cafe_orders')
        .insert({
          location_id: params.locationId,
          partner_id: params.partnerId,
          order_type: params.orderType,
          order_source: params.orderSource,
          cafe_table_id: params.cafeTableId || null,
          station_id: params.stationId || null,
          customer_id: params.customerId || null,
          customer_name: params.customerName || null,
          customer_phone: params.customerPhone || null,
          subtotal, discount, total,
          partner_rate_snapshot: params.partnerRate,
          cuephoria_rate_snapshot: params.cuephoriaRate,
          partner_share: partnerShare,
          cuephoria_share: cuephoriaShare,
          payment_method: params.paymentMethod || 'pending',
          cash_amount: params.cashAmount || null,
          upi_amount: params.upiAmount || null,
          status: params.orderSource === 'customer' ? 'pending' : 'confirmed',
          notes: params.notes || null,
          created_by: params.createdBy || null,
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // Insert order items with DB prices
      const orderItems = params.items.map(item => {
        const dbPrice = priceMap.get(item.menuItemId)?.price ?? item.price;
        return {
          order_id: orderData.id,
          menu_item_id: item.menuItemId,
          item_name: item.name,
          quantity: item.quantity,
          unit_price: dbPrice,
          total: dbPrice * item.quantity,
          notes: item.notes || null,
          kot_status: 'pending' as const,
        };
      });

      const { error: itemsErr } = await supabase
        .from('cafe_order_items')
        .insert(orderItems);

      if (itemsErr) {
        // Rollback order
        await supabase.from('cafe_orders').delete().eq('id', orderData.id);
        throw itemsErr;
      }

      // Update customer total_spent atomically if linked
      if (params.customerId && total > 0 && params.paymentMethod !== 'complimentary') {
        try {
          await supabase.rpc('increment_customer_total_spent', {
            p_customer_id: params.customerId,
            p_amount: total,
          });
        } catch (err) { console.error('Failed to update customer spend:', err); }
      }

      const order = transformOrderRow(orderData as unknown as CafeOrderRow);
      setOrders(prev => [order, ...prev]);
      return order;
    } catch (err) {
      console.error('Error creating cafe order:', err);
      throw err;
    }
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, status: CafeOrderStatus, paymentMethod?: CafePaymentMethod, cashAmount?: number, upiAmount?: number) => {
    const updates: Record<string, unknown> = { status };
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    if (paymentMethod) updates.payment_method = paymentMethod;
    if (cashAmount !== undefined) updates.cash_amount = cashAmount;
    if (upiAmount !== undefined) updates.upi_amount = upiAmount;

    const { error } = await supabase
      .from('cafe_orders')
      .update(updates)
      .eq('id', orderId);
    if (error) { console.error(error); return false; }
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o, status,
      ...(status === 'completed' ? { completedAt: new Date() } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(cashAmount !== undefined ? { cashAmount } : {}),
      ...(upiAmount !== undefined ? { upiAmount } : {}),
    } : o));
    return true;
  }, []);

  const cancelOrder = useCallback(async (orderId: string) => {
    return updateOrderStatus(orderId, 'cancelled');
  }, [updateOrderStatus]);

  // Active orders (not completed/cancelled)
  const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status));
  const todayOrders = orders.filter(o => {
    const d = new Date(o.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  return {
    orders, activeOrders, todayOrders, loading,
    fetchOrders, fetchOrderItems, createOrder, updateOrderStatus, cancelOrder,
  };
}
