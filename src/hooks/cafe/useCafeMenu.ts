import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  CafeMenuCategory, CafeMenuCategoryRow,
  CafeMenuItem, CafeMenuItemRow,
} from '@/types/cafe.types';
import { transformMenuCategoryRow, transformMenuItemRow } from '@/types/cafe.types';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useCafeMenu(locationId?: string) {
  const [categories, setCategories] = useState<CafeMenuCategory[]>([]);
  const [items, setItems] = useState<CafeMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!locationId) return;
    const { data, error } = await supabase
      .from('cafe_menu_categories')
      .select('*')
      .eq('location_id', locationId)
      .order('sort_order');
    if (!error && data) {
      setCategories(data.map(r => transformMenuCategoryRow(r as unknown as CafeMenuCategoryRow)));
    }
  }, [locationId]);

  const fetchItems = useCallback(async () => {
    if (!locationId) return;
    const { data, error } = await supabase
      .from('cafe_menu_items')
      .select('*')
      .eq('location_id', locationId)
      .order('sort_order');
    if (!error && data) {
      setItems(data.map(r => transformMenuItemRow(r as unknown as CafeMenuItemRow)));
    }
  }, [locationId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCategories(), fetchItems()]);
    setLoading(false);
  }, [fetchCategories, fetchItems]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime for menu item availability changes
  useEffect(() => {
    if (!locationId) return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const channel: RealtimeChannel = supabase
      .channel(`cafe-menu-${locationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_menu_items', filter: `location_id=eq.${locationId}` }, () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => fetchItems(), 300);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_menu_categories', filter: `location_id=eq.${locationId}` }, () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => fetchCategories(), 300);
      })
      .subscribe();
    return () => { if (debounce) clearTimeout(debounce); supabase.removeChannel(channel); };
  }, [locationId, fetchItems, fetchCategories]);

  // Category CRUD
  const addCategory = useCallback(async (name: string, partnerId: string, opts?: { description?: string; imageUrl?: string }) => {
    if (!locationId) return null;
    const { data, error } = await supabase.from('cafe_menu_categories').insert({
      location_id: locationId, partner_id: partnerId, name,
      description: opts?.description || null, image_url: opts?.imageUrl || null,
      sort_order: categories.length,
    }).select().single();
    if (error) { console.error(error); return null; }
    const cat = transformMenuCategoryRow(data as unknown as CafeMenuCategoryRow);
    setCategories(prev => [...prev, cat]);
    return cat;
  }, [locationId, categories.length]);

  const updateCategory = useCallback(async (id: string, updates: Partial<{ name: string; description: string; imageUrl: string; isActive: boolean; sortOrder: number }>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
    const { error } = await supabase.from('cafe_menu_categories').update(dbUpdates).eq('id', id);
    if (error) { console.error(error); return false; }
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    return true;
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase.from('cafe_menu_categories').delete().eq('id', id);
    if (error) { console.error(error); return false; }
    setCategories(prev => prev.filter(c => c.id !== id));
    setItems(prev => prev.filter(i => i.categoryId !== id));
    return true;
  }, []);

  // Item CRUD
  const addItem = useCallback(async (item: {
    categoryId: string; name: string; price: number; costPrice?: number;
    description?: string; imageUrl?: string; isVeg?: boolean; prepTimeMinutes?: number;
  }) => {
    if (!locationId) return null;
    const { data, error } = await supabase.from('cafe_menu_items').insert({
      category_id: item.categoryId, location_id: locationId, name: item.name,
      price: item.price, cost_price: item.costPrice || null,
      description: item.description || null, image_url: item.imageUrl || null,
      is_veg: item.isVeg ?? true, prep_time_minutes: item.prepTimeMinutes || null,
      sort_order: items.filter(i => i.categoryId === item.categoryId).length,
    }).select().single();
    if (error) { console.error(error); return null; }
    const menuItem = transformMenuItemRow(data as unknown as CafeMenuItemRow);
    setItems(prev => [...prev, menuItem]);
    return menuItem;
  }, [locationId, items]);

  const updateItem = useCallback(async (id: string, updates: Partial<{
    name: string; price: number; costPrice: number; description: string;
    imageUrl: string; isVeg: boolean; isAvailable: boolean; prepTimeMinutes: number;
    categoryId: string; sortOrder: number;
  }>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.isVeg !== undefined) dbUpdates.is_veg = updates.isVeg;
    if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;
    if (updates.prepTimeMinutes !== undefined) dbUpdates.prep_time_minutes = updates.prepTimeMinutes;
    if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
    const { error } = await supabase.from('cafe_menu_items').update(dbUpdates).eq('id', id);
    if (error) { console.error(error); return false; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    return true;
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('cafe_menu_items').delete().eq('id', id);
    if (error) { console.error(error); return false; }
    setItems(prev => prev.filter(i => i.id !== id));
    return true;
  }, []);

  return {
    categories, items, loading, refresh,
    addCategory, updateCategory, deleteCategory,
    addItem, updateItem, deleteItem,
  };
}
