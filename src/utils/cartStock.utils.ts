import type { CartItem, Product } from '@/types/pos.types';

/** Max units allowed in cart for this product; null = unlimited (e.g. membership). */
export function getProductStockLimit(product: Product | undefined): number | null {
  if (!product || product.category === 'membership' || product.category === 'membership_card') return null;
  return Math.max(0, Number(product.stock) || 0);
}

export function clampQuantityToStock(
  requestedQty: number,
  stockLimit: number | null
): { quantity: number; blocked: boolean; capped: boolean } {
  if (stockLimit === null) {
    return { quantity: requestedQty, blocked: false, capped: false };
  }
  if (requestedQty <= stockLimit) {
    return { quantity: requestedQty, blocked: false, capped: false };
  }
  if (stockLimit <= 0) {
    return { quantity: 0, blocked: true, capped: false };
  }
  return { quantity: stockLimit, blocked: false, capped: true };
}

/** Clamp restored/merged cart lines so qty never exceeds on-hand stock. */
export function clampCartItemsToStock(items: CartItem[], products: Product[]): CartItem[] {
  return items
    .map((item) => {
      if (item.type !== 'product' || item.category === 'membership') return item;
      const product = products.find((p) => p.id === item.id);
      const limit = getProductStockLimit(product);
      if (limit === null) return item;
      const { quantity } = clampQuantityToStock(item.quantity, limit);
      if (quantity <= 0) return null;
      return { ...item, quantity, total: quantity * item.price };
    })
    .filter((item): item is CartItem => item !== null);
}
