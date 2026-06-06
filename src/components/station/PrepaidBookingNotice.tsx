import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, CalendarCheck } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import type { PrepaidBookingLink } from '@/types/prepaidBooking.types';
import type { StationBookingRow } from '@/types/prepaidBooking.types';
import {
  bookingToPrepaidLink,
  formatBookingSlotLabel,
  isOnlinePrepaidBooking,
} from '@/utils/prepaidBooking.utils';

interface PrepaidBookingNoticeProps {
  bookings: StationBookingRow[];
  selectedBookingId: string | null;
  onSelectBooking: (bookingId: string | null, link: PrepaidBookingLink | null) => void;
  compact?: boolean;
}

export function PrepaidBookingNotice({
  bookings,
  selectedBookingId,
  onSelectBooking,
  compact = false,
}: PrepaidBookingNoticeProps) {
  const prepaidBookings = bookings.filter(isOnlinePrepaidBooking);
  if (prepaidBookings.length === 0) return null;

  return (
    <div
      className={`rounded-lg border border-teal-500/35 bg-gradient-to-br from-teal-950/40 via-emerald-950/25 to-transparent ${
        compact ? 'p-2.5 space-y-2' : 'p-4 space-y-3'
      }`}
    >
      <div className="flex items-start gap-2">
        <CreditCard className={`shrink-0 text-teal-300 ${compact ? 'h-4 w-4 mt-0.5' : 'h-5 w-5'}`} />
        <div className="min-w-0">
          <p className={`font-semibold text-teal-100 ${compact ? 'text-sm' : 'text-base'}`}>
            Pre-paid booking today
          </p>
          <p className={`text-teal-200/75 ${compact ? 'text-[11px]' : 'text-xs'}`}>
            Session time is already paid online. POS opens only for shop items or overtime.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {prepaidBookings.map((booking) => {
          const link = bookingToPrepaidLink(booking);
          const selected = selectedBookingId === booking.id;
          return (
            <button
              key={booking.id}
              type="button"
              onClick={() =>
                onSelectBooking(selected ? null : booking.id, selected ? null : link)
              }
              className={`w-full rounded-md border p-3 text-left transition-all ${
                selected
                  ? 'border-teal-400/60 bg-teal-500/15 ring-1 ring-teal-400/40'
                  : 'border-white/10 bg-black/20 hover:border-teal-500/35 hover:bg-teal-950/30'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CalendarCheck className="h-4 w-4 shrink-0 text-teal-300" />
                  <span className="text-sm font-medium text-teal-50">
                    {formatBookingSlotLabel(booking.start_time, booking.end_time)}
                  </span>
                  <Badge variant="outline" className="text-[10px] border-teal-400/40 text-teal-200">
                    {booking.duration} min
                  </Badge>
                </div>
                <div className="text-right">
                  {booking.original_price != null &&
                    booking.original_price > (booking.final_price ?? 0) && (
                      <span className="text-xs text-muted-foreground line-through mr-1.5">
                        ₹{Number(booking.original_price).toFixed(0)}
                      </span>
                    )}
                  <CurrencyDisplay
                    amount={link.paidAmount}
                    className="text-sm font-bold text-teal-200"
                  />
                  <span className="text-[10px] text-teal-300/80 ml-1">paid</span>
                </div>
              </div>
              {booking.coupon_code && (
                <p className="mt-1 text-[11px] text-teal-200/70">Coupon: {booking.coupon_code}</p>
              )}
            </button>
          );
        })}
      </div>

      {selectedBookingId && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-teal-200/80 hover:text-teal-100"
          onClick={() => onSelectBooking(null, null)}
        >
          Unlink booking (walk-in session)
        </Button>
      )}
    </div>
  );
}
