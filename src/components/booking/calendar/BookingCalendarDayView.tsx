import React, { useMemo, useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gift,
  Minimize2,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge';
import { cn } from '@/lib/utils';
import { BookingCalendarDetailDialog } from './BookingCalendarDetailDialog';
import {
  type CalendarBookingInput,
  buildCalendarLayout,
  CALENDAR_GRID_HEIGHT_PX,
  formatCalendarTime,
  generateCalendarTimeSlots,
  getBookingBlockAccent,
  getCurrentTimeIndicatorPx,
  getStationAccent,
  HOUR_HEIGHT_PX,
  STATION_COLUMN_BASE_PX,
  TIME_GUTTER_PX,
  COLUMN_PAD_PX,
  BLOCK_GAP_PX,
} from './bookingCalendar.utils';

function blockGeometry(item: {
  laneIndex: number;
  laneCount: number;
  columnWidthPx: number;
}): { left: number; width: number } {
  const innerWidth = item.columnWidthPx - COLUMN_PAD_PX * 2;
  if (item.laneCount <= 1) {
    return { left: COLUMN_PAD_PX, width: innerWidth };
  }
  const laneGap = BLOCK_GAP_PX;
  const width = (innerWidth - laneGap * (item.laneCount - 1)) / item.laneCount;
  return {
    left: COLUMN_PAD_PX + item.laneIndex * (width + laneGap),
    width,
  };
}

interface BookingCalendarDayViewProps {
  bookings: CalendarBookingInput[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onClose: () => void;
  getDateLabel: (date: string) => string;
  getStationTypeLabel: (type: string, category?: string | null) => string;
  calculateRevenue: (bookings: CalendarBookingInput[]) => number;
  onEdit: (booking: CalendarBookingInput) => void;
  onDelete: (booking: CalendarBookingInput) => void;
}

export const BookingCalendarDayView: React.FC<BookingCalendarDayViewProps> = ({
  bookings,
  selectedDate,
  onDateChange,
  onClose,
  getDateLabel,
  getStationTypeLabel,
  calculateRevenue,
  onEdit,
  onDelete,
}) => {
  const [selectedBooking, setSelectedBooking] = useState<CalendarBookingInput | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const timeSlots = useMemo(() => generateCalendarTimeSlots(), []);
  const { stations, items } = useMemo(
    () => buildCalendarLayout(bookings, selectedDate),
    [bookings, selectedDate],
  );

  const dayBookings = useMemo(
    () => bookings.filter((b) => b.booking_date === selectedDate),
    [bookings, selectedDate],
  );

  const stats = useMemo(() => {
    const total = dayBookings.length;
    const completed = dayBookings.filter((b) => b.status === 'completed').length;
    const withCoupons = dayBookings.filter((b) => b.coupon_code).length;
    const revenue = calculateRevenue(dayBookings);
    return { total, completed, withCoupons, revenue };
  }, [dayBookings, calculateRevenue]);

  const nowIndicatorPx = getCurrentTimeIndicatorPx(selectedDate);
  const gridWidthPx = stations.reduce(
    (sum, s) => sum + (s.columnWidthPx ?? STATION_COLUMN_BASE_PX),
    0,
  );

  const itemsByColumn = useMemo(() => {
    const map = new Map<number, typeof items>();
    for (const item of items) {
      if (!map.has(item.columnIndex)) map.set(item.columnIndex, []);
      map.get(item.columnIndex)!.push(item);
    }
    return map;
  }, [items]);

  const openDetail = (booking: CalendarBookingInput) => {
    setSelectedBooking(booking);
    setDetailOpen(true);
  };

  const shiftDate = (delta: number) => {
    const next = delta > 0 ? addDays(new Date(selectedDate), delta) : subDays(new Date(selectedDate), -delta);
    onDateChange(format(next, 'yyyy-MM-dd'));
  };

  return (
    <>
      <Card className="overflow-hidden border-white/10 bg-gradient-to-b from-[#0c0a14] to-[#07060c] shadow-2xl shadow-black/40">
        <CardHeader className="border-b border-white/8 bg-gradient-to-r from-indigo-950/40 via-violet-950/20 to-transparent pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-cyan-500 p-2.5 shadow-lg shadow-indigo-600/25">
                <CalendarDays className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/80">
                  Station schedule
                </p>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {getDateLabel(selectedDate)}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {stations.length} station{stations.length === 1 ? '' : 's'} · {stats.total} booking
                  {stats.total === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-xl border border-white/10 bg-black/30 p-0.5">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => shiftDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="h-9 w-[140px] border-0 bg-transparent text-center text-sm focus-visible:ring-0"
                />
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => shiftDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => onDateChange(format(new Date(), 'yyyy-MM-dd'))}
                className="border-white/10 bg-white/5"
              >
                Today
              </Button>
              <Button variant="outline" onClick={onClose} className="border-white/10 gap-2">
                <Minimize2 className="h-4 w-4" />
                List view
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Bookings', value: stats.total, tone: 'text-cyan-300' },
              {
                label: 'Completed',
                value: stats.completed,
                sub: stats.total ? `${Math.round((stats.completed / stats.total) * 100)}%` : '0%',
                tone: 'text-emerald-300',
              },
              {
                label: 'Coupons',
                value: stats.withCoupons,
                sub: stats.total ? `${Math.round((stats.withCoupons / stats.total) * 100)}%` : '0%',
                tone: 'text-purple-300',
              },
              { label: 'Revenue', value: `₹${stats.revenue.toLocaleString()}`, tone: 'text-amber-200' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 backdrop-blur-sm"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{stat.label}</p>
                <p className={cn('mt-0.5 text-lg sm:text-xl font-bold tabular-nums', stat.tone)}>
                  {stat.value}
                </p>
                {'sub' in stat && stat.sub && (
                  <p className="text-[10px] text-zinc-600">{stat.sub}</p>
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {stats.total === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-4 rounded-full bg-white/5 p-5">
                <Sparkles className="h-10 w-10 text-zinc-600" />
              </div>
              <p className="text-lg font-medium text-zinc-300">No bookings this day</p>
              <p className="mt-1 text-sm text-zinc-600">Pick another date or adjust your filters</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[min(72vh,820px)] overscroll-contain">
              <div
                className="relative min-w-max"
                style={{ width: TIME_GUTTER_PX + gridWidthPx }}
              >
                {/* Sticky header row */}
                <div className="sticky top-0 z-40 flex border-b border-white/10 bg-[#0a0812]/95 backdrop-blur-md">
                  <div
                    className="sticky left-0 z-50 shrink-0 border-r border-white/10 bg-[#0a0812]/98"
                    style={{ width: TIME_GUTTER_PX, height: 72 }}
                  />
                  {stations.map((station) => {
                    const accent = getStationAccent(station.type);
                    const colW = station.columnWidthPx ?? STATION_COLUMN_BASE_PX;
                    return (
                      <div
                        key={station.key}
                        className={cn(
                          'shrink-0 overflow-hidden border-r border-white/8 px-3 py-3 bg-gradient-to-b',
                          accent.header,
                        )}
                        style={{ width: colW, minHeight: 72 }}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', accent.dot)} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-white leading-tight">
                              {station.name}
                            </p>
                            <p className="mt-0.5 truncate text-[10px] text-zinc-400">
                              {getStationTypeLabel(station.type, station.category)}
                            </p>
                            <Badge
                              variant="outline"
                              className="mt-1.5 h-5 max-w-full truncate border-white/10 bg-black/20 px-1.5 text-[10px] text-zinc-400"
                            >
                              {station.bookingCount} slot{station.bookingCount === 1 ? '' : 's'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Grid body */}
                <div className="flex">
                  {/* Time gutter */}
                  <div
                    className="sticky left-0 z-30 shrink-0 border-r border-white/10 bg-[#08070d]/98"
                    style={{ width: TIME_GUTTER_PX, height: CALENDAR_GRID_HEIGHT_PX }}
                  >
                    {timeSlots.map((slot) => (
                      <div
                        key={slot.hour}
                        className="relative border-b border-white/[0.06] pr-2 text-right"
                        style={{ height: HOUR_HEIGHT_PX }}
                      >
                        <span className="absolute -top-2.5 right-2 text-[11px] font-semibold tabular-nums text-zinc-500">
                          {slot.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Station columns — each clipped so blocks never bleed sideways */}
                  <div className="relative flex" style={{ height: CALENDAR_GRID_HEIGHT_PX }}>
                    {/* Shared grid lines behind columns */}
                    <div
                      className="pointer-events-none absolute inset-0 z-0"
                      style={{ width: gridWidthPx }}
                    >
                      {timeSlots.map((slot, i) => (
                        <div
                          key={slot.hour}
                          className={cn(
                            'absolute left-0 right-0 border-b',
                            i % 2 === 0 ? 'border-white/[0.07]' : 'border-white/[0.04]',
                          )}
                          style={{ top: i * HOUR_HEIGHT_PX, height: HOUR_HEIGHT_PX }}
                        />
                      ))}
                      {timeSlots.map((slot, i) => (
                        <div
                          key={`half-${slot.hour}`}
                          className="absolute left-0 right-0 border-b border-dashed border-white/[0.03]"
                          style={{ top: i * HOUR_HEIGHT_PX + HOUR_HEIGHT_PX / 2 }}
                        />
                      ))}
                      {nowIndicatorPx != null && (
                        <div
                          className="absolute left-0 right-0 z-10"
                          style={{ top: nowIndicatorPx }}
                        >
                          <div className="relative h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_rgba(244,63,94,0.6)]">
                            <div className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-rose-300/50" />
                          </div>
                        </div>
                      )}
                    </div>

                    {stations.map((station, colIdx) => {
                      const colW = station.columnWidthPx ?? STATION_COLUMN_BASE_PX;
                      const colItems = itemsByColumn.get(colIdx) ?? [];

                      return (
                        <div
                          key={station.key}
                          className="relative z-[1] shrink-0 overflow-hidden border-r border-white/[0.06]"
                          style={{ width: colW, height: CALENDAR_GRID_HEIGHT_PX }}
                        >
                          {colItems.map((item) => {
                            const { booking, topPx, heightPx, laneIndex, laneCount, columnWidthPx } =
                              item;
                            const { left, width } = blockGeometry({
                              laneIndex,
                              laneCount,
                              columnWidthPx,
                            });

                            const compact = heightPx < 52;
                            const tiny = heightPx < 36;

                            return (
                              <button
                                key={booking.id}
                                type="button"
                                onClick={() => openDetail(booking)}
                                title={`${booking.customer.name} · ${formatCalendarTime(booking.start_time)} – ${formatCalendarTime(booking.end_time)}`}
                                className={cn(
                                  'absolute box-border overflow-hidden rounded-lg border bg-gradient-to-br text-left',
                                  'shadow-sm shadow-black/25 transition-shadow duration-150',
                                  'hover:z-20 hover:shadow-md hover:shadow-indigo-500/15',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60',
                                  getBookingBlockAccent(booking),
                                )}
                                style={{
                                  top: topPx,
                                  height: heightPx,
                                  left,
                                  width,
                                  maxWidth: colW - COLUMN_PAD_PX * 2,
                                }}
                              >
                                <div className="flex h-full min-w-0 flex-col px-1.5 py-1">
                                  <p
                                    className={cn(
                                      'min-w-0 truncate font-bold text-white leading-tight',
                                      tiny ? 'text-[10px]' : 'text-xs',
                                    )}
                                  >
                                    {booking.customer.name}
                                  </p>
                                  {!tiny && (
                                    <p className="mt-0.5 min-w-0 truncate text-[10px] text-white/70">
                                      {compact ? (
                                        formatCalendarTime(booking.start_time)
                                      ) : (
                                        <>
                                          {formatCalendarTime(booking.start_time)} –{' '}
                                          {formatCalendarTime(booking.end_time)}
                                        </>
                                      )}
                                    </p>
                                  )}
                                  {!compact && heightPx >= 68 && (
                                    <div className="mt-auto flex min-w-0 items-center gap-1 overflow-hidden pt-0.5">
                                      <BookingStatusBadge status={booking.status} />
                                      {booking.coupon_code && (
                                        <Gift className="h-3 w-3 shrink-0 text-purple-300" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* Now time label — spans full grid width */}
                    {nowIndicatorPx != null && (
                      <div
                        className="pointer-events-none absolute left-0 z-20"
                        style={{ top: nowIndicatorPx, width: gridWidthPx }}
                      >
                        <span className="absolute -top-6 left-1 rounded-md bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
                          {format(new Date(), 'HH:mm')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <BookingCalendarDetailDialog
        booking={selectedBooking}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={onEdit}
        onDelete={onDelete}
        getStationTypeLabel={getStationTypeLabel}
      />
    </>
  );
};
