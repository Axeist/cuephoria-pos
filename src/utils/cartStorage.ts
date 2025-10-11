import { CartItem } from '@/types/pos.types';

const CART_STORAGE_PREFIX = 'cuephoria_cart_';
const CART_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours

interface StoredCart {
  items: CartItem[];
  timestamp: number;
  customerName: string;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  loyaltyPointsUsed?: number;
}

/**
 * Save cart to localStorage for a specific customer
 */
export const saveCartToStorage = (
  customerId: string,
  cartData: CartItem[],
  customerName: string,
  discount: number = 0,
  discountType: 'percentage' | 'fixed' = 'percentage',
  loyaltyPointsUsed: number = 0
): void => {
  try {
    const storageData: StoredCart = {
      items: cartData,
      timestamp: Date.now(),
      customerName,
      discount,
      discountType,
      loyaltyPointsUsed,
    };
    localStorage.setItem(
      `${CART_STORAGE_PREFIX}${customerId}`,
      JSON.stringify(storageData)
    );
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
};

/**
 * Load cart from localStorage for a specific customer
 */
export const loadCartFromStorage = (customerId: string): StoredCart | null => {
  try {
    const stored = localStorage.getItem(`${CART_STORAGE_PREFIX}${customerId}`);
    if (!stored) return null;

    const data: StoredCart = JSON.parse(stored);
    
    // Check if cart has expired
    if (Date.now() - data.timestamp > CART_EXPIRY_TIME) {
      clearCartFromStorage(customerId);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
    return null;
  }
};

/**
 * Clear cart from localStorage for a specific customer
 */
export const clearCartFromStorage = (customerId: string): void => {
  try {
    localStorage.removeItem(`${CART_STORAGE_PREFIX}${customerId}`);
  } catch (error) {
    console.error('Error clearing cart from localStorage:', error);
  }
};

/**
 * Get cart info for a specific customer (without loading full cart)
 */
export const getCartInfo = (customerId: string): {
  hasCart: boolean;
  itemCount: number;
  timestamp: number | null;
} => {
  try {
    const stored = localStorage.getItem(`${CART_STORAGE_PREFIX}${customerId}`);
    if (!stored) {
      return { hasCart: false, itemCount: 0, timestamp: null };
    }

    const data: StoredCart = JSON.parse(stored);
    
    // Check if expired
    if (Date.now() - data.timestamp > CART_EXPIRY_TIME) {
      clearCartFromStorage(customerId);
      return { hasCart: false, itemCount: 0, timestamp: null };
    }

    return {
      hasCart: true,
      itemCount: data.items.length,
      timestamp: data.timestamp,
    };
  } catch (error) {
    console.error('Error getting cart info:', error);
    return { hasCart: false, itemCount: 0, timestamp: null };
  }
};

/**
 * Clean up expired carts (older than 24 hours)
 */
export const cleanupExpiredCarts = (): number => {
  let cleanedCount = 0;
  const now = Date.now();

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CART_STORAGE_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const data: StoredCart = JSON.parse(stored);
          if (now - data.timestamp > CART_EXPIRY_TIME) {
            keysToRemove.push(key);
          }
        }
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      cleanedCount++;
    });
  } catch (error) {
    console.error('Error cleaning up expired carts:', error);
  }

  return cleanedCount;
};

/**
 * Get all customers with saved carts
 */
export const getCustomersWithSavedCarts = (): Array<{
  customerId: string;
  customerName: string;
  itemCount: number;
  timestamp: number;
}> => {
  const customersWithCarts: Array<{
    customerId: string;
    customerName: string;
    itemCount: number;
    timestamp: number;
  }> = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CART_STORAGE_PREFIX)) {
        const customerId = key.replace(CART_STORAGE_PREFIX, '');
        const stored = localStorage.getItem(key);
        
        if (stored) {
          const data: StoredCart = JSON.parse(stored);
          
          // Skip expired carts
          if (Date.now() - data.timestamp > CART_EXPIRY_TIME) {
            continue;
          }
          
          customersWithCarts.push({
            customerId,
            customerName: data.customerName,
            itemCount: data.items.length,
            timestamp: data.timestamp,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error getting customers with saved carts:', error);
  }

  return customersWithCarts;
};

/**
 * Clear all carts from localStorage - THIS WAS MISSING!
 */
export const clearAllCarts = (): number => {
  let clearedCount = 0;

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CART_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      clearedCount++;
    });
  } catch (error) {
    console.error('Error clearing all carts:', error);
  }

  return clearedCount;
};
