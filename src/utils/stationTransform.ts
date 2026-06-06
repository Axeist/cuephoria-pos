import type { Session, Station } from '@/types/pos.types';
import type { OccupancyRates } from '@/utils/stationPricing';
import { parsePrepaidBookingLink } from '@/utils/prepaidBooking.core';

/** Matches Station Command “On booking page” / `eventEnabled` in transformStationRow. */
export function isStationPublicBookable(row: {
  category?: string | null;
  event_enabled?: boolean | null;
}): boolean {
  if (row.category === 'nit_event') return false;
  return row.event_enabled ?? (row.category ? false : true);
}

export function parseOccupancyRates(raw: unknown): OccupancyRates {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: OccupancyRates = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const num = Number(v);
    if (Number.isFinite(num) && num >= 0) out[k] = num;
  }
  return out;
}

export function parseCurrentSession(
  raw: unknown,
  stationId: string
): Session | null {
  if (!raw) return null;
  try {
    const sessionData =
      typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown>);

    if (!sessionData?.id) return null;

    return {
      id: String(sessionData.id),
      stationId: String(sessionData.stationId ?? sessionData.station_id ?? stationId),
      customerId: String(sessionData.customerId ?? sessionData.customer_id ?? ''),
      startTime: new Date(sessionData.startTime ?? sessionData.start_time),
      endTime: sessionData.endTime
        ? new Date(sessionData.endTime as string)
        : sessionData.end_time
          ? new Date(sessionData.end_time as string)
          : undefined,
      duration: sessionData.duration as number | undefined,
      hourlyRate: Number(sessionData.hourlyRate ?? sessionData.hourly_rate ?? 0) || undefined,
      originalRate: Number(sessionData.originalRate ?? sessionData.original_rate ?? 0) || undefined,
      couponCode: (sessionData.couponCode ?? sessionData.coupon_code) as string | undefined,
      discountAmount:
        Number(sessionData.discountAmount ?? sessionData.discount_amount ?? 0) || undefined,
      playerCount: Number(sessionData.playerCount ?? sessionData.player_count ?? 1) || 1,
      perPersonRate:
        Number(sessionData.perPersonRate ?? sessionData.per_person_rate ?? 0) || undefined,
      isPaused: Boolean(sessionData.isPaused ?? sessionData.is_paused),
      pausedAt:
        sessionData.pausedAt || sessionData.paused_at
          ? new Date((sessionData.pausedAt ?? sessionData.paused_at) as string)
          : undefined,
      totalPausedMs: Number(sessionData.totalPausedMs ?? sessionData.total_paused_time ?? 0) || 0,
      plannedDurationMinutes:
        Number(
          sessionData.plannedDurationMinutes ??
            sessionData.planned_duration_minutes ??
            0
        ) || undefined,
      sessionGroupId:
        (sessionData.sessionGroupId ?? sessionData.session_group_id) != null
          ? String(sessionData.sessionGroupId ?? sessionData.session_group_id)
          : undefined,
      prepaidBooking: parsePrepaidBookingLink(sessionData.prepaidBooking ?? sessionData.prepaid_booking),
    };
  } catch {
    return null;
  }
}

export function transformStationRow(item: Record<string, unknown>): Station {
  const occupancyRates = parseOccupancyRates(item.occupancy_rates);
  const maxPlayers = Math.max(
    1,
    Number(item.max_players ?? item.max_capacity ?? 1) || 1
  );
  const pricingModeRaw = item.pricing_mode as string | undefined;
  const pricingMode: Station['pricingMode'] =
    pricingModeRaw === 'per_player' || pricingModeRaw === 'static'
      ? pricingModeRaw
      : Object.keys(occupancyRates).length > 0
        ? 'per_player'
        : 'static';

  return {
    id: String(item.id),
    name: String(item.name),
    type: item.type as Station['type'],
    hourlyRate: Number(item.hourly_rate) || 0,
    isOccupied: Boolean(item.is_occupied),
    currentSession: parseCurrentSession(item.currentsession, String(item.id)),
    category: (item.category as string | null) ?? null,
    eventEnabled:
      typeof item.event_enabled === 'boolean'
        ? item.event_enabled
        : item.category
          ? false
          : true,
    slotDuration: item.slot_duration != null ? Number(item.slot_duration) : null,
    maxPlayers,
    occupancyRates,
    pricingMode,
    teamName: (item.team_name as string | null) ?? null,
    teamColor: (item.team_color as string | null) ?? null,
    maxCapacity: item.max_capacity != null ? Number(item.max_capacity) : null,
    singleRate: item.single_rate != null ? Number(item.single_rate) : null,
  };
}

export const STATION_SELECT_FIELDS =
  'id,name,type,hourly_rate,is_occupied,currentsession,created_at,category,event_enabled,slot_duration,max_players,occupancy_rates,pricing_mode,team_name,team_color,max_capacity,single_rate';
