import type { CartItem } from '@/types/pos.types';

/** Saved cart that only holds ended group-session lines — not auto-loaded into live POS. */
export function isSessionOnlyCart(items: CartItem[]): boolean {
  return items.length > 0 && items.every((item) => item.type === 'session');
}
