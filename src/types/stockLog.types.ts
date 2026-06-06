// src/types/stockLog.types.ts
export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  changeType: 'restock' | 'addition' | 'deduction' | 'adjustment' | 'initial';
  previousStock: number;
  newStock: number;
  quantityChanged: number;
  reason?: string;
  performedBy: string;
  timestamp: Date;
  notes?: string;
}

/** Product list filters on the Products page */
export interface FilterOptions {
  stockStatuses?: string[];
}

/** Filters for the stock change log viewer */
export interface StockLogFilterOptions {
  changeTypes?: StockLog['changeType'][];
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
  performedBy?: string;
}
