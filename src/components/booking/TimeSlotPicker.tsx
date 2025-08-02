import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSlotSelect: (slot: TimeSlot) => void;
  loading?: boolean;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  selectedSlot,
  onSlotSelect,
  loading = false
}) => {
  // Filter out past time slots for today
  const filterSlots = (slots: TimeSlot[]) => {
    const now = new Date();
    const isToday = now.toDateString() === new Date().toDateString();
    
    if (!isToday) {
      return slots;
    }
    
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    return slots.filter(slot => {
      const [hours, minutes] = slot.start_time.split(':').map(Number);
      const slotTime = hours * 60 + minutes;
      return slotTime >= currentTime;
    });
  };

  const filteredSlots = filterSlots(slots);
  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted/50 rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  if (filteredSlots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No time slots available for this date</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-sm" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-muted border rounded-sm" />
          <span>Booked</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {filteredSlots.map((slot, index) => {
          const isSelected = selectedSlot?.start_time === slot.start_time;
          
          return (
            <Button
              key={index}
              variant={isSelected ? "default" : slot.is_available ? "outline" : "ghost"}
              disabled={!slot.is_available}
              onClick={() => slot.is_available && onSlotSelect(slot)}
              className={`h-12 flex flex-col items-center justify-center text-xs relative ${
                !slot.is_available ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="font-medium">
                {formatTime(slot.start_time)}
              </div>
              <div className="text-xs opacity-70">
                {formatTime(slot.end_time)}
              </div>
              {!slot.is_available && (
                <div className="absolute -top-1 -right-1">
                  <Badge variant="destructive" className="text-xs px-1 py-0 text-[10px] leading-3">
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