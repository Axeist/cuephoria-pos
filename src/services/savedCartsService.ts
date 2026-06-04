import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/types/pos.types';
import type { SavedCartSummary } from '@/types/pos.types';

export interface SavedCartRecord {
  id: string;
  organization_id: string;
  location_id: string;
  customer_id: string;
  customer_name: string;
  items: CartItem[];
  discount: number;
  discount_type: 'percentage' | 'fixed';
  loyalty_points_used: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

function mapRow(row: SavedCartRecord): SavedCartRecord {
  return {
    ...row,
    items: Array.isArray(row.items) ? row.items : [],
    discount: Number(row.discount ?? 0),
    loyalty_points_used: Number(row.loyalty_points_used ?? 0),
  };
}

export async function fetchSavedCartsForLocation(
  locationId: string
): Promise<SavedCartRecord[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('saved_carts')
    .select('*')
    .eq('location_id', locationId)
    .gt('expires_at', now)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('fetchSavedCartsForLocation:', error);
    throw error;
  }

  return (data ?? []).map((row) => mapRow(row as SavedCartRecord));
}

export async function getSavedCart(
  locationId: string,
  customerId: string
): Promise<SavedCartRecord | null> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('saved_carts')
    .select('*')
    .eq('location_id', locationId)
    .eq('customer_id', customerId)
    .gt('expires_at', now)
    .maybeSingle();

  if (error) {
    console.error('getSavedCart:', error);
    throw error;
  }

  return data ? mapRow(data as SavedCartRecord) : null;
}

export async function upsertSavedCart(params: {
  locationId: string;
  customerId: string;
  customerName: string;
  items: CartItem[];
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  loyaltyPointsUsed?: number;
}): Promise<SavedCartRecord> {
  const payload = {
    location_id: params.locationId,
    customer_id: params.customerId,
    customer_name: params.customerName,
    items: params.items,
    discount: params.discount ?? 0,
    discount_type: params.discountType ?? 'percentage',
    loyalty_points_used: params.loyaltyPointsUsed ?? 0,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const { data, error } = await supabase
    .from('saved_carts')
    .upsert(payload, { onConflict: 'location_id,customer_id' })
    .select('*')
    .single();

  if (error) {
    console.error('upsertSavedCart:', error);
    throw error;
  }

  return mapRow(data as SavedCartRecord);
}

export async function deleteSavedCart(
  locationId: string,
  customerId: string
): Promise<void> {
  const { error } = await supabase
    .from('saved_carts')
    .delete()
    .eq('location_id', locationId)
    .eq('customer_id', customerId);

  if (error) {
    console.error('deleteSavedCart:', error);
    throw error;
  }
}

export async function deleteAllSavedCarts(locationId: string): Promise<number> {
  const { data, error } = await supabase
    .from('saved_carts')
    .delete()
    .eq('location_id', locationId)
    .select('id');

  if (error) {
    console.error('deleteAllSavedCarts:', error);
    throw error;
  }

  return data?.length ?? 0;
}

export function toSavedCartSummary(record: SavedCartRecord): SavedCartSummary {
  const itemCount = record.items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    customerId: record.customer_id,
    customerName: record.customer_name,
    itemCount,
    timestamp: new Date(record.updated_at).getTime(),
    record: {
      items: record.items,
      discount: Number(record.discount ?? 0),
      discount_type: record.discount_type ?? 'percentage',
      loyalty_points_used: Number(record.loyalty_points_used ?? 0),
    },
  };
}
