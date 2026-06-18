
import React from 'react';
import { cn } from '@/lib/utils';

interface CurrencyDisplayProps {
  amount: number;
  className?: string;
  showDecimals?: boolean;
}

export const formatCurrency = (amount: number, showDecimals: boolean = false): string => {
  return showDecimals 
    ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₹${Math.round(amount).toLocaleString('en-IN')}`;
};

export function CurrencyDisplay({ amount, className, showDecimals = false }: CurrencyDisplayProps) {
  const formattedAmount = showDecimals 
    ? amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(amount).toLocaleString('en-IN');
    
  return (
    <span className={cn("indian-rupee", className)}>
      {formattedAmount}
    </span>
  );
}
