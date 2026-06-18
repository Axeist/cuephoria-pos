import type { CartItem } from '@/types/pos.types';
import { getCartItemLineKey } from '@/utils/cartItem.utils';

/**
 * Merge cart line items for sticky session checkout.
 * Later groups win on duplicate line keys (in-memory cart overrides saved cart).
 * Station-tagged products stay separate per station.
 */
export function mergeSessionCartItems(...itemGroups: CartItem[][]): CartItem[] {
  const indexByLineKey = new Map<string, number>();
  const merged: CartItem[] = [];

  for (const group of itemGroups) {
    for (const item of group) {
      const lineKey = getCartItemLineKey(item);
      const existingIdx = indexByLineKey.get(lineKey);
      if (existingIdx !== undefined) {
        merged[existingIdx] = item;
      } else {
        indexByLineKey.set(lineKey, merged.length);
        merged.push(item);
      }
    }
  }

  return merged;
}
