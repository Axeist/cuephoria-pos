/**
 * Public booking slot generation + in-memory availability (single DB fetch per day).
 */

export const PUBLIC_BOOKING_OPEN_HOUR = 11;
export const PUBLIC_BOOKING_CLOSE_HOUR = 23;
/** VR: up to 4 bookings per 1-hour block (not 15-min slots). */
export const VR_HOURLY_PASSES = 4;
/** Each VR pass is a 15-minute play session within the booked hour. */
export const VR_PASS_DURATION_MINUTES = 15;

export type PublicTimeSlot = {
  start_time: string;
  end_time: string;
  is_available: boolean;
  status?: 'available' | 'booked' | 'elapsed';
};

export type DayOccupancyRow = {
  station_id: string;
  start_time: string;
  end_time: string;
};

export type PublicBookingStationRef = {
  id: string;
  type: string;
  slot_duration?: number | null;
  team_name?: string | null;
};

const ACTIVE_BOOKING_STATUSES = ['confirmed', 'in-progress'] as const;

export function getPublicSlotDurationMinutes(station: PublicBookingStationRef): number {
  if (station.slot_duration && station.slot_duration > 0) {
    return station.slot_duration;
  }
  if (station.type === 'vr') return 60;
  return 60;
}

/**
 * Public booking allows VR (15-min passes within the hour) alongside PS5/pool
 * (full-hour sessions) in the same time slot. Non-VR stations must still match
 * each other's slot duration (e.g. 30-min event vs 60-min regular).
 */
export function canMixPublicBookingStations(
  selected: PublicBookingStationRef[],
  candidate: PublicBookingStationRef,
): boolean {
  if (selected.length === 0) return true;

  const vrInvolved =
    candidate.type === 'vr' || selected.some((s) => s.type === 'vr');

  if (vrInvolved) {
    const nonVr =
      candidate.type === 'vr'
        ? selected.filter((s) => s.type !== 'vr')
        : [...selected.filter((s) => s.type !== 'vr'), candidate];
    if (nonVr.length <= 1) return true;
    const durations = new Set(nonVr.map((s) => getPublicSlotDurationMinutes(s)));
    return durations.size === 1;
  }

  const refDuration = getPublicSlotDurationMinutes(selected[0]);
  return getPublicSlotDurationMinutes(candidate) === refDuration;
}

function parseTimeToMinutes(t: string): number {
  const parts = t.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

/** Mirrors check_stations_availability overlap rules. */
export function bookingOverlapsSlot(
  bookingStart: string,
  bookingEnd: string,
  slotStart: string,
  slotEnd: string
): boolean {
  const bs = parseTimeToMinutes(bookingStart);
  const be = parseTimeToMinutes(bookingEnd);
  const ss = parseTimeToMinutes(slotStart);
  const se = parseTimeToMinutes(slotEnd);
  const beAdj = be <= bs ? be + 24 * 60 : be;
  const seAdj = se <= ss ? se + 24 * 60 : se;
  return (
    (bs <= ss && beAdj > ss) ||
    (bs < seAdj && beAdj >= seAdj) ||
    (bs >= ss && beAdj <= seAdj) ||
    (bs <= ss && beAdj >= seAdj)
  );
}

export function countOverlappingBookings(
  stationId: string,
  slotStart: string,
  slotEnd: string,
  rows: DayOccupancyRow[]
): number {
  return rows.filter(
    (r) =>
      r.station_id === stationId &&
      bookingOverlapsSlot(r.start_time, r.end_time, slotStart, slotEnd)
  ).length;
}

function hourSlotTimes(hour: number): { start_time: string; end_time: string } {
  const start_time = `${hour.toString().padStart(2, '0')}:00:00`;
  const endHour = hour + 1;
  const end_time = endHour >= 24 ? '00:00:00' : `${endHour.toString().padStart(2, '0')}:00:00`;
  return { start_time, end_time };
}

function isSlotInPast(hour: number, isToday: boolean): boolean {
  if (!isToday) return false;
  const now = new Date();
  return hour < now.getHours() || (hour === now.getHours() && now.getMinutes() >= 0);
}

type BuildSlotsParams = {
  stations: PublicBookingStationRef[];
  stationType: 'all' | 'ps5' | '8ball' | 'vr';
  selectedStationIds: string[];
  bookings: DayOccupancyRow[];
  sessionBlocks: DayOccupancyRow[];
  isToday: boolean;
};

export function buildPublicBookingSlots(params: BuildSlotsParams): PublicTimeSlot[] {
  const { stations, stationType, selectedStationIds, bookings, sessionBlocks, isToday } =
    params;

  let pool = stations;
  if (stationType !== 'all') {
    pool = pool.filter((s) => s.type === stationType);
  }
  if (selectedStationIds.length > 0) {
    pool = pool.filter((s) => selectedStationIds.includes(s.id));
  }
  if (pool.length === 0) return [];

  const occupancy = [...bookings, ...sessionBlocks];
  const slots: PublicTimeSlot[] = [];

  for (let hour = PUBLIC_BOOKING_OPEN_HOUR; hour <= PUBLIC_BOOKING_CLOSE_HOUR; hour++) {
    const { start_time, end_time } = hourSlotTimes(hour);

    if (isSlotInPast(hour, isToday)) {
      slots.push({ start_time, end_time, is_available: false, status: 'elapsed' });
      continue;
    }

    const vrStations = pool.filter((s) => s.type === 'vr');
    const nonVrStations = pool.filter((s) => s.type !== 'vr');

    let anyAvailable = false;

    for (const station of nonVrStations) {
      const overlaps = countOverlappingBookings(station.id, start_time, end_time, occupancy);
      if (overlaps === 0) {
        anyAvailable = true;
        break;
      }
    }

    for (const station of vrStations) {
      const overlaps = countOverlappingBookings(station.id, start_time, end_time, occupancy);
      if (overlaps < VR_HOURLY_PASSES) anyAvailable = true;
    }

    slots.push({
      start_time,
      end_time,
      is_available: anyAvailable,
      status: anyAvailable ? 'available' : 'booked',
    });
  }

  return slots;
}

/** VR passes remaining for one station in a given hour slot. */
export function vrPassesLeftForSlot(
  stationId: string,
  slot: { start_time: string; end_time: string },
  bookings: DayOccupancyRow[],
  sessionBlocks: DayOccupancyRow[]
): number {
  const occupancy = [...bookings, ...sessionBlocks];
  const overlaps = countOverlappingBookings(
    stationId,
    slot.start_time,
    slot.end_time,
    occupancy
  );
  return Math.max(0, VR_HOURLY_PASSES - overlaps);
}

function minutesToTimeString(totalMinutes: number): string {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
}

export function stationsAvailableForSlot(
  stations: PublicBookingStationRef[],
  slot: { start_time: string; end_time: string },
  bookings: DayOccupancyRow[],
  sessionBlocks: DayOccupancyRow[],
  stationType: 'all' | 'ps5' | '8ball' | 'vr'
): string[] {
  const occupancy = [...bookings, ...sessionBlocks];
  let pool = stations;
  if (stationType !== 'all') {
    pool = pool.filter((s) => s.type === stationType);
  }

  const teamGroups = new Map<string, string[]>();
  pool.forEach((s) => {
    if (s.team_name) {
      if (!teamGroups.has(s.team_name)) teamGroups.set(s.team_name, []);
      teamGroups.get(s.team_name)!.push(s.id);
    }
  });

  const available: string[] = [];

  for (const station of pool) {
    const overlaps = countOverlappingBookings(
      station.id,
      slot.start_time,
      slot.end_time,
      occupancy
    );
    const ok =
      station.type === 'vr'
        ? overlaps < VR_HOURLY_PASSES
        : overlaps === 0;
    if (ok) available.push(station.id);
  }

  const blockedTeams = new Set<string>();
  teamGroups.forEach((ids, teamName) => {
    const anyBooked = ids.some((id) => {
      const overlaps = countOverlappingBookings(
        id,
        slot.start_time,
        slot.end_time,
        occupancy
      );
      if (pool.find((s) => s.id === id)?.type === 'vr') {
        return overlaps >= VR_HOURLY_PASSES;
      }
      return overlaps > 0;
    });
    if (anyBooked) blockedTeams.add(teamName);
  });

  return available.filter((id) => {
    const st = pool.find((s) => s.id === id);
    if (st?.team_name && blockedTeams.has(st.team_name)) {
      const teamIds = teamGroups.get(st.team_name)!;
      const teamHasBooking = teamIds.some((tid) => {
        const overlaps = countOverlappingBookings(
          tid,
          slot.start_time,
          slot.end_time,
          occupancy
        );
        const tStation = pool.find((s) => s.id === tid);
        return tStation?.type === 'vr'
          ? overlaps >= VR_HOURLY_PASSES
          : overlaps > 0;
      });
      if (teamHasBooking) return false;
    }
    return true;
  });
}

export async function fetchDayOccupancy(
  dateStr: string,
  locationId: string,
  stationIds: string[]
): Promise<{ bookings: DayOccupancyRow[]; sessionBlocks: DayOccupancyRow[] }> {
  const { supabase } = await import('@/integrations/supabase/client');

  if (stationIds.length === 0) {
    return { bookings: [], sessionBlocks: [] };
  }

  const dayStart = `${dateStr}T00:00:00`;
  const dayEnd = `${dateStr}T23:59:59.999`;

  const [bookingsRes, sessionsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('station_id, start_time, end_time')
      .eq('booking_date', dateStr)
      .eq('location_id', locationId)
      .in('status', [...ACTIVE_BOOKING_STATUSES])
      .in('station_id', stationIds),
    supabase
      .from('sessions')
      .select('station_id, start_time, planned_duration_minutes')
      .eq('location_id', locationId)
      .in('station_id', stationIds)
      .is('end_time', null)
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd),
  ]);

  if (bookingsRes.error) throw bookingsRes.error;

  let sessionRows = sessionsRes.data;
  if (sessionsRes.error) {
    const fallback = await supabase
      .from('sessions')
      .select('station_id, start_time')
      .eq('location_id', locationId)
      .in('station_id', stationIds)
      .is('end_time', null)
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd);
    if (fallback.error) throw fallback.error;
    sessionRows = fallback.data;
  }

  const bookings = ((bookingsRes.data || []) as DayOccupancyRow[]).map((r) => ({
    station_id: r.station_id,
    start_time: r.start_time,
    end_time: r.end_time,
  }));

  const sessionBlocks: DayOccupancyRow[] = [];
  for (const s of (sessionRows || []) as {
    station_id: string;
    start_time: string;
    planned_duration_minutes?: number | null;
  }[]) {
    const start = s.start_time?.includes('T')
      ? s.start_time.split('T')[1]?.slice(0, 8) || s.start_time
      : s.start_time;
    const durationMin =
      s.planned_duration_minutes != null && s.planned_duration_minutes > 0
        ? s.planned_duration_minutes
        : 60;
    const endMin = parseTimeToMinutes(start) + durationMin;
    sessionBlocks.push({
      station_id: s.station_id,
      start_time: start,
      end_time: minutesToTimeString(endMin),
    });
  }

  return { bookings, sessionBlocks };
}
