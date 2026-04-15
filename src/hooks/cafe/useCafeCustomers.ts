import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Customer } from '@/types/pos.types';

export function useCafeCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      setCustomers((data || []).map((row: any) => ({
        id: row.id,
        customerId: row.custom_id || undefined,
        name: row.name,
        phone: row.phone,
        email: row.email || undefined,
        isMember: row.is_member || false,
        membershipExpiryDate: row.membership_expiry_date ? new Date(row.membership_expiry_date) : undefined,
        membershipStartDate: row.membership_start_date ? new Date(row.membership_start_date) : undefined,
        membershipPlan: row.membership_plan || undefined,
        membershipHoursLeft: row.membership_hours_left || undefined,
        membershipDuration: row.membership_duration || undefined,
        loyaltyPoints: row.loyalty_points || 0,
        totalSpent: row.total_spent || 0,
        totalPlayTime: row.total_play_time || 0,
        createdAt: new Date(row.created_at),
      })));
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return { customers, loading, fetchCustomers };
}
