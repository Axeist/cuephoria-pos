import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CafeTable, CafeTableRow } from '@/types/cafe.types';
import { transformTableRow } from '@/types/cafe.types';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useCafeTables(locationId?: string) {
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTables = useCallback(async (silent = false) => {
    if (!locationId) { if (!silent) setLoading(false); return; }
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cafe_tables')
        .select('*')
        .eq('location_id', locationId)
        .eq('is_active', true)
        .order('zone')
        .order('sort_order');
      if (!error && data) {
        setTables(data.map(r => transformTableRow(r as unknown as CafeTableRow)));
      }
    } catch (err) {
      console.error('Error fetching cafe tables:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [locationId]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  // Realtime subscription for table status changes
  useEffect(() => {
    if (!locationId) return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const channel: RealtimeChannel = supabase
      .channel(`cafe-tables-${locationId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'cafe_tables',
        filter: `location_id=eq.${locationId}`,
      }, () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => fetchTables(true), 300);
      })
      .subscribe();
    return () => { if (debounce) clearTimeout(debounce); supabase.removeChannel(channel); };
  }, [locationId, fetchTables]);

  const zones = useMemo(() => {
    const zoneSet = new Set(tables.map(t => t.zone));
    return Array.from(zoneSet).sort();
  }, [tables]);

  const tablesByZone = useMemo(() => {
    const map: Record<string, CafeTable[]> = {};
    tables.forEach(t => {
      if (!map[t.zone]) map[t.zone] = [];
      map[t.zone].push(t);
    });
    return map;
  }, [tables]);

  // Atomic table assignment — returns false if table was already taken
  const assignTable = useCallback(async (tableId: string, orderId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('cafe_tables')
      .update({ is_occupied: true, current_order_id: orderId })
      .eq('id', tableId)
      .eq('is_occupied', false)
      .select('id');
    if (error) { console.error('Error assigning table:', error); return false; }
    if (!data || data.length === 0) return false;
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, isOccupied: true, currentOrderId: orderId } : t));
    return true;
  }, []);

  const releaseTable = useCallback(async (tableId: string) => {
    const { error } = await supabase
      .from('cafe_tables')
      .update({ is_occupied: false, current_order_id: null })
      .eq('id', tableId);
    if (error) { console.error('Error releasing table:', error); return false; }
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, isOccupied: false, currentOrderId: null } : t));
    return true;
  }, []);

  // Table CRUD
  const addTable = useCallback(async (table: { tableName: string; zone: string; capacity: number; partnerId: string }) => {
    if (!locationId) return null;
    const { data, error } = await supabase.from('cafe_tables').insert({
      location_id: locationId, partner_id: table.partnerId,
      table_name: table.tableName, zone: table.zone, capacity: table.capacity,
      sort_order: tables.filter(t => t.zone === table.zone).length,
    }).select().single();
    if (error) { console.error(error); return null; }
    const newTable = transformTableRow(data as unknown as CafeTableRow);
    setTables(prev => [...prev, newTable]);
    return newTable;
  }, [locationId, tables]);

  const updateTable = useCallback(async (id: string, updates: Partial<{ tableName: string; zone: string; capacity: number; isAvailable: boolean; sortOrder: number }>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.tableName !== undefined) dbUpdates.table_name = updates.tableName;
    if (updates.zone !== undefined) dbUpdates.zone = updates.zone;
    if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity;
    if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
    const { error } = await supabase.from('cafe_tables').update(dbUpdates).eq('id', id);
    if (error) { console.error(error); return false; }
    setTables(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    return true;
  }, []);

  // Soft delete
  const deleteTable = useCallback(async (id: string) => {
    const { error } = await supabase.from('cafe_tables').update({ is_active: false }).eq('id', id);
    if (error) { console.error(error); return false; }
    setTables(prev => prev.filter(t => t.id !== id));
    return true;
  }, []);

  // Stale table cleanup: release tables whose order is completed/cancelled
  const cleanupStaleTables = useCallback(async () => {
    const occupiedTables = tables.filter(t => t.isOccupied && t.currentOrderId);
    if (occupiedTables.length === 0) return;
    const orderIds = occupiedTables.map(t => t.currentOrderId!);
    const { data: orders } = await supabase
      .from('cafe_orders')
      .select('id, status')
      .in('id', orderIds);
    if (!orders) return;
    const completedOrderIds = new Set(
      orders.filter(o => o.status === 'completed' || o.status === 'cancelled').map(o => o.id)
    );
    for (const table of occupiedTables) {
      if (table.currentOrderId && completedOrderIds.has(table.currentOrderId)) {
        await releaseTable(table.id);
      }
    }
  }, [tables, releaseTable]);

  useEffect(() => {
    if (tables.length > 0) cleanupStaleTables();
  }, [tables.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    tables, zones, tablesByZone, loading, fetchTables,
    assignTable, releaseTable, addTable, updateTable, deleteTable,
  };
}
