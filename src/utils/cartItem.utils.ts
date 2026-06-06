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
export function getCartItemDisplayName(item: Pick<CartItem, 'name' | 'stationName' | 'type'>): string {
  if (item.stationName?.trim() && item.type === 'product') {
    return `${item.name} (${item.stationName.trim()})`;
  }
  return item.name;
}

/** Primary line for cart rows — station or product name without billing suffix noise. */
export function getCartItemPrimaryLabel(item: CartItem): string {
  if (item.type === 'session') {
    const stationEnd = item.name.indexOf(' (');
    if (stationEnd > 0) return item.name.slice(0, stationEnd).trim();
  }
  if (item.stationName?.trim() && item.type === 'product') {
    return item.name;
  }
  return item.name;
}

/** Secondary line for session rows — customer, duration tier, coupon, etc. */
export function getCartItemSecondaryLabel(item: CartItem): string | null {
  if (item.type !== 'session') {
    return item.stationName?.trim() ? item.stationName.trim() : null;
  }

  const open = item.name.indexOf('(');
  if (open === -1) return null;

  const close = item.name.indexOf(')', open);
  const customer = close > open ? item.name.slice(open + 1, close).trim() : '';
  const after =
    close > -1 ? item.name.slice(close + 1).replace(/^\s*-\s*/, '').trim() : '';

  const parts = [customer, after].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function totalProductQuantityInCart(items: CartItem[], productId: string): number {
  return items
    .filter((item) => item.id === productId && item.type === 'product')
    .reduce((sum, item) => sum + item.quantity, 0);
}
