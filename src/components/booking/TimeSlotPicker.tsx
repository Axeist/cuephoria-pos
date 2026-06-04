import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  selectedSlots?: TimeSlot[];
  onSlotSelect: (slot: TimeSlot) => void;
  loading?: boolean;
}

const formatTime = (timeString: string) => {
  const [h, m] = timeString.split(":").map(Number);
  const d = new Date(2000, 0, 1, h || 0, m || 0, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const SKELETON_COUNT = 12;

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  selectedSlot,
  selectedSlots = [],
  onSlotSelect,
  loading = false,
}) => {
  if (loading) {
    return (
      <div
        className="grid grid-cols-2 md:grid-cols-3 gap-2"
        aria-busy="true"
        aria-label="Loading time slots"
      >
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-lg bg-white/[0.06] border border-white/5"
          />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground transition-opacity duration-300">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No time slots available for this date</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-cuephoria-purple/80" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-white/10 border border-white/15" />
          <span>Booked</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {slots.map((slot, index) => {
          const isSelected =
            selectedSlot?.start_time === slot.start_time &&
            selectedSlot?.end_time === slot.end_time;
          const isInMultipleSelection = selectedSlots.some(
            (s) => s.start_time === slot.start_time && s.end_time === slot.end_time
          );

          return (
            <Button
              key={`${slot.start_time}-${slot.end_time}-${index}`}
              variant={
                isSelected || isInMultipleSelection
                  ? "default"
                  : slot.is_available
                    ? "outline"
                    : "ghost"
              }
              disabled={!slot.is_available}
              onClick={() => slot.is_available && onSlotSelect(slot)}
              className={cn(
                "h-14 flex flex-col items-center justify-center text-xs relative",
                "transition-all duration-200 ease-out",
                "border-white/15",
                slot.is_available &&
                  !isSelected &&
                  !isInMultipleSelection &&
                  "hover:border-cuephoria-purple/40 hover:bg-cuephoria-purple/10",
                (isSelected || isInMultipleSelection) &&
                  "bg-gradient-to-br from-cuephoria-purple to-cuephoria-lightpurple border-transparent text-white",
                !slot.is_available && "opacity-45 cursor-not-allowed"
              )}
              aria-pressed={isSelected || isInMultipleSelection}
            >
              <div className="font-medium leading-tight">{formatTime(slot.start_time)}</div>
              <div className="text-[10px] opacity-70 leading-tight">{formatTime(slot.end_time)}</div>

              {isInMultipleSelection && (
                <div className="absolute -top-1 -right-1">
                  <Badge
                    variant="default"
                    className="text-xs px-1 py-0 text-[10px] leading-3 bg-cuephoria-purple"
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
