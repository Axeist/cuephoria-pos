import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface TimeSlot {
  start_time: string; // e.g., "11:00"
  end_time: string;   // e.g., "12:00"
  is_available: boolean;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  selectedSlots?: TimeSlot[];
  onSlotSelect: (slot: TimeSlot) => void;
  loading?: boolean;
}

// Helper to format a "HH:mm" string into a localized time (e.g., 11:00 AM)
const formatTime = (timeString: string) => {
  // Safely construct a Date at an arbitrary fixed date with the given time
  const [h, m] = timeString.split(":").map(Number);
  const d = new Date(2000, 0, 1, h || 0, m || 0, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  selectedSlot,
  selectedSlots = [],
  onSlotSelect,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted/50 rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
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
        {slots.map((slot, index) => {
          const isSelected = selectedSlot?.start_time === slot.start_time;
          const isInMultipleSelection = selectedSlots.some(
            s => s.start_time === slot.start_time && s.end_time === slot.end_time
          );

          return (
            <Button
              key={index}
              variant={isSelected || isInMultipleSelection ? "default" : slot.is_available ? "outline" : "ghost"}
              disabled={!slot.is_available}
              onClick={() => slot.is_available && onSlotSelect(slot)}
              className={`h-12 flex flex-col items-center justify-center text-xs relative ${
                !slot.is_available ? "opacity-50 cursor-not-allowed" : ""
              } ${isInMultipleSelection ? "ring-2 ring-primary ring-offset-2" : ""}`}
              aria-pressed={isSelected || isInMultipleSelection}
            >
              <div className="font-medium">{formatTime(slot.start_time)}</div>
              <div className="text-xs opacity-70">{formatTime(slot.end_time)}</div>

              {isInMultipleSelection && (
                <div className="absolute -top-1 -right-1">
                  <Badge
                    variant="default"
                    className="text-xs px-1 py-0 text-[10px] leading-3 bg-primary"
                  >
                    ✓
                  </Badge>
                </div>
              )}

              {!slot.is_available && (
                <div className="absolute -top-1 -right-1">
                  <Badge
                    variant="destructive"
                    className="text-xs px-1 py-0 text-[10px] leading-3"
                  >
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

export default TimeSlotPicker;
