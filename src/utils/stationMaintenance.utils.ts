import type { Station } from '@/types/pos.types';
import type { StationMaintenancePeriod } from '@/types/stationMaintenance.types';

export function isStationInMaintenance(station: Pick<Station, 'maintenanceMode'>): boolean {
  return Boolean(station.maintenanceMode);
}

export function getMaintenanceRemainingMs(station: Station, now = new Date()): number {
  if (!station.maintenancePlannedEndAt) return 0;
  return Math.max(0, new Date(station.maintenancePlannedEndAt).getTime() - now.getTime());
}

export function isMaintenanceExpired(station: Station, now = new Date()): boolean {
  if (!station.maintenanceMode || !station.maintenancePlannedEndAt) return false;
  return getMaintenanceRemainingMs(station, now) <= 0;
}

export function formatMaintenanceCountdown(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatMaintenanceElapsed(station: Station, now = new Date()): string {
  if (!station.maintenanceStartedAt) return '00:00';
  const elapsedMs = Math.max(0, now.getTime() - new Date(station.maintenanceStartedAt).getTime());
  return formatMaintenanceCountdown(elapsedMs);
}

export function transformMaintenancePeriodRow(row: Record<string, unknown>): StationMaintenancePeriod {
  return {
    id: String(row.id),
    stationId: String(row.station_id),
    locationId: String(row.location_id),
    startedAt: new Date(row.started_at as string),
    plannedEndAt: new Date(row.planned_end_at as string),
    endedAt: row.ended_at ? new Date(row.ended_at as string) : null,
    startedByName: String(row.started_by_name ?? ''),
  };
}

export function getMaintenanceDurationMinutes(period: Pick<StationMaintenancePeriod, 'startedAt' | 'endedAt' | 'plannedEndAt'>): number {
  const startMs = new Date(period.startedAt).getTime();
  const endMs = period.endedAt
    ? new Date(period.endedAt).getTime()
    : new Date(period.plannedEndAt).getTime();
  return Math.max(1, Math.round((endMs - startMs) / (1000 * 60)));
}
