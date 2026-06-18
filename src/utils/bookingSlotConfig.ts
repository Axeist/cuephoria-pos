import type {
  BookingSlotMinutes,
  BookingTimeWindow,
  BranchBookingSlotConfig,
  ResolvedBookingSlotConfig,
  WorkspaceBookingSlotDefaults,
} from "../types/bookingSlotConfig.js";

export const DEFAULT_SLOT_INTERVAL_MINUTES: BookingSlotMinutes = 60;
export const DEFAULT_MINIMUM_BOOKING_MINUTES: BookingSlotMinutes = 60;

export const DEFAULT_WORKSPACE_SLOT_DEFAULTS: WorkspaceBookingSlotDefaults = {
  slot_interval_minutes: DEFAULT_SLOT_INTERVAL_MINUTES,
  minimum_booking_minutes: DEFAULT_MINIMUM_BOOKING_MINUTES,
};

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function normalizeSlotMinutes(value: unknown, fallback: BookingSlotMinutes): BookingSlotMinutes {
  const n = Number(value);
  if (n === 30 || n === 60) return n;
  return fallback;
}

export function isValidSlotCombo(
  interval: BookingSlotMinutes,
  minimum: BookingSlotMinutes,
): boolean {
  if (minimum < interval) return false;
  return minimum % interval === 0;
}

export function parseBranchBookingSlotConfig(raw: unknown): BranchBookingSlotConfig {
  const r = asRecord(raw);
  const interval = r.slot_interval_minutes != null
    ? normalizeSlotMinutes(r.slot_interval_minutes, DEFAULT_SLOT_INTERVAL_MINUTES)
    : undefined;
  const minimum = r.minimum_booking_minutes != null
    ? normalizeSlotMinutes(r.minimum_booking_minutes, DEFAULT_MINIMUM_BOOKING_MINUTES)
    : undefined;
  return {
    use_workspace_defaults: r.use_workspace_defaults !== false,
    slot_interval_minutes: interval,
    minimum_booking_minutes: minimum,
    switched_at: typeof r.switched_at === "string" ? r.switched_at : undefined,
  };
}

export function parseWorkspaceSlotDefaults(raw: {
  default_slot_interval_minutes?: unknown;
  default_minimum_booking_minutes?: unknown;
} | null | undefined): WorkspaceBookingSlotDefaults {
  if (!raw) return { ...DEFAULT_WORKSPACE_SLOT_DEFAULTS };
  const interval = normalizeSlotMinutes(
    raw.default_slot_interval_minutes,
    DEFAULT_SLOT_INTERVAL_MINUTES,
  );
  let minimum = normalizeSlotMinutes(
    raw.default_minimum_booking_minutes,
    DEFAULT_MINIMUM_BOOKING_MINUTES,
  );
  if (!isValidSlotCombo(interval, minimum)) {
    minimum = interval;
  }
  return { slot_interval_minutes: interval, minimum_booking_minutes: minimum };
}

export function resolveBookingSlotConfig(
  workspace: WorkspaceBookingSlotDefaults,
  branchOverride: BranchBookingSlotConfig | null | undefined,
): ResolvedBookingSlotConfig {
  const fromWorkspace = !branchOverride || branchOverride.use_workspace_defaults !== false;
  if (fromWorkspace) {
    return {
      slot_interval_minutes: workspace.slot_interval_minutes,
      minimum_booking_minutes: workspace.minimum_booking_minutes,
      slots_per_minimum: workspace.minimum_booking_minutes / workspace.slot_interval_minutes,
      from_workspace_defaults: true,
    };
  }
  const interval = branchOverride.slot_interval_minutes ?? workspace.slot_interval_minutes;
  let minimum = branchOverride.minimum_booking_minutes ?? workspace.minimum_booking_minutes;
  if (!isValidSlotCombo(interval, minimum)) {
    minimum = interval;
  }
  return {
    slot_interval_minutes: interval,
    minimum_booking_minutes: minimum,
    slots_per_minimum: minimum / interval,
    from_workspace_defaults: false,
  };
}

function parseTimeToMinutes(t: string): number {
  const parts = t.split(":").map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function minutesToTimeString(totalMinutes: number): string {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`;
}

export function slotWindowDurationMinutes(start: string, end: string): number {
  const startMin = parseTimeToMinutes(start);
  let endMin = parseTimeToMinutes(end);
  if (end === "00:00:00" || (endMin === 0 && startMin > 0)) {
    endMin = 24 * 60;
  }
  if (endMin <= startMin) endMin += 24 * 60;
  return endMin - startMin;
}

export type GridTimeSlot = { start_time: string; end_time: string };

/** Sort grid slots by start time ascending. */
export function sortGridSlots(slots: GridTimeSlot[]): GridTimeSlot[] {
  return [...slots].sort(
    (a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time),
  );
}

/** True when every slot is the same grid step and consecutive with no gaps. */
export function areGridSlotsContiguous(
  slots: GridTimeSlot[],
  intervalMinutes: number,
): boolean {
  if (slots.length <= 1) return true;
  const sorted = sortGridSlots(slots);
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = parseTimeToMinutes(sorted[i - 1].end_time);
    const curStart = parseTimeToMinutes(sorted[i].start_time);
    const prevEndAdj = prevEnd === 0 && parseTimeToMinutes(sorted[i - 1].start_time) > 0 ? 24 * 60 : prevEnd;
    if (curStart !== prevEndAdj) return false;
    const dur = slotWindowDurationMinutes(sorted[i - 1].start_time, sorted[i - 1].end_time);
    if (dur !== intervalMinutes) return false;
  }
  const lastDur = slotWindowDurationMinutes(
    sorted[sorted.length - 1].start_time,
    sorted[sorted.length - 1].end_time,
  );
  return lastDur === intervalMinutes;
}

export type SlotSelectionValidation =
  | { ok: true; gridSlots: GridTimeSlot[]; sessions: BookingTimeWindow[]; sessionBlocks: number }
  | { ok: false; error: string };

export type GridSlotAvailability = GridTimeSlot & { is_available?: boolean };

/**
 * When two or more grid slots are selected, expand to every slot between the earliest
 * start and latest end on the venue grid (range selection).
 */
export function expandGridSlotsToContiguousRange(
  selected: GridTimeSlot[],
  gridSlots: GridSlotAvailability[],
  intervalMinutes: number,
): { ok: true; slots: GridTimeSlot[] } | { ok: false; error: string } {
  if (selected.length === 0) {
    return { ok: true, slots: [] };
  }
  if (selected.length === 1) {
    return { ok: true, slots: sortGridSlots(selected) };
  }

  const sorted = sortGridSlots(selected);
  const minStart = Math.min(...sorted.map((s) => parseTimeToMinutes(s.start_time)));
  const maxEnd = Math.max(
    ...sorted.map((s) => {
      let end = parseTimeToMinutes(s.end_time);
      const start = parseTimeToMinutes(s.start_time);
      if (s.end_time === "00:00:00" || (end === 0 && start > 0)) end = 24 * 60;
      return end;
    }),
  );

  if (maxEnd <= minStart) {
    return { ok: false, error: "Invalid time range selected." };
  }

  const byStart = new Map<string, GridSlotAvailability>();
  for (const slot of gridSlots) {
    byStart.set(slot.start_time, slot);
  }

  const expanded: GridTimeSlot[] = [];
  for (let t = minStart; t < maxEnd; t += intervalMinutes) {
    const start_time = minutesToTimeString(t);
    const end_time = minutesToTimeString(t + intervalMinutes);
    const match = byStart.get(start_time);
    if (!match || slotWindowDurationMinutes(match.start_time, match.end_time) !== intervalMinutes) {
      return { ok: false, error: "Selected time range includes slots that are not on the booking grid." };
    }
    if (match.is_available === false) {
      return {
        ok: false,
        error: "Some slots in that range are already booked. Please choose a different time.",
      };
    }
    expanded.push({ start_time: match.start_time, end_time: match.end_time });
  }

  return { ok: true, slots: expanded };
}

/** Total minutes spanned from earliest start to latest end across selected grid slots. */
export function getGridSelectionSpanMinutes(slots: GridTimeSlot[]): number {
  if (slots.length === 0) return 0;
  const sorted = sortGridSlots(slots);
  const minStart = parseTimeToMinutes(sorted[0].start_time);
  const last = sorted[sorted.length - 1];
  let maxEnd = parseTimeToMinutes(last.end_time);
  const lastStart = parseTimeToMinutes(last.start_time);
  if (last.end_time === "00:00:00" || (maxEnd === 0 && lastStart > 0)) maxEnd = 24 * 60;
  return Math.max(0, maxEnd - minStart);
}

/**
 * Validate customer grid selection and merge into minimum-sized booking sessions.
 * When interval === minimum, each grid slot is one session.
 */
export function validateAndMergeGridSlots(
  slots: GridTimeSlot[],
  config: ResolvedBookingSlotConfig,
): SlotSelectionValidation {
  if (slots.length === 0) {
    return { ok: false, error: "Please select at least one time slot." };
  }

  const sorted = sortGridSlots(slots);
  const interval = config.slot_interval_minutes;
  const minimum = config.minimum_booking_minutes;
  const required = config.slots_per_minimum;

  for (const slot of sorted) {
    const dur = slotWindowDurationMinutes(slot.start_time, slot.end_time);
    if (dur !== interval) {
      return { ok: false, error: "Selected slots do not match the venue time grid." };
    }
  }

  if (!areGridSlotsContiguous(sorted, interval)) {
    return { ok: false, error: "Please select consecutive time slots with no gaps." };
  }

  if (sorted.length < required) {
    const label = minimum === 60 ? "1 hour" : "30 minutes";
    const hint =
      required > 1
        ? `Select at least ${required} consecutive ${interval}-minute slots (${label} minimum).`
        : `Select at least one ${interval}-minute time slot.`;
    return { ok: false, error: hint };
  }

  const billingUnits = sorted.length / required;
  const totalMinutes = sorted.length * interval;
  const sessions: BookingTimeWindow[] = [
    {
      start_time: sorted[0].start_time,
      end_time: sorted[sorted.length - 1].end_time,
      duration: totalMinutes,
    },
  ];

  return {
    ok: true,
    gridSlots: sorted,
    sessions,
    /** Billable minimum-session units (e.g. 1.5 for 90 min on a 30/60 grid). */
    sessionBlocks: billingUnits,
  };
}

export function bookingSlotConfigLabel(config: ResolvedBookingSlotConfig): string {
  const { slot_interval_minutes: interval, minimum_booking_minutes: minimum } = config;
  if (interval === 60 && minimum === 60) {
    return "1-hour sessions";
  }
  if (interval === 30 && minimum === 30) {
    return "30-minute sessions";
  }
  return "30-minute time slots · 1-hour minimum booking";
}
