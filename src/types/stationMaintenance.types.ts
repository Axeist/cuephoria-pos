export interface StationMaintenancePeriod {
  id: string;
  stationId: string;
  locationId: string;
  startedAt: Date;
  plannedEndAt: Date;
  endedAt?: Date | null;
  startedByName: string;
}

export const MAINTENANCE_DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const;

export type MaintenanceDurationMinutes = (typeof MAINTENANCE_DURATION_OPTIONS)[number];

export type ReportStationActivity =
  | {
      kind: 'session';
      id: string;
      stationId: string;
      customerId: string;
      startTime: Date;
      endTime?: Date;
      duration?: number;
    }
  | {
      kind: 'maintenance';
      id: string;
      stationId: string;
      startTime: Date;
      endTime?: Date | null;
      plannedEndAt: Date;
      startedByName: string;
    };
