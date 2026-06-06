export const CALENDAR_START_HOUR = 11;
export const CALENDAR_END_HOUR = 23;
export const CALENDAR_HOURS = CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1;
export const HOUR_HEIGHT_PX = 56;
export const CALENDAR_GRID_HEIGHT_PX = CALENDAR_HOURS * HOUR_HEIGHT_PX;
export const STATION_COLUMN_BASE_PX = 156;
export const STATION_COLUMN_LANE_PX = 72;
export const TIME_GUTTER_PX = 72;
export const COLUMN_PAD_PX = 4;
export const BLOCK_GAP_PX = 2;
export const MIN_BLOCK_HEIGHT_PX = 22;

/** @deprecated use STATION_COLUMN_BASE_PX */
export const STATION_COLUMN_MIN_PX = STATION_COLUMN_BASE_PX;

export interface CalendarBookingInput {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  original_price?: number | null;
  final_price?: number | null;
  discount_percentage?: number | null;
  coupon_code?: string | null;
  booking_group_id?: string | null;
  payment_mode?: string | null;
  payment_txn_id?: string | null;
  player_count?: number;
  station: {
    name: string;
    type: string;
    category?: string | null;
  };
  customer: {
    name: string;
    phone: string;
    email?: string | null;
    created_at?: string;
  };
  booking_views?: Array<{
    id: string;
    booking_id: string;
    access_code: string;
    created_at: string;
    last_accessed_at?: string;
  }>;
  created_at?: string;
}

export interface CalendarStationColumn {
  key: string;
  name: string;
  type: string;
  category?: string | null;
  bookingCount: number;
  columnWidthPx?: number;
}

export interface CalendarLayoutItem {
  booking: CalendarBookingInput;
  stationKey: string;
  topPx: number;
  heightPx: number;
  columnIndex: number;
  laneIndex: number;
  laneCount: number;
  columnWidthPx: number;
}

const TYPE_ORDER: Record<string, number> = {
  ps5: 0,
  vr: 1,
  '8ball': 2,
};

function stationKey(name: string): string {
  return name.trim() || 'Unknown';
}

function parseMinutesFromMidnight(time: string): number {
  const d = new Date(`2000-01-01T${time}`);
  return d.getHours() * 60 + d.getMinutes();
}

function parseBookingEndMinutes(startTime: string, endTime: string): number {
  let end = parseMinutesFromMidnight(endTime);
  const start = parseMinutesFromMidnight(startTime);
  if (endTime === '00:00:00' || (end === 0 && start > 0)) {
    end = 24 * 60;
  }
  if (end <= start && end < 12 * 60) {
    end += 24 * 60;
  }
  return end;
}

export function formatCalendarTime(timeString: string): string {
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function generateCalendarTimeSlots(): Array<{ hour: number; label: string }> {
  const slots = [];
  for (let hour = CALENDAR_START_HOUR; hour <= CALENDAR_END_HOUR; hour++) {
    const displayHour = hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const timeLabel = hour === 12 ? '12:00 PM' : `${displayHour}:00 ${ampm}`;
    slots.push({ hour, label: timeLabel });
  }
  return slots;
}

export function getStationAccent(type: string): {
  header: string;
  block: string;
  border: string;
  dot: string;
} {
  switch (type) {
    case 'ps5':
      return {
        header: 'from-blue-600/25 via-indigo-600/15 to-blue-950/40',
        block: 'from-blue-600/35 via-indigo-700/25 to-blue-950/50',
        border: 'border-blue-400/45',
        dot: 'bg-blue-400',
      };
    case 'vr':
      return {
        header: 'from-violet-600/25 via-purple-600/15 to-violet-950/40',
        block: 'from-violet-600/35 via-purple-700/25 to-violet-950/50',
        border: 'border-violet-400/45',
        dot: 'bg-violet-400',
      };
    case '8ball':
      return {
        header: 'from-emerald-600/25 via-teal-600/15 to-emerald-950/40',
        block: 'from-emerald-600/35 via-teal-700/25 to-emerald-950/50',
        border: 'border-emerald-400/45',
        dot: 'bg-emerald-400',
      };
    default:
      return {
        header: 'from-cyan-600/20 via-slate-600/15 to-slate-950/40',
        block: 'from-cyan-600/30 via-slate-700/20 to-slate-950/50',
        border: 'border-cyan-400/40',
        dot: 'bg-cyan-400',
      };
  }
}

export function getBookingBlockAccent(booking: CalendarBookingInput): string {
  if (booking.status === 'cancelled' || booking.status === 'no-show') {
    return 'from-rose-900/40 to-rose-950/30 border-rose-500/35';
  }
  if (booking.coupon_code) {
    return 'from-purple-600/40 via-fuchsia-700/25 to-purple-950/45 border-purple-400/50';
  }
  if (booking.payment_mode && booking.payment_mode !== 'venue') {
    return 'from-emerald-600/40 via-teal-700/25 to-emerald-950/45 border-emerald-400/50';
  }
  const station = getStationAccent(booking.station?.type || '');
  return `${station.block} ${station.border}`;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

interface EnrichedBooking {
  booking: CalendarBookingInput;
  startMin: number;
  endMin: number;
}

function maxConcurrentDuring(item: EnrichedBooking, peers: EnrichedBooking[]): number {
  const overlapping = peers.filter((o) =>
    overlaps(item.startMin, item.endMin, o.startMin, o.endMin),
  );
  if (overlapping.length <= 1) return 1;

  const events: Array<{ t: number; delta: number }> = [];
  for (const o of overlapping) {
    events.push({ t: o.startMin, delta: 1 });
    events.push({ t: o.endMin, delta: -1 });
  }
  events.sort((a, b) => a.t - b.t || a.delta - b.delta);

  let current = 0;
  let max = 0;
  for (const e of events) {
    current += e.delta;
    max = Math.max(max, current);
  }
  return Math.max(1, max);
}

/** Greedy lane assignment: each booking gets the first lane free at its start time. */
function assignLanes(enriched: EnrichedBooking[]): Map<string, number> {
  const sorted = [...enriched].sort(
    (a, b) => a.startMin - b.startMin || a.endMin - b.endMin || a.booking.id.localeCompare(b.booking.id),
  );
  const laneEnds: number[] = [];
  const lanes = new Map<string, number>();

  for (const item of sorted) {
    let lane = laneEnds.findIndex((end) => end <= item.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endMin);
    } else {
      laneEnds[lane] = item.endMin;
    }
    lanes.set(item.booking.id, lane);
  }

  return lanes;
}

function stationColumnWidthPx(maxLanes: number): number {
  if (maxLanes <= 1) return STATION_COLUMN_BASE_PX;
  return Math.max(STATION_COLUMN_BASE_PX, maxLanes * STATION_COLUMN_LANE_PX + COLUMN_PAD_PX * 2);
}

function minutesToPx(minutesFromViewStart: number, viewSpanMin: number): number {
  return (minutesFromViewStart / viewSpanMin) * CALENDAR_GRID_HEIGHT_PX;
}

export function buildCalendarLayout(
  bookings: CalendarBookingInput[],
  selectedDate: string,
): { stations: CalendarStationColumn[]; items: CalendarLayoutItem[] } {
  const dayBookings = bookings.filter((b) => b.booking_date === selectedDate);
  const viewStartMin = CALENDAR_START_HOUR * 60;
  const viewEndMin = (CALENDAR_END_HOUR + 1) * 60;
  const viewSpanMin = viewEndMin - viewStartMin;

  const stationMap = new Map<string, CalendarStationColumn>();
  for (const b of dayBookings) {
    const key = stationKey(b.station?.name || 'Unknown');
    if (!stationMap.has(key)) {
      stationMap.set(key, {
        key,
        name: b.station?.name || 'Unknown',
        type: b.station?.type || 'unknown',
        category: b.station?.category,
        bookingCount: 0,
      });
    }
    stationMap.get(key)!.bookingCount += 1;
  }

  const stations = [...stationMap.values()].sort((a, b) => {
    const ta = TYPE_ORDER[a.type] ?? 99;
    const tb = TYPE_ORDER[b.type] ?? 99;
    if (ta !== tb) return ta - tb;
    return a.name.localeCompare(b.name);
  });

  const stationIndex = new Map(stations.map((s, i) => [s.key, i]));
  const byStation = new Map<string, CalendarBookingInput[]>();
  for (const b of dayBookings) {
    const key = stationKey(b.station?.name || 'Unknown');
    if (!byStation.has(key)) byStation.set(key, []);
    byStation.get(key)!.push(b);
  }

  const items: CalendarLayoutItem[] = [];
  const columnWidths: number[] = [];

  for (const [key, stationBookings] of byStation) {
    const columnIndex = stationIndex.get(key) ?? 0;
    const enriched: EnrichedBooking[] = stationBookings
      .map((booking) => {
        const startMin = parseMinutesFromMidnight(booking.start_time);
        const endMin = parseBookingEndMinutes(booking.start_time, booking.end_time);
        return { booking, startMin, endMin };
      })
      .filter(({ startMin, endMin }) => endMin > viewStartMin && startMin < viewEndMin)
      .sort((a, b) => a.startMin - b.startMin || a.booking.id.localeCompare(b.booking.id));

    if (enriched.length === 0) continue;

    const laneById = assignLanes(enriched);
    let stationMaxLanes = 1;
    for (const item of enriched) {
      stationMaxLanes = Math.max(stationMaxLanes, maxConcurrentDuring(item, enriched));
    }
    const columnWidthPx = stationColumnWidthPx(stationMaxLanes);
    columnWidths[columnIndex] = columnWidthPx;

    for (const current of enriched) {
      const laneIndex = laneById.get(current.booking.id) ?? 0;
      const laneCount = maxConcurrentDuring(current, enriched);

      const clampedStart = Math.max(current.startMin, viewStartMin);
      const clampedEnd = Math.min(current.endMin, viewEndMin);
      const durationMin = Math.max(0, clampedEnd - clampedStart);

      let topPx = minutesToPx(clampedStart - viewStartMin, viewSpanMin) + BLOCK_GAP_PX / 2;
      let heightPx = minutesToPx(durationMin, viewSpanMin) - BLOCK_GAP_PX;

      if (durationMin > 0) {
        heightPx = Math.max(MIN_BLOCK_HEIGHT_PX, heightPx);
      } else {
        heightPx = MIN_BLOCK_HEIGHT_PX;
      }

      const maxBottom = CALENDAR_GRID_HEIGHT_PX - BLOCK_GAP_PX / 2;
      if (topPx + heightPx > maxBottom) {
        heightPx = Math.max(MIN_BLOCK_HEIGHT_PX, maxBottom - topPx);
      }
      topPx = Math.max(BLOCK_GAP_PX / 2, Math.min(topPx, maxBottom - MIN_BLOCK_HEIGHT_PX));

      items.push({
        booking: current.booking,
        stationKey: key,
        topPx,
        heightPx,
        columnIndex,
        laneIndex,
        laneCount,
        columnWidthPx,
      });
    }
  }

  // Attach column width to station metadata for rendering
  const stationsWithWidth = stations.map((s, i) => ({
    ...s,
    columnWidthPx: columnWidths[i] ?? STATION_COLUMN_BASE_PX,
  }));

  return { stations: stationsWithWidth, items };
}

export function getCurrentTimeIndicatorPx(selectedDate: string, now = new Date()): number | null {
  const today = now.toISOString().slice(0, 10);
  if (selectedDate !== today) return null;
  const hour = now.getHours();
  const minute = now.getMinutes();
  if (hour < CALENDAR_START_HOUR || hour > CALENDAR_END_HOUR) return null;
  const minutesFromStart = (hour - CALENDAR_START_HOUR) * 60 + minute;
  return (minutesFromStart / (CALENDAR_HOURS * 60)) * CALENDAR_GRID_HEIGHT_PX;
}
