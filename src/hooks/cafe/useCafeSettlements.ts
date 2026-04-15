import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CafeSettlement, CafeSettlementRow, SettlementStatus } from '@/types/cafe.types';
import { transformSettlementRow } from '@/types/cafe.types';

export function useCafeSettlements(locationId?: string, partnerId?: string) {
  const [settlements, setSettlements] = useState<CafeSettlement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettlements = useCallback(async () => {
    if (!locationId) { setLoading(false); return; }
    try {
      let query = supabase
        .from('cafe_settlements')
        .select('*')
        .eq('location_id', locationId)
        .order('settlement_date', { ascending: false })
        .limit(50);
      if (partnerId) query = query.eq('partner_id', partnerId);
      const { data, error } = await query;
      if (!error && data) {
        setSettlements(data.map(r => transformSettlementRow(r as unknown as CafeSettlementRow)));
      }
    } catch (err) {
      console.error('Error fetching settlements:', err);
    } finally {
      setLoading(false);
    }
  }, [locationId, partnerId]);

  useEffect(() => { fetchSettlements(); }, [fetchSettlements]);

  const generateSettlement = useCallback(async (date: string, pId: string) => {
    if (!locationId) return null;
    try {
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;

      const { data: orders, error } = await supabase
        .from('cafe_orders')
        .select('total, discount, partner_share, cuephoria_share')
        .eq('location_id', locationId)
        .eq('partner_id', pId)
        .eq('status', 'completed')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (error) throw error;

      const totalOrders = (orders || []).length;
      const grossRevenue = (orders || []).reduce((s, o) => s + Number(o.total), 0);
      const totalDiscount = (orders || []).reduce((s, o) => s + Number(o.discount), 0);
      const netRevenue = grossRevenue;
      const partnerPayout = (orders || []).reduce((s, o) => s + Number(o.partner_share), 0);
      const cuephoriaRevenue = (orders || []).reduce((s, o) => s + Number(o.cuephoria_share), 0);

      const { data: settlement, error: insertErr } = await supabase
        .from('cafe_settlements')
        .insert({
          location_id: locationId,
          partner_id: pId,
          settlement_date: date,
          period_start: startOfDay,
          period_end: endOfDay,
          total_orders: totalOrders,
          gross_revenue: grossRevenue,
          total_discount: totalDiscount,
          net_revenue: netRevenue,
          partner_payout: partnerPayout,
          cuephoria_revenue: cuephoriaRevenue,
          status: 'draft',
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      const s = transformSettlementRow(settlement as unknown as CafeSettlementRow);
      setSettlements(prev => [s, ...prev]);
      return s;
    } catch (err) {
      console.error('Error generating settlement:', err);
      return null;
    }
  }, [locationId]);

  const updateSettlementStatus = useCallback(async (id: string, status: SettlementStatus, confirmedBy?: string) => {
    const updates: Record<string, unknown> = { status };
    if (confirmedBy) updates.confirmed_by = confirmedBy;
    const { error } = await supabase.from('cafe_settlements').update(updates).eq('id', id);
    if (error) { console.error(error); return false; }
    setSettlements(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    return true;
  }, []);

  return { settlements, loading, fetchSettlements, generateSettlement, updateSettlementStatus };
}
