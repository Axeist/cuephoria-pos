// src/types/stockLog.types.ts
export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  changeType: 'addition' | 'deduction' | 'adjustment' | 'initial';
  previousStock: number;
  newStock: number;
  quantityChanged: number;
  reason?: string;
  performedBy: string;
  timestamp: Date;
  notes?: string;
}

export interface FilterOptions {
  stockStatus: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
  priceRange?: { min: number; max: number };
  profitMargin?: { min: number; max: number };
  dateRange?: { start: Date; end: Date };
}
