import React, { memo, useCallback } from 'react';
import { Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/components/ui/currency';
import type { Product } from '@/types/pos.types';
import { cn } from '@/lib/utils';
import { getCategoryCardStyle } from '@/utils/colorTheme.utils';

type PosProductCardProps = {
  product: Product;
  cartQuantity: number;
  categoryAccent?: string | null;
  onAdd: (product: Product) => void;
  className?: string;
};

function PosProductCard({
  product,
  cartQuantity,
  categoryAccent,
  onAdd,
  className,
}: PosProductCardProps) {
  const isMembership = product.category === 'membership';
  const remaining = isMembership ? Infinity : product.stock - cartQuantity;
  const outOfStock = !isMembership && remaining <= 0;
  const cardStyle = getCategoryCardStyle(product.category, categoryAccent ?? undefined);

  const handleAdd = useCallback(() => {
    if (!outOfStock) onAdd(product);
  }, [onAdd, outOfStock, product]);

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border p-3 h-full transition hover:-translate-y-0.5',
        className,
      )}
      style={cardStyle}
    >
      <h3 className="text-sm font-semibold leading-snug line-clamp-2 min-h-[2.5rem] mb-2">
        {product.name}
      </h3>
      <div className="flex items-center justify-between text-sm mb-1">
        <CurrencyDisplay amount={product.price} className="font-semibold" />
        {product.offerPrice != null && product.offerPrice < product.price && (
          <span className="text-xs line-through text-muted-foreground">
            <CurrencyDisplay amount={product.originalPrice ?? product.price} />
          </span>
        )}
      </div>
      {isMembership && product.membershipHours ? (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-2">
          <Clock className="h-3 w-3" />
          {product.membershipHours}h included
        </p>
      ) : !isMembership ? (
        <p className="text-[10px] text-muted-foreground mb-2">
          {outOfStock ? 'Out of stock' : `${remaining} left`}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        className="mt-auto w-full btn-gradient gap-1"
        disabled={outOfStock}
        onClick={handleAdd}
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </Button>
    </div>
  );
}

export default memo(PosProductCard, (a, b) => a.product.id === b.product.id && a.cartQuantity === b.cartQuantity);
