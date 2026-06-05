import type { CartItem } from '@/types/pos.types';

/**
 * Merge cart line items for sticky session checkout.
 * Later groups win on duplicate ids (in-memory cart overrides saved cart).
 */
export function mergeSessionCartItems(...itemGroups: CartItem[][]): CartItem[] {
  const indexById = new Map<string, number>();
  const merged: CartItem[] = [];

  for (const group of itemGroups) {
    for (const item of group) {
      const existingIdx = indexById.get(item.id);
      if (existingIdx !== undefined) {
        merged[existingIdx] = item;
      } else {
        indexById.set(item.id, merged.length);
        merged.push(item);
      }
    }
  }

  return merged;
}
