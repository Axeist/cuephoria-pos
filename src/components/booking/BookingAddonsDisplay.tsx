import React from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { BookingAddonsSnapshot } from '@/types/bookingAddons';
import { parseBookingAddonsSnapshot } from '@/utils/bookingAddons.utils';

interface BookingAddonsDisplayProps {
  bookingAddons?: unknown;
  compact?: boolean;
  className?: string;
}

const BookingAddonsDisplay: React.FC<BookingAddonsDisplayProps> = ({
  bookingAddons,
  compact = false,
  className = '',
}) => {
  const snapshot: BookingAddonsSnapshot | null = parseBookingAddonsSnapshot(bookingAddons);
  if (!snapshot?.items?.length) return null;

  if (compact) {
    return (
      <div className={`flex flex-wrap gap-1 ${className}`}>
        {snapshot.items.map((item) => (
          <Badge
            key={item.id}
            variant="outline"
            className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
          >
            {item.name} · ₹{item.price}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="text-sm text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
        Add-ons
      </div>
      <div className="flex flex-wrap gap-1.5">
        {snapshot.items.map((item) => (
          <Badge
            key={item.id}
            variant="outline"
            className="text-xs bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-normal"
          >
            {item.name}
            <span className="ml-1 tabular-nums text-emerald-200/90">₹{item.price}</span>
          </Badge>
        ))}
      </div>
      {snapshot.total > 0 && (
        <p className="text-xs text-muted-foreground">
          Add-ons total: <span className="font-medium text-foreground">₹{snapshot.total}</span>
        </p>
      )}
    </div>
  );
};

export default BookingAddonsDisplay;
