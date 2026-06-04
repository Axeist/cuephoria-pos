import { useCallback, useEffect, useRef, useState } from 'react';
import { CartItem } from '@/types/pos.types';
import {
  deleteAllSavedCarts,
  deleteSavedCart,
  fetchSavedCartsForLocation,
  getSavedCart,
  SavedCartRecord,
  toSavedCartSummary,
  upsertSavedCart,
} from '@/services/savedCartsService';
import type { SavedCartSummary } from '@/types/pos.types';
import { supabase } from '@/integrations/supabase/client';

export function useSavedCarts(locationId: string | null) {
  const [savedCarts, setSavedCarts] = useState<SavedCartSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshSavedCarts = useCallback(async () => {
    if (!locationId) {
      setSavedCarts([]);
      return;
    }

    setLoading(true);
    try {
      const records = await fetchSavedCartsForLocation(locationId);
      setSavedCarts(records.map(toSavedCartSummary));
    } catch (error) {
      console.error('refreshSavedCarts failed:', error);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    void refreshSavedCarts();
  }, [refreshSavedCarts]);

  useEffect(() => {
    if (!locationId) return;

    const channel = supabase
      .channel(`saved_carts:${locationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_carts',
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          void refreshSavedCarts();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [locationId, refreshSavedCarts]);

  const persistSavedCart = useCallback(
    async (
      customerId: string,
      customerName: string,
      items: CartItem[],
      discount: number,
      discountType: 'percentage' | 'fixed',
      loyaltyPointsUsed: number
    ) => {
      if (!locationId || items.length === 0) return null;

      const record = await upsertSavedCart({
        locationId,
        customerId,
        customerName,
        items,
        discount,
        discountType,
        loyaltyPointsUsed,
      });

      await refreshSavedCarts();
      return record;
    },
    [locationId, refreshSavedCarts]
  );

  const schedulePersistSavedCart = useCallback(
    (
      customerId: string,
      customerName: string,
      items: CartItem[],
      discount: number,
      discountType: 'percentage' | 'fixed',
      loyaltyPointsUsed: number
    ) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        void persistSavedCart(
          customerId,
          customerName,
          items,
          discount,
          discountType,
          loyaltyPointsUsed
        );
      }, 800);
    },
    [persistSavedCart]
  );

  const loadSavedCartForCustomer = useCallback(
    async (customerId: string): Promise<SavedCartRecord | null> => {
      if (!locationId) return null;
      return getSavedCart(locationId, customerId);
    },
    [locationId]
  );

  const removeSavedCart = useCallback(
    async (customerId: string) => {
      if (!locationId) return;
      await deleteSavedCart(locationId, customerId);
      await refreshSavedCarts();
    },
    [locationId, refreshSavedCarts]
  );

  const removeAllSavedCarts = useCallback(async () => {
    if (!locationId) return 0;
    const count = await deleteAllSavedCarts(locationId);
    await refreshSavedCarts();
    return count;
  }, [locationId, refreshSavedCarts]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    savedCarts,
    loading,
    refreshSavedCarts,
    persistSavedCart,
    schedulePersistSavedCart,
    loadSavedCartForCustomer,
    removeSavedCart,
    removeAllSavedCarts,
  };
}
