// src/utils/stockLogger.ts
import { StockLog } from '@/types/stockLog.types';
import { Product } from '@/types/pos.types';

export const createStockLog = (
  product: Product,
  previousStock: number,
  newStock: number,
  changeType: StockLog['changeType'],
  performedBy: string,
  notes?: string
): StockLog => {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    productId: product.id,
    productName: product.name,
    changeType,
    previousStock,
    newStock,
    quantityChanged: newStock - previousStock,
    performedBy,
    timestamp: new Date(),
    notes,
  };
};

export const saveStockLog = (log: StockLog): void => {
  try {
    const existingLogs = localStorage.getItem('stockLogs');
    const logs: StockLog[] = existingLogs ? JSON.parse(existingLogs) : [];
    logs.push(log);
    
    const trimmedLogs = logs.slice(-1000);
    localStorage.setItem('stockLogs', JSON.stringify(trimmedLogs));
  } catch (error) {
    console.error('Error saving stock log:', error);
  }
};

export const getStockLogs = (productId?: string): StockLog[] => {
  try {
    const storedLogs = localStorage.getItem('stockLogs');
    if (!storedLogs) return [];
    
    const logs: StockLog[] = JSON.parse(storedLogs);
    return productId 
      ? logs.filter(log => log.productId === productId)
      : logs;
  } catch (error) {
    console.error('Error retrieving stock logs:', error);
    return [];
  }
};
