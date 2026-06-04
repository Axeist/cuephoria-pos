import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2 } from "lucide-react";
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
      <div className="space-y-3" aria-busy="true">
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div
              key={i}
              className="h-[4.5rem] rounded-xl bg-white/[0.06] border border-white/5"
            />
          ))}
        </div>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/25 p-8 text-center">
        <Clock className="h-10 w-10 mx-auto mb-3 text-gray-500" />
        <p className="text-sm font-medium text-gray-300">No time slots for this date</p>
        <p className="text-xs text-muted-foreground mt-1">Try another day or contact the venue</p>
      </div>
    );
  }

  const selectionCount =
    selectedSlots.length > 0
      ? selectedSlots.length
      : selectedSlot
        ? 1
        : 0;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-cuephoria-purple/80" />
            Available
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-white/20 bg-white/5" />
            Booked
          </span>
        </div>
        <span className="text-muted-foreground tabular-nums">1-hour sessions · 11 AM – 11 PM</span>
      </div>

      {selectionCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-cuephoria-purple/30 bg-cuephoria-purple/10 px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 text-cuephoria-lightpurple shrink-0 mt-0.5" />
          <div className="min-w-0 text-left">
            <p className="text-xs font-semibold text-white">
              {selectionCount} hour{selectionCount !== 1 ? "s" : ""} selected
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
              Pick stations in Step 3 after choosing your time
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {slots.map((slot, index) => {
          const isSelected =
            selectedSlot?.start_time === slot.start_time &&
            selectedSlot?.end_time === slot.end_time;
          const isInMultipleSelection = selectedSlots.some(
            (s) => s.start_time === slot.start_time && s.end_time === slot.end_time
          );
          const active = isSelected || isInMultipleSelection;

          return (
            <Button
              key={`${slot.start_time}-${slot.end_time}-${index}`}
              variant={active ? "default" : slot.is_available ? "outline" : "ghost"}
              disabled={!slot.is_available}
              onClick={() => slot.is_available && onSlotSelect(slot)}
              className={cn(
                "h-[4.5rem] w-full flex flex-col items-start justify-center gap-0.5 px-3 py-2 text-left relative",
                "transition-all duration-200 ease-out rounded-xl border",
                slot.is_available &&
                  !active &&
                  "border-white/15 bg-black/20 hover:border-cuephoria-purple/40 hover:bg-cuephoria-purple/10",
                active &&
                  "bg-gradient-to-br from-cuephoria-purple to-cuephoria-lightpurple border-transparent text-white shadow-[0_4px_16px_rgba(139,92,246,0.25)]",
                !slot.is_available && "opacity-40 cursor-not-allowed border-white/5 bg-black/10"
              )}
              aria-pressed={active}
            >
              <span className="text-sm font-semibold leading-none tabular-nums">
                {formatTime(slot.start_time)}
              </span>
              <span
                className={cn(
                  "text-[11px] leading-none tabular-nums",
                  active ? "text-white/80" : "text-muted-foreground"
                )}
              >
                to {formatTime(slot.end_time)}
              </span>

              {active && (
                <Badge className="absolute top-1.5 right-1.5 h-4 px-1 text-[9px] bg-white/20 text-white border-0">
                  ✓
                </Badge>
              )}
              {!slot.is_available && (
                <Badge
                  variant="destructive"
                  className="absolute top-1.5 right-1.5 h-4 px-1 text-[9px]"
                >
                  Booked
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default TimeSlotPicker;
