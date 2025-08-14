import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

export interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  /** Multi-select: pass the array of currently selected slots */
  selectedSlots: TimeSlot[];
  /** Called with next selected slots after toggle */
  onChange: (next: TimeSlot[]) => void;
  loading?: boolean;
}

const keyOf = (s: TimeSlot) => `${s.start_time}-${s.end_time}`;

const formatTime = (timeString: string) =>
  new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  selectedSlots,
  onChange,
  loading = false
}) => {
  const selectedSet = new Set(selectedSlots.map(keyOf));

  const toggle = (slot: TimeSlot) => {
    const k = keyOf(slot);
    if (selectedSet.has(k)) {
      onChange(selectedSlots.filter(s => keyOf(s) !== k));
    } else {
      onChange([...selectedSlots, slot]);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted/50 rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No time slots available for this date</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* tiny legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-primary/70" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-muted/20 border border-border" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-muted border" />
          <span>Booked</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {slots.map((slot) => {
          const k = keyOf(slot);
          const isSelected = selectedSet.has(k);
          const disabled = !slot.is_available;

          return (
            <Button
              key={k}
              variant={isSelected ? 'default' : disabled ? 'ghost' : 'outline'}
              disabled={disabled}
              onClick={() => !disabled && toggle(slot)}
              aria-pressed={isSelected}
              className={[
                'h-12 flex flex-col items-center justify-center text-xs relative transition',
                disabled ? 'opacity-50 cursor-not-allowed line-through' : '',
                isSelected ? 'ring-1 ring-cuephoria-lightpurple/50' : ''
              ].join(' ')}
            >
              <div className="font-medium">
                {formatTime(slot.start_time)}
              </div>
              <div className="text-[11px] opacity-70">
                {formatTime(slot.end_time)}
              </div>

              {!slot.is_available && (
                <div className="absolute -top-1 -right-1">
                  <Badge variant="destructive" className="text-[10px] px-1 py-0 leading-3">
                    Booked
                  </Badge>
                </div>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
