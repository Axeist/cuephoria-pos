import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CafePartner, CafePartnerRow } from '@/types/cafe.types';
import { transformPartnerRow } from '@/types/cafe.types';

export function useCafePartner(locationId?: string) {
  const [partner, setPartner] = useState<CafePartner | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPartner = useCallback(async () => {
    if (!locationId) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('cafe_partners')
        .select('*')
        .eq('location_id', locationId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setPartner(data ? transformPartnerRow(data as unknown as CafePartnerRow) : null);
    } catch (err) {
      console.error('Error fetching cafe partner:', err);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => { fetchPartner(); }, [fetchPartner]);

  const updateRates = useCallback(async (partnerRate: number, cuephoriaRate: number) => {
    if (!partner) return false;
    try {
      const { error } = await supabase
        .from('cafe_partners')
        .update({ partner_rate: partnerRate, cuephoria_rate: cuephoriaRate })
        .eq('id', partner.id);
      if (error) throw error;
      setPartner(prev => prev ? { ...prev, partnerRate, cuephoriaRate } : null);
      return true;
    } catch (err) {
      console.error('Error updating rates:', err);
      return false;
    }
  }, [partner]);

  const updatePartner = useCallback(async (updates: Partial<Pick<CafePartner, 'name' | 'contactName' | 'contactPhone' | 'contactEmail'>>) => {
    if (!partner) return false;
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.contactName !== undefined) dbUpdates.contact_name = updates.contactName;
      if (updates.contactPhone !== undefined) dbUpdates.contact_phone = updates.contactPhone;
      if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
      const { error } = await supabase.from('cafe_partners').update(dbUpdates).eq('id', partner.id);
      if (error) throw error;
      setPartner(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (err) {
      console.error('Error updating partner:', err);
      return false;
    }
  }, [partner]);

  return { partner, loading, fetchPartner, updateRates, updatePartner };
}
