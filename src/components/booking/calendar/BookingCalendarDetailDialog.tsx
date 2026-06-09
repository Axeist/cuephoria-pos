import React from 'react';
import {
  Clock,
  CreditCard,
  Edit2,
  Gamepad2,
  Gift,
  Hash,
  Mail,
  Phone,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge';
import { cn } from '@/lib/utils';
import {
  type CalendarBookingInput,
  formatCalendarTime,
  getStationAccent,
} from './bookingCalendar.utils';
import BookingAddonsDisplay from '@/components/booking/BookingAddonsDisplay';

interface BookingCalendarDetailDialogProps {
  booking: CalendarBookingInput | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (booking: CalendarBookingInput) => void;
  onDelete: (booking: CalendarBookingInput) => void;
  getStationTypeLabel: (type: string, category?: string | null) => string;
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn('mt-0.5 text-sm font-medium text-foreground break-words', mono && 'font-mono text-xs')}>
          {value}
        </p>
      </div>
    </div>
  );
}

export const BookingCalendarDetailDialog: React.FC<BookingCalendarDetailDialogProps> = ({
  booking,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  getStationTypeLabel,
}) => {
  if (!booking) return null;

  const accent = getStationAccent(booking.station?.type || '');
  const isPaid = Boolean(booking.payment_mode && booking.payment_mode !== 'venue' && booking.payment_txn_id);
  const accessCode = booking.booking_views?.[0]?.access_code;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/10 bg-gradient-to-b from-[#12101c] to-[#0a0812] p-0 overflow-hidden">
        <div
          className={cn(
            'h-1.5 w-full bg-gradient-to-r',
            booking.coupon_code
              ? 'from-purple-500 via-fuchsia-500 to-violet-500'
              : isPaid
                ? 'from-emerald-500 via-teal-500 to-cyan-500'
                : 'from-blue-500 via-indigo-500 to-violet-500',
          )}
        />

        <div className="p-5 sm:p-6 space-y-5">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <BookingStatusBadge status={booking.status} />
              {isPaid ? (
                <Badge className="border-emerald-400/30 bg-emerald-500/15 text-emerald-200">
                  <CreditCard className="mr-1 h-3 w-3" />
                  Paid online
                </Badge>
              ) : (
                <Badge className="border-amber-400/30 bg-amber-500/15 text-amber-200">Pay at venue</Badge>
              )}
              {booking.coupon_code && (
                <Badge className="border-purple-400/30 bg-purple-500/15 text-purple-200">
                  <Gift className="mr-1 h-3 w-3" />
                  {booking.coupon_code}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
              {booking.customer.name}
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              {formatCalendarTime(booking.start_time)} – {formatCalendarTime(booking.end_time)}
              <span className="mx-2 text-white/20">·</span>
              {booking.duration} min
            </DialogDescription>
          </DialogHeader>

          <div
            className={cn(
              'flex items-center gap-3 rounded-2xl border px-4 py-3 bg-gradient-to-r',
              accent.header,
              accent.border,
            )}
          >
            <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', accent.dot)} />
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{booking.station?.name || 'Unknown station'}</p>
              <p className="text-xs text-muted-foreground">
                {getStationTypeLabel(booking.station?.type || '', booking.station?.category)}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <DetailRow icon={Phone} label="Phone" value={booking.customer.phone} />
            <DetailRow
              icon={Mail}
              label="Email"
              value={booking.customer.email || '—'}
            />
            <DetailRow
              icon={Clock}
              label="Time slot"
              value={`${formatCalendarTime(booking.start_time)} – ${formatCalendarTime(booking.end_time)}`}
            />
            <DetailRow icon={Gamepad2} label="Duration" value={`${booking.duration} minutes`} />
            {booking.player_count != null && booking.player_count > 0 && (
              <DetailRow icon={Users} label="Players" value={String(booking.player_count)} />
            )}
            <DetailRow
              icon={CreditCard}
              label="Amount"
              value={
                booking.final_price != null ? (
                  <span>
                    ₹{booking.final_price.toLocaleString()}
                    {booking.original_price != null && booking.original_price !== booking.final_price && (
                      <span className="ml-2 text-xs text-muted-foreground line-through">
                        ₹{booking.original_price.toLocaleString()}
                      </span>
                    )}
                  </span>
                ) : (
                  '—'
                )
              }
            />
            {accessCode && (
              <DetailRow icon={Hash} label="Access code" value={accessCode} mono />
            )}
            {booking.payment_txn_id && (
              <DetailRow icon={CreditCard} label="Transaction ID" value={booking.payment_txn_id} mono />
            )}
          </div>

          <BookingAddonsDisplay bookingAddons={booking.booking_addons} />

          {booking.notes && (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{booking.notes}</p>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between pt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>ID</span>
              <span className="font-mono text-[10px] opacity-70">{booking.id.slice(0, 8)}…</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none border-white/10"
                onClick={() => {
                  onDelete(booking);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
              <Button
                size="sm"
                className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90"
                onClick={() => {
                  onEdit(booking);
                  onOpenChange(false);
                }}
              >
                <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                Edit booking
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
