import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CafeKOT, CafeKOTRow, KOTStatus, CafeCartItem } from '@/types/cafe.types';
import { transformKOTRow } from '@/types/cafe.types';
import { RealtimeChannel } from '@supabase/supabase-js';

const KOT_ALERT_SOUND_URL = '/notification.mp3';

function enrichKot(r: any): CafeKOT {
  const kot = transformKOTRow(r as unknown as CafeKOTRow);
  const orderData = (r as any).cafe_orders;
  if (orderData) {
    (kot as any).orderSource = orderData.order_source;
    (kot as any).customerName = orderData.customer_name;
    (kot as any).orderType = orderData.order_type;
  }
  return kot;
}

export function useCafeKOT(locationId?: string) {
  const [kots, setKots] = useState<CafeKOT[]>([]);
  const [completedKots, setCompletedKots] = useState<CafeKOT[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const seenKotIds = useRef(new Set<string>());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastDisconnect = useRef<number>(0);

  const fetchKOTs = useCallback(async (silent = false) => {
    if (!locationId) { if (!silent) setLoading(false); return; }
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cafe_kot')
        .select('*, cafe_orders!inner(order_source, customer_name, order_type)')
        .eq('location_id', locationId)
        .in('status', ['pending', 'acknowledged', 'preparing', 'ready', 'served'])
        .order('created_at', { ascending: true });
      if (!error && data) {
        const transformed = data.map(enrichKot);
        transformed.forEach(k => seenKotIds.current.add(k.id));
        setKots(transformed);
      }
    } catch (err) {
      console.error('Error fetching KOTs:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [locationId]);

  const fetchCompletedKOTs = useCallback(async (filters?: { dateFrom?: string; dateTo?: string; customerSearch?: string }) => {
    if (!locationId) return;
    setCompletedLoading(true);
    try {
      let q = supabase
        .from('cafe_kot')
        .select('*, cafe_orders!inner(order_source, customer_name, customer_phone, order_type)')
        .eq('location_id', locationId)
        .eq('status', 'served')
        .order('created_at', { ascending: false })
        .limit(100);
      if (filters?.dateFrom) q = q.gte('created_at', `${filters.dateFrom}T00:00:00`);
      if (filters?.dateTo) q = q.lte('created_at', `${filters.dateTo}T23:59:59`);
      if (filters?.customerSearch) {
        q = q.or(`customer_name.ilike.%${filters.customerSearch}%,customer_phone.ilike.%${filters.customerSearch}%`, { referencedTable: 'cafe_orders' });
      }
      const { data, error } = await q;
      if (!error && data) setCompletedKots(data.map(enrichKot));
    } catch (err) {
      console.error('Error fetching completed KOTs:', err);
    } finally {
      setCompletedLoading(false);
    }
  }, [locationId]);

  useEffect(() => { fetchKOTs(); }, [fetchKOTs]);

  const playAlert = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(KOT_ALERT_SOUND_URL);
        audioRef.current.volume = 0.7;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {}
  }, []);

  // Realtime with connection monitoring + visibility change + keepalive
  useEffect(() => {
    if (!locationId) return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let keepaliveRef: ReturnType<typeof setInterval> | null = null;
    let channelRef: RealtimeChannel | null = null;

    const setupChannel = () => {
      if (channelRef) supabase.removeChannel(channelRef);

      channelRef = supabase
        .channel(`cafe-kot-${locationId}-${Date.now()}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'cafe_kot',
          filter: `location_id=eq.${locationId}`,
        }, (payload) => {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => {
            fetchKOTs(true);
            if (payload.eventType === 'INSERT' && payload.new) {
              const newId = (payload.new as any).id;
              if (!seenKotIds.current.has(newId)) {
                seenKotIds.current.add(newId);
                playAlert();
              }
            }
          }, 300);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnected(true);
            if (heartbeatRef.current) {
              clearInterval(heartbeatRef.current);
              heartbeatRef.current = null;
            }
            if (lastDisconnect.current > 0) {
              fetchKOTs(true);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnected(false);
            lastDisconnect.current = Date.now();
            if (!heartbeatRef.current) {
              heartbeatRef.current = setInterval(() => fetchKOTs(true), 5000);
            }
            setTimeout(() => setupChannel(), 3000);
          }
        });
    };

    setupChannel();

    // Keepalive: poll every 30s even when connected to catch silent disconnects
    keepaliveRef = setInterval(() => fetchKOTs(true), 30000);

    // Visibility change: refetch + reconnect when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchKOTs(true);
        if (channelRef) {
          const state = (channelRef as any).state;
          if (state !== 'joined' && state !== 'joining') {
            setupChannel();
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Online/offline events
    const handleOnline = () => { fetchKOTs(true); setupChannel(); };
    window.addEventListener('online', handleOnline);

    return () => {
      if (debounce) clearTimeout(debounce);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (keepaliveRef) clearInterval(keepaliveRef);
      if (channelRef) supabase.removeChannel(channelRef);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [locationId, fetchKOTs, playAlert]);

  const generateKOT = useCallback(async (orderId: string, items: CafeCartItem[], createdBy?: string) => {
    if (!locationId) return null;
    try {
      // Get next KOT number atomically
      const { data: kotNumData, error: kotNumErr } = await supabase
        .rpc('next_cafe_kot_number', { p_location_id: locationId });
      if (kotNumErr) throw kotNumErr;

      const kotItems = items.map(i => ({
        item_id: i.menuItemId,
        name: i.name,
        qty: i.quantity,
        notes: i.notes || undefined,
      }));

      const { data, error } = await supabase
        .from('cafe_kot')
        .insert({
          order_id: orderId,
          location_id: locationId,
          kot_number: kotNumData as string,
          status: 'pending',
          items: kotItems,
          created_by: createdBy || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update order items to sent_to_kitchen
      const itemIds = items.map(i => i.menuItemId);
      await supabase
        .from('cafe_order_items')
        .update({ kot_status: 'sent_to_kitchen' })
        .eq('order_id', orderId)
        .in('menu_item_id', itemIds)
        .eq('kot_status', 'pending');

      const kot = transformKOTRow(data as unknown as CafeKOTRow);
      setKots(prev => [...prev, kot]);
      return kot;
    } catch (err) {
      console.error('Error generating KOT:', err);
      return null;
    }
  }, [locationId]);

  const updateKOTStatus = useCallback(async (kotId: string, status: KOTStatus) => {
    const updates: Record<string, unknown> = { status };
    if (status === 'acknowledged') updates.acknowledged_at = new Date().toISOString();
    if (status === 'ready') updates.ready_at = new Date().toISOString();
    if (status === 'served') updates.served_at = new Date().toISOString();

    const { error } = await supabase
      .from('cafe_kot')
      .update(updates)
      .eq('id', kotId);
    if (error) { console.error(error); return false; }
    setKots(prev => prev.map(k => k.id === kotId ? { ...k, status } : k));

    // Update order items status based on KOT
    const kot = kots.find(k => k.id === kotId);
    if (kot) {
      const itemStatuses: Record<KOTStatus, string> = {
        pending: 'pending',
        acknowledged: 'sent_to_kitchen',
        preparing: 'preparing',
        ready: 'ready',
        served: 'served',
        cancelled: 'cancelled',
      };
      const itemIds = kot.items.map(i => i.item_id);
      await supabase
        .from('cafe_order_items')
        .update({ kot_status: itemStatuses[status] || status })
        .eq('order_id', kot.orderId)
        .in('menu_item_id', itemIds);
    }

    return true;
  }, [kots]);

  const pendingKots = kots.filter(k => k.status === 'pending');
  const preparingKots = kots.filter(k => k.status === 'acknowledged' || k.status === 'preparing');
  const readyKots = kots.filter(k => k.status === 'ready');
  const servedKots = kots.filter(k => k.status === 'served');

  return {
    kots, pendingKots, preparingKots, readyKots, servedKots,
    completedKots, completedLoading, fetchCompletedKOTs,
    loading, connected, fetchKOTs,
    generateKOT, updateKOTStatus,
  };
}
