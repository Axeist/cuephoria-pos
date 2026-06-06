import type { Product } from '@/types/pos.types';

/** Returns configured max capacity, or null when uncapped (legacy products). */
export function getProductMaxStock(product: Product | undefined | null): number | null {
  if (!product || product.category === 'membership') return null;
  const max = product.maxStock;
  if (max == null || !Number.isFinite(max)) return null;
  return Math.max(0, Math.floor(max));
}

/** Units that can still be restocked before hitting max capacity. Null = unlimited. */
export function getRestockHeadroom(product: Product): number | null {
  const max = getProductMaxStock(product);
  if (max === null) return null;
  return Math.max(0, max - Math.max(0, product.stock));
}

export function isStockWithinMax(stock: number, maxStock: number | null | undefined): boolean {
  if (maxStock == null || !Number.isFinite(maxStock)) return true;
  return stock <= Math.max(0, Math.floor(maxStock));
}

export function clampStockToMax(stock: number, maxStock: number | null | undefined): number {
  const normalized = Math.max(0, Math.floor(stock));
  if (maxStock == null || !Number.isFinite(maxStock)) return normalized;
  return Math.min(normalized, Math.max(0, Math.floor(maxStock)));
}
