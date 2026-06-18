import { CartItem } from '@/types/pos.types';

const STORAGE_PREFIX = 'cuephoria_station_qs_';
const EXPIRY_MS = 24 * 60 * 60 * 1000;

interface StoredStationQuickShop {
  items: CartItem[];
  timestamp: number;
}

export function loadStationQuickShop(sessionId: string): CartItem[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
    if (!raw) return [];

    const data = JSON.parse(raw) as StoredStationQuickShop;
    if (Date.now() - data.timestamp > EXPIRY_MS) {
      clearStationQuickShop(sessionId);
      return [];
    }

    return data.items ?? [];
  } catch {
    return [];
  }
}

export function saveStationQuickShop(sessionId: string, items: CartItem[]): void {
  try {
    if (items.length === 0) {
      clearStationQuickShop(sessionId);
      return;
    }

    const data: StoredStationQuickShop = {
      items,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving station quick shop:', error);
  }
}

export function clearStationQuickShop(sessionId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
  } catch (error) {
    console.error('Error clearing station quick shop:', error);
  }
}
