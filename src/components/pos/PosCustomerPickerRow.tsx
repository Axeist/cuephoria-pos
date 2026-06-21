import React, { memo } from 'react';
import { ShoppingCart, User } from 'lucide-react';
import type { Customer } from '@/types/pos.types';
import { cn } from '@/lib/utils';

type PosCustomerPickerRowProps = {
  customer: Customer;
  savedItemCount?: number;
  onSelect: (customer: Customer) => void;
};

function PosCustomerPickerRow({
  customer,
  savedItemCount = 0,
  onSelect,
}: PosCustomerPickerRowProps) {
  const isMember = Boolean(customer.membershipTierId) || customer.isMember;

  return (
    <button
      type="button"
      onClick={() => onSelect(customer)}
      className={cn(
        'w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
        'hover:border-violet-400/40 hover:bg-violet-500/10 active:scale-[0.99]',
        isMember ? 'border-violet-500/25 bg-violet-950/20' : 'border-white/10 bg-white/[0.03]',
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          isMember ? 'bg-violet-500/20 text-violet-200' : 'bg-white/5 text-muted-foreground',
        )}
      >
        <User className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{customer.name}</p>
        <p className="text-xs text-muted-foreground font-mono truncate">
          {customer.customerId || customer.phone}
        </p>
      </div>
      {savedItemCount > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-cuephoria-orange/20 px-2 py-0.5 text-[10px] font-semibold text-orange-200">
          <ShoppingCart className="h-3 w-3" />
          {savedItemCount}
        </span>
      )}
    </button>
  );
}

export default memo(PosCustomerPickerRow, (a, b) => a.customer.id === b.customer.id && a.savedItemCount === b.savedItemCount);
