import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  CafeMenuCategory, CafeMenuCategoryRow,
  CafeMenuItem, CafeMenuItemRow,
} from '@/types/cafe.types';
import { transformMenuCategoryRow, transformMenuItemRow } from '@/types/cafe.types';
import { RealtimeChannel } from '@supabase/supabase-js';

/** PostgREST/Supabase when DB is missing a column (migration not applied). */
function isMissingColumn(message: string, column?: string): boolean {
  const m = message.toLowerCase();
  const colCheck = column ? m.includes(column.toLowerCase()) : true;
  return colCheck && (m.includes('schema') || m.includes('column') || m.includes('does not exist'));
}

function isMissingTracksInventoryColumn(message: string): boolean {
  return isMissingColumn(message, 'tracks_inventory');
}

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cafe_inventory_movements', filter: `location_id=eq.${locationId}` }, () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => fetchItems(), 300);
      })
      .subscribe();
    return () => { if (debounce) clearTimeout(debounce); supabase.removeChannel(channel); };
  }, [locationId, fetchItems, fetchCategories]);

  // Category CRUD
  const addCategory = useCallback(async (
    name: string,
    partnerId: string,
    opts?: { description?: string; imageUrl?: string; tracksInventory?: boolean },
  ): Promise<{ category: CafeMenuCategory | null; error: string | null }> => {
    if (!locationId) {
      return { category: null, error: 'No location selected' };
    }
    const base = {
      location_id: locationId,
      partner_id: partnerId,
      name,
      description: opts?.description || null,
      image_url: opts?.imageUrl || null,
      sort_order: categories.length,
    };
    const withTracks = {
      ...base,
      tracks_inventory: opts?.tracksInventory ?? false,
    };

    let { data, error } = await supabase.from('cafe_menu_categories').insert(withTracks).select().single();
    if (error && isMissingTracksInventoryColumn(error.message)) {
      ({ data, error } = await supabase.from('cafe_menu_categories').insert(base).select().single());
    }
    if (error) {
      console.error(error);
      return { category: null, error: error.message };
    }
    const cat = transformMenuCategoryRow(data as unknown as CafeMenuCategoryRow);
    setCategories(prev => [...prev, cat]);
    return { category: cat, error: null };
  }, [locationId, categories.length]);

  const updateCategory = useCallback(async (id: string, updates: Partial<{ name: string; description: string; imageUrl: string; isActive: boolean; sortOrder: number; tracksInventory: boolean }>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
    if (updates.tracksInventory !== undefined) dbUpdates.tracks_inventory = updates.tracksInventory;

    let { error } = await supabase.from('cafe_menu_categories').update(dbUpdates).eq('id', id);
    if (error && isMissingTracksInventoryColumn(error.message) && updates.tracksInventory !== undefined) {
      const { tracksInventory: _t, ...rest } = updates;
      const fallback: Record<string, unknown> = {};
      if (rest.name !== undefined) fallback.name = rest.name;
      if (rest.description !== undefined) fallback.description = rest.description;
      if (rest.imageUrl !== undefined) fallback.image_url = rest.imageUrl;
      if (rest.isActive !== undefined) fallback.is_active = rest.isActive;
      if (rest.sortOrder !== undefined) fallback.sort_order = rest.sortOrder;
      if (Object.keys(fallback).length > 0) {
        ({ error } = await supabase.from('cafe_menu_categories').update(fallback).eq('id', id));
      } else {
        return false;
      }
    }
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
    stockQuantity?: number;
  }) => {
    if (!locationId) return null;
    const payload: Record<string, unknown> = {
      category_id: item.categoryId, location_id: locationId, name: item.name,
      price: item.price, cost_price: item.costPrice || null,
      description: item.description || null, image_url: item.imageUrl || null,
      is_veg: item.isVeg ?? true, prep_time_minutes: item.prepTimeMinutes || null,
      sort_order: items.filter(i => i.categoryId === item.categoryId).length,
    };
    if (item.stockQuantity !== undefined && item.stockQuantity > 0) {
      payload.stock_quantity = Math.max(0, Math.floor(item.stockQuantity));
    }
    let { data, error } = await supabase.from('cafe_menu_items').insert(payload).select().single();
    if (error && error.message?.toLowerCase().includes('stock_quantity')) {
      delete payload.stock_quantity;
      ({ data, error } = await supabase.from('cafe_menu_items').insert(payload).select().single());
    }
    if (error) { console.error('addItem error:', error); return null; }
    const menuItem = transformMenuItemRow(data as unknown as CafeMenuItemRow);
    setItems(prev => [...prev, menuItem]);
    return menuItem;
  }, [locationId, items]);

  const updateItem = useCallback(async (id: string, updates: Partial<{
    name: string; price: number; costPrice: number; description: string;
    imageUrl: string; isVeg: boolean; isAvailable: boolean; prepTimeMinutes: number;
    categoryId: string; sortOrder: number; stockQuantity: number;
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
    if (updates.stockQuantity !== undefined) dbUpdates.stock_quantity = Math.max(0, Math.floor(updates.stockQuantity));

    let { error } = await supabase.from('cafe_menu_items').update(dbUpdates).eq('id', id);
    if (error && isMissingColumn(error.message, 'stock_quantity') && updates.stockQuantity !== undefined) {
      delete dbUpdates.stock_quantity;
      if (Object.keys(dbUpdates).length > 0) {
        ({ error } = await supabase.from('cafe_menu_items').update(dbUpdates).eq('id', id));
      } else {
        error = null;
      }
    }
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

  /** Manual stock change for tracked categories; writes cafe_inventory_movements. */
  const adjustStock = useCallback(async (
    itemId: string,
    quantity: number,
    mode: 'add' | 'reduce',
    opts?: { orderId?: string | null; note?: string | null },
  ): Promise<boolean> => {
    if (!locationId) return false;
    const q = Math.floor(quantity);
    if (q <= 0) return false;

    let row: Record<string, unknown> | null = null;
    let stockColumnExists = true;

    const { data: d1, error: e1 } = await supabase
      .from('cafe_menu_items')
      .select('id, stock_quantity, category_id')
      .eq('id', itemId)
      .eq('location_id', locationId)
      .single();

    if (e1 && isMissingColumn(e1.message, 'stock_quantity')) {
      stockColumnExists = false;
      const { data: d2, error: e2 } = await supabase
        .from('cafe_menu_items')
        .select('id, category_id')
        .eq('id', itemId)
        .eq('location_id', locationId)
        .single();
      if (e2 || !d2) { console.error(e2); return false; }
      row = d2 as Record<string, unknown>;
    } else if (e1 || !d1) {
      console.error(e1);
      return false;
    } else {
      row = d1 as Record<string, unknown>;
    }

    const { data: catRow, error: catErr } = await supabase
      .from('cafe_menu_categories')
      .select('tracks_inventory')
      .eq('id', row!.category_id as string)
      .single();
    if (catErr || !catRow?.tracks_inventory) return false;

    if (!stockColumnExists) {
      console.warn('stock_quantity column missing — cannot adjust stock. Apply the migration to add it.');
      return false;
    }

    const current = (row as any).stock_quantity ?? 0;
    let delta: number;
    let newStock: number;
    if (mode === 'add') {
      delta = q;
      newStock = current + q;
    } else {
      const removed = Math.min(q, current);
      delta = -removed;
      newStock = current - removed;
    }

    const { error: upErr } = await supabase
      .from('cafe_menu_items')
      .update({ stock_quantity: newStock })
      .eq('id', itemId);
    if (upErr) {
      console.error(upErr);
      return false;
    }

    const movementType = mode === 'add' ? 'adjustment_add' : 'adjustment_reduce';
    const { error: movErr } = await supabase.from('cafe_inventory_movements').insert({
      location_id: locationId,
      menu_item_id: itemId,
      quantity_delta: delta,
      movement_type: movementType,
      order_id: opts?.orderId ?? null,
      note: opts?.note ?? null,
      created_by: null,
    });
    if (movErr) {
      console.error(movErr);
      await supabase.from('cafe_menu_items').update({ stock_quantity: current }).eq('id', itemId);
      return false;
    }

    setItems(prev => prev.map(i => (i.id === itemId ? { ...i, stockQuantity: newStock } : i)));
    return true;
  }, [locationId]);

  return {
    categories, items, loading, refresh,
    addCategory, updateCategory, deleteCategory,
    addItem, updateItem, deleteItem,
    adjustStock,
  };
}
