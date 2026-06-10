/** Workspace + branch session length configuration for public booking. */

export type BookingSlotMinutes = 30 | 60;

export const BOOKING_SLOT_CONFIG_KEY = "booking_slot_config";

export type BranchBookingSlotConfig = {
  /** When true (default), branch uses workspace defaults. */
  use_workspace_defaults?: boolean;
  slot_interval_minutes?: BookingSlotMinutes;
  minimum_booking_minutes?: BookingSlotMinutes;
  switched_at?: string;
};

export type WorkspaceBookingSlotDefaults = {
  slot_interval_minutes: BookingSlotMinutes;
  minimum_booking_minutes: BookingSlotMinutes;
};

export type ResolvedBookingSlotConfig = {
  slot_interval_minutes: BookingSlotMinutes;
  minimum_booking_minutes: BookingSlotMinutes;
  /** Grid slots required per minimum session block (1 or 2). */
  slots_per_minimum: number;
  /** Uses workspace defaults (no branch override). */
  from_workspace_defaults: boolean;
};

export type BookingTimeWindow = {
  start_time: string;
  end_time: string;
  duration: number;
};
