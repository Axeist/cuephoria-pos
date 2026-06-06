import type { CartItem } from '@/types/pos.types';

/** Stable key for cart merge / line identity (product id + optional station tag). */
export function getCartItemLineKey(item: Pick<CartItem, 'id' | 'type' | 'stationName'>): string {
  return `${item.type}:${item.id}:${item.stationName ?? ''}`;
}

export function cartItemsMatch(
  item: CartItem,
  match: Pick<CartItem, 'id' | 'type'> & { stationName?: string | null }
): boolean {
  return (
    item.id === match.id &&
    item.type === match.type &&
    (item.stationName ?? '') === (match.stationName ?? '')
  );
}

export function findCartItem(
  items: CartItem[],
  match: Pick<CartItem, 'id' | 'type'> & { stationName?: string | null }
): CartItem | undefined {
  return items.find((item) => cartItemsMatch(item, match));
}

/** Label shown in POS cart, receipts, and persisted bill line names. */
export function getCartItemDisplayName(item: Pick<CartItem, 'name' | 'stationName'>): string {
  if (item.stationName?.trim()) {
    return `${item.name} (${item.stationName.trim()})`;
  }
  return item.name;
}

export function totalProductQuantityInCart(items: CartItem[], productId: string): number {
  return items
    .filter((item) => item.id === productId && item.type === 'product')
    .reduce((sum, item) => sum + item.quantity, 0);
}
