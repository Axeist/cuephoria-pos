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
  stockStatuses?: string[];  // Changed to array for multi-select
}
