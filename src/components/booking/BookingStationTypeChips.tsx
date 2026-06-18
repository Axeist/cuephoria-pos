import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type BookingStationTypeFilter = 'all' | 'ps5' | '8ball' | 'vr';

const LABELS: Record<BookingStationTypeFilter, string> = {
  all: 'All',
  ps5: 'PS5',
  '8ball': '8-Ball',
  vr: 'VR',
};

type Props = {
  value: BookingStationTypeFilter;
  onChange: (type: BookingStationTypeFilter) => void;
  className?: string;
  /** Step 3: per-type accent colors when selected */
  variant?: 'default' | 'colored';
};

const coloredActive: Record<BookingStationTypeFilter, string> = {
  all: 'bg-white/12 text-gray-100 border-white/25',
  ps5: 'bg-cuephoria-purple/20 text-white border-cuephoria-purple/45 shadow-[0_0_12px_rgba(139,92,246,0.2)]',
  '8ball': 'bg-emerald-500/15 text-emerald-200 border-emerald-500/35',
  vr: 'bg-cuephoria-blue/15 text-cuephoria-blue border-cuephoria-blue/40',
};

const coloredIdle: Record<BookingStationTypeFilter, string> = {
  all: 'bg-transparent text-gray-300 hover:bg-white/8',
  ps5: 'bg-transparent text-violet-300/90 hover:bg-violet-500/10',
  '8ball': 'bg-transparent text-emerald-300/90 hover:bg-emerald-500/10',
  vr: 'bg-transparent text-cuephoria-blue/90 hover:bg-cuephoria-blue/10',
};

export function BookingStationTypeChips({
  value,
  onChange,
  className,
  variant = 'default',
}: Props) {
  return (
    <div className={cn('grid grid-cols-4 gap-2 sm:gap-3', className)}>
      {(['all', 'ps5', '8ball', 'vr'] as const).map((type) => (
        <Button
          key={type}
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange(type)}
          className={cn(
            'h-10 rounded-full border-white/15 text-[12px] font-medium transition-all duration-200',
            variant === 'colored'
              ? value === type
                ? coloredActive[type]
                : coloredIdle[type]
              : value === type
                ? 'bg-cuephoria-purple/25 text-white border-cuephoria-purple/50 shadow-[0_0_12px_rgba(139,92,246,0.2)]'
                : 'bg-transparent text-gray-300 hover:bg-white/8 hover:text-white'
          )}
        >
          {LABELS[type]}
        </Button>
      ))}
    </div>
  );
}

export function bookingStationTypeLabel(type: BookingStationTypeFilter): string {
  return LABELS[type];
}
