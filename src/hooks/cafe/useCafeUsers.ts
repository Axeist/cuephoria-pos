import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CafeUser, CafeUserRow, CafeUserRole } from '@/types/cafe.types';
import { transformCafeUserRow } from '@/types/cafe.types';

export function useCafeUsers(locationId?: string) {
  const [users, setUsers] = useState<CafeUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!locationId) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('cafe_users')
        .select('id, location_id, partner_id, username, display_name, role, is_active, created_at')
        .eq('location_id', locationId)
        .order('created_at');
      if (!error && data) {
        setUsers(data.map(r => transformCafeUserRow(r as unknown as CafeUserRow)));
      }
    } catch (err) {
      console.error('Error fetching cafe users:', err);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const addUser = useCallback(async (user: {
    partnerId: string; username: string; password: string;
    displayName?: string; role: CafeUserRole;
  }) => {
    if (!locationId) return null;
    const { data, error } = await supabase.from('cafe_users').insert({
      location_id: locationId,
      partner_id: user.partnerId,
      username: user.username,
      password: user.password,
      display_name: user.displayName || null,
      role: user.role,
    }).select('id, location_id, partner_id, username, display_name, role, is_active, created_at').single();
    if (error) { console.error(error); return null; }
    const newUser = transformCafeUserRow(data as unknown as CafeUserRow);
    setUsers(prev => [...prev, newUser]);
    return newUser;
  }, [locationId]);

  const updateUser = useCallback(async (id: string, updates: Partial<{
    displayName: string; role: CafeUserRole; isActive: boolean; password: string;
  }>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.password !== undefined) dbUpdates.password = updates.password;
    const { error } = await supabase.from('cafe_users').update(dbUpdates).eq('id', id);
    if (error) { console.error(error); return false; }
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    return true;
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    const { error } = await supabase.from('cafe_users').delete().eq('id', id);
    if (error) { console.error(error); return false; }
    setUsers(prev => prev.filter(u => u.id !== id));
    return true;
  }, []);

  return { users, loading, fetchUsers, addUser, updateUser, deleteUser };
}
