import { useCallback, useState } from 'react';
import { CartItem, Product } from '@/types/pos.types';
import { clampQuantityToStock, getProductStockLimit } from '@/utils/cartStock.utils';
import {
  clearStationQuickShop,
  loadStationQuickShop,
  saveStationQuickShop,
} from '@/utils/stationQuickShopStorage';

function normalizeItems(items: CartItem[]): CartItem[] {
  return items.map((item) => ({
    ...item,
    total: item.price * item.quantity,
  }));
}

export function useStationQuickShop() {
  const [itemsBySession, setItemsBySession] = useState<Record<string, CartItem[]>>({});

  const resolveItems = useCallback(
    (sessionId: string): CartItem[] => {
      if (itemsBySession[sessionId]) {
        return itemsBySession[sessionId];
      }
      return loadStationQuickShop(sessionId);
    },
    [itemsBySession]
  );

  const commitItems = useCallback((sessionId: string, items: CartItem[]) => {
    const normalized = normalizeItems(items);
    saveStationQuickShop(sessionId, normalized);
    setItemsBySession((prev) => ({ ...prev, [sessionId]: normalized }));
  }, []);

  const getStationQuickShopItems = useCallback(
    (sessionId: string) => resolveItems(sessionId),
    [resolveItems]
  );

  const addToStationQuickShop = useCallback(
    (sessionId: string, product: Product, quantity = 1) => {
      const current = resolveItems(sessionId);
      const existing = current.find(
        (item) => item.id === product.id && item.type === 'product'
      );

      const currentQty = existing?.quantity ?? 0;
      const stockLimit = getProductStockLimit(product);
      const { quantity: nextQty, blocked } = clampQuantityToStock(
        currentQty + quantity,
        stockLimit
      );
      if (blocked || nextQty <= currentQty) return;

      let updated: CartItem[];
      if (existing) {
        updated = current.map((item) =>
          item.id === product.id && item.type === 'product'
            ? {
                ...item,
                quantity: nextQty,
                total: nextQty * item.price,
              }
            : item
        );
      } else {
        updated = [
          ...current,
          {
            id: product.id,
            type: 'product',
            name: product.name,
            price: product.price,
            quantity: nextQty,
            total: product.price * nextQty,
            category: product.category,
          },
        ];
      }

      commitItems(sessionId, updated);
    },
    [commitItems, resolveItems]
  );

  const updateStationQuickShopQuantity = useCallback(
    (sessionId: string, productId: string, quantity: number, product?: Product) => {
      const current = resolveItems(sessionId);

      if (quantity <= 0) {
        commitItems(
          sessionId,
          current.filter((item) => !(item.id === productId && item.type === 'product'))
        );
        return;
      }

      const stockLimit = getProductStockLimit(product);
      const { quantity: nextQty, blocked } = clampQuantityToStock(quantity, stockLimit);
      if (blocked) return;

      commitItems(
        sessionId,
        current.map((item) =>
          item.id === productId && item.type === 'product'
            ? { ...item, quantity: nextQty, total: item.price * nextQty }
            : item
        )
      );
    },
    [commitItems, resolveItems]
  );

  const removeFromStationQuickShop = useCallback(
    (sessionId: string, productId: string) => {
      const current = resolveItems(sessionId);
      commitItems(
        sessionId,
        current.filter((item) => !(item.id === productId && item.type === 'product'))
      );
    },
    [commitItems, resolveItems]
  );

  const clearStationQuickShopSession = useCallback((sessionId: string) => {
    clearStationQuickShop(sessionId);
    setItemsBySession((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  }, []);

  return {
    itemsBySession,
    getStationQuickShopItems,
    addToStationQuickShop,
    updateStationQuickShopQuantity,
    removeFromStationQuickShop,
    clearStationQuickShopSession,
  };
}
