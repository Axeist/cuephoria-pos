import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Customer } from '@/types/pos.types';

const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

const generateCustomerID = (phone: string): string => {
  const normalized = normalizePhone(phone);
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const phoneHash = normalized.slice(-4);
  return `CUE${phoneHash}${timestamp}`;
};

function mapRow(row: any): Customer {
  return {
    id: row.id,
    customerId: row.custom_id || row.customer_id || undefined,
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
  };
}

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
      setCustomers((data || []).map(mapRow));
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const addCustomer = useCallback(async (input: {
    name: string;
    phone: string;
    email?: string;
  }): Promise<Customer | null> => {
    const phone = normalizePhone(input.phone);
    if (!input.name.trim() || phone.length < 10) return null;

    try {
      const { data: existing } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      if (existing) {
        const c = mapRow(existing);
        if (!customers.find(x => x.id === c.id)) {
          setCustomers(prev => [...prev, c]);
        }
        return c;
      }

      const customId = generateCustomerID(phone);
      const { data, error } = await supabase
        .from('customers')
        .insert({
          custom_id: customId,
          customer_id: customId,
          name: input.name.trim(),
          phone,
          email: input.email?.trim() || null,
          is_member: false,
          loyalty_points: 0,
          total_spent: 0,
          total_play_time: 0,
        })
        .select()
        .single();

      if (error) throw error;

      const newCustomer = mapRow(data);
      setCustomers(prev => [newCustomer, ...prev]);
      return newCustomer;
    } catch (err: any) {
      console.error('Error adding customer:', err);
      throw err;
    }
  }, [customers]);

  return { customers, loading, fetchCustomers, addCustomer };
}
