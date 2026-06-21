import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from '@/context/LocationContext';
import type { Customer } from '@/types/pos.types';

const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

function mapCustomerRow(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    phone: String(row.phone ?? ''),
    email: (row.email as string) || undefined,
    customerId:
      (row.customer_id as string) ||
      (row.custom_id as string) ||
      `CUE${normalizePhone(String(row.phone ?? '')).slice(-4)}`,
    isMember: Boolean(row.membership_tier_id) || Boolean(row.is_member),
    membershipTierId: (row.membership_tier_id as string) || undefined,
    cardBalance: Number(row.card_balance ?? 0),
    loyaltyPoints: Number(row.loyalty_points ?? 0),
    totalSpent: Number(row.total_spent ?? 0),
    totalPlayTime: Number(row.total_play_time ?? 0),
    createdAt: new Date((row.created_at as string) || Date.now()),
    membershipPlan: (row.membership_plan as string) || undefined,
    membershipStartDate: row.membership_start_date
      ? new Date(row.membership_start_date as string)
      : undefined,
    membershipExpiryDate: row.membership_expiry_date
      ? new Date(row.membership_expiry_date as string)
      : undefined,
    membershipHoursLeft: (row.membership_hours_left as number) || undefined,
    membershipDuration: row.membership_duration as 'weekly' | 'monthly' | undefined,
  };
}

function filterLocalCustomers(customers: Customer[], query: string): Customer[] {
  const q = query.toLowerCase();
  const qDigits = normalizePhone(query);
  return customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(q) ||
      normalizePhone(customer.phone).includes(qDigits) ||
      (customer.customerId?.toLowerCase().includes(q) ?? false) ||
      (customer.email?.toLowerCase().includes(q) ?? false),
  );
}

function mergeCustomersById(...lists: Customer[][]): Customer[] {
  const byId = new Map<string, Customer>();
  for (const list of lists) {
    for (const customer of list) {
      byId.set(customer.id, customer);
    }
  }
  return Array.from(byId.values());
}

export function usePosCustomerPickerSearch(
  customers: Customer[],
  isOpen: boolean,
) {
  const { activeLocationId } = useLocation();
  const [query, setQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setRemoteResults([]);
      setIsSearching(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !activeLocationId || trimmedQuery.length < 2) {
      setRemoteResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const runSearch = async () => {
      const q = trimmedQuery.toLowerCase();
      const phoneDigits = normalizePhone(trimmedQuery);
      const searchPattern = `%${q}%`;
      const phonePattern = phoneDigits ? `%${phoneDigits}%` : '';

      try {
        const queryBuilders = [
          supabase
            .from('customers')
            .select('*')
            .ilike('name', searchPattern)
            .eq('location_id', activeLocationId)
            .limit(60),
          phoneDigits
            ? supabase
                .from('customers')
                .select('*')
                .ilike('phone', phonePattern)
                .eq('location_id', activeLocationId)
                .limit(60)
            : null,
          supabase
            .from('customers')
            .select('*')
            .ilike('email', searchPattern)
            .eq('location_id', activeLocationId)
            .limit(60),
          supabase
            .from('customers')
            .select('*')
            .ilike('custom_id', searchPattern)
            .eq('location_id', activeLocationId)
            .limit(60),
        ].filter((q): q is Exclude<typeof q, null> => q != null);

        const results = await Promise.all(queryBuilders);
        if (cancelled) return;

        const rows: Record<string, unknown>[] = [];
        const seen = new Set<string>();
        for (const { data, error } of results) {
          if (error) {
            console.error('[POS] customer search error:', error);
            continue;
          }
          for (const row of data ?? []) {
            const id = String((row as Record<string, unknown>).id);
            if (!seen.has(id)) {
              seen.add(id);
              rows.push(row as Record<string, unknown>);
            }
          }
        }

        setRemoteResults(rows.map(mapCustomerRow));
      } catch (err) {
        if (!cancelled) {
          console.error('[POS] customer search failed:', err);
          setRemoteResults([]);
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    };

    const timer = window.setTimeout(() => {
      void runSearch();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmedQuery, isOpen, activeLocationId]);

  const pickerCustomers = useMemo(() => {
    if (!isOpen) return [];

    if (trimmedQuery.length < 2) {
      return customers.slice(0, 48);
    }

    const localMatches = filterLocalCustomers(customers, trimmedQuery);
    return mergeCustomersById(remoteResults, localMatches).slice(0, 60);
  }, [customers, isOpen, trimmedQuery, remoteResults]);

  return {
    customerSearchQuery: query,
    setCustomerSearchQuery: setQuery,
    trimmedCustomerQuery: trimmedQuery,
    pickerCustomers,
    isSearchingCustomers: isSearching,
  };
}
