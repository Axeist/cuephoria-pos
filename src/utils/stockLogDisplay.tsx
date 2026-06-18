import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Package, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { StockLog } from '@/types/stockLog.types';

export const STOCK_LOG_TYPE_LABELS: Record<StockLog['changeType'], string> = {
  restock: 'Restock',
  addition: 'Addition',
  deduction: 'Deduction',
  adjustment: 'Adjustment',
  initial: 'Initial',
};

export function getStockLogTypeIcon(type: StockLog['changeType']) {
  switch (type) {
    case 'restock':
      return <Truck className="h-4 w-4 text-emerald-500" />;
    case 'addition':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'deduction':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case 'adjustment':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'initial':
      return <Package className="h-4 w-4 text-blue-500" />;
    default:
      return null;
  }
}

export function getStockLogTypeBadge(type: StockLog['changeType']) {
  const variants: Record<StockLog['changeType'], 'default' | 'destructive' | 'secondary' | 'outline'> = {
    restock: 'default',
    addition: 'default',
    deduction: 'destructive',
    adjustment: 'secondary',
    initial: 'secondary',
  };

  return (
    <Badge variant={variants[type]} className="capitalize">
      {STOCK_LOG_TYPE_LABELS[type]}
    </Badge>
  );
}
