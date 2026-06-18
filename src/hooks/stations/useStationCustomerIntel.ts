import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CustomerRecentSession = {
  id: string;
  stationName: string;
  stationType: string;
  durationMinutes: number;
  endedAt: Date;
};

type IntelMap = Record<string, CustomerRecentSession[]>;

/**
 * Loads recent completed sessions for customers currently on stations.
 */
export function useStationCustomerIntel(customerIds: string[]) {
  const [intel, setIntel] = useState<IntelMap>({});
  const [loading, setLoading] = useState(false);

  const key = useMemo(
    () => [...new Set(customerIds.filter(Boolean))].sort().join(','),
    [customerIds]
  );

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (ids.length === 0) {
      setIntel({});
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('id, customer_id, duration, end_time, stations(name, type)')
          .in('customer_id', ids)
          .eq('status', 'completed')
          .not('end_time', 'is', null)
          .order('end_time', { ascending: false })
          .limit(Math.min(ids.length * 5, 40));

        if (error) throw error;
        if (cancelled) return;

        const grouped: IntelMap = {};
        for (const row of data ?? []) {
          const cid = row.customer_id;
          if (!cid) continue;
          if (!grouped[cid]) grouped[cid] = [];
          if (grouped[cid].length >= 3) continue;

          const station = row.stations as { name?: string; type?: string } | null;
          grouped[cid].push({
            id: row.id,
            stationName: station?.name ?? 'Station',
            stationType: station?.type ?? '',
            durationMinutes: row.duration ?? 0,
            endedAt: new Date(row.end_time!),
          });
        }
        setIntel(grouped);
      } catch {
        if (!cancelled) setIntel({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { intel, loading };
}
