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
};

/** Matches Station Command / app filter chip styling */
export function BookingStationTypeChips({ value, onChange, className }: Props) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {(['all', 'ps5', '8ball', 'vr'] as const).map((type) => (
        <Button
          key={type}
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange(type)}
          className={cn(
            'h-9 rounded-full border-white/15 text-[12px] transition-colors duration-200',
            value === type
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
