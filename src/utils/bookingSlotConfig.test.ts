import { describe, expect, it } from "vitest";
import {
  areGridSlotsContiguous,
  expandGridSlotsToContiguousRange,
  getGridSelectionSpanMinutes,
  isValidSlotCombo,
  resolveBookingSlotConfig,
  validateAndMergeGridSlots,
} from "./bookingSlotConfig";

describe("bookingSlotConfig", () => {
  it("defaults to 60/60 when no override", () => {
    const r = resolveBookingSlotConfig(
      { slot_interval_minutes: 60, minimum_booking_minutes: 60 },
      null,
    );
    expect(r.slots_per_minimum).toBe(1);
  });

  it("30-min grid with 1hr minimum requires 2 slots", () => {
    const r = resolveBookingSlotConfig(
      { slot_interval_minutes: 30, minimum_booking_minutes: 60 },
      { use_workspace_defaults: false, slot_interval_minutes: 30, minimum_booking_minutes: 60 },
    );
    expect(r.slots_per_minimum).toBe(2);
  });

  it("merges two contiguous 30-min slots into one 60-min session", () => {
    const config = resolveBookingSlotConfig(
      { slot_interval_minutes: 30, minimum_booking_minutes: 60 },
      null,
    );
    const result = validateAndMergeGridSlots(
      [
        { start_time: "11:00:00", end_time: "11:30:00" },
        { start_time: "11:30:00", end_time: "12:00:00" },
      ],
      config,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].start_time).toBe("11:00:00");
      expect(result.sessions[0].end_time).toBe("12:00:00");
      expect(result.sessions[0].duration).toBe(60);
      expect(result.sessionBlocks).toBe(1);
    }
  });

  it("bills 1.5 minimum blocks for three contiguous 30-min slots", () => {
    const config = resolveBookingSlotConfig(
      { slot_interval_minutes: 30, minimum_booking_minutes: 60 },
      null,
    );
    const result = validateAndMergeGridSlots(
      [
        { start_time: "15:30:00", end_time: "16:00:00" },
        { start_time: "16:00:00", end_time: "16:30:00" },
        { start_time: "16:30:00", end_time: "17:00:00" },
      ],
      config,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sessions[0].duration).toBe(90);
      expect(result.sessionBlocks).toBe(1.5);
    }
  });

  it("rejects non-contiguous slots", () => {
    const config = resolveBookingSlotConfig(
      { slot_interval_minutes: 30, minimum_booking_minutes: 60 },
      null,
    );
    const result = validateAndMergeGridSlots(
      [
        { start_time: "11:00:00", end_time: "11:30:00" },
        { start_time: "12:00:00", end_time: "12:30:00" },
      ],
      config,
    );
    expect(result.ok).toBe(false);
  });

  it("validates slot combos", () => {
    expect(isValidSlotCombo(60, 60)).toBe(true);
    expect(isValidSlotCombo(30, 60)).toBe(true);
    expect(isValidSlotCombo(30, 30)).toBe(true);
    expect(isValidSlotCombo(60, 30)).toBe(false);
  });

  it("detects contiguous grid slots", () => {
    expect(
      areGridSlotsContiguous(
        [
          { start_time: "11:00:00", end_time: "11:30:00" },
          { start_time: "11:30:00", end_time: "12:00:00" },
        ],
        30,
      ),
    ).toBe(true);
  });

  it("expands two endpoint slots to fill the range", () => {
    const grid = [
      { start_time: "14:30:00", end_time: "15:00:00", is_available: true },
      { start_time: "15:00:00", end_time: "15:30:00", is_available: true },
      { start_time: "15:30:00", end_time: "16:00:00", is_available: true },
      { start_time: "16:00:00", end_time: "16:30:00", is_available: true },
    ];
    const result = expandGridSlotsToContiguousRange(
      [
        { start_time: "14:30:00", end_time: "15:00:00" },
        { start_time: "16:00:00", end_time: "16:30:00" },
      ],
      grid,
      30,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slots).toHaveLength(4);
      expect(getGridSelectionSpanMinutes(result.slots)).toBe(120);
    }
  });

  it("rejects range expansion when a middle slot is booked", () => {
    const grid = [
      { start_time: "14:30:00", end_time: "15:00:00", is_available: true },
      { start_time: "15:00:00", end_time: "15:30:00", is_available: false },
      { start_time: "15:30:00", end_time: "16:00:00", is_available: true },
      { start_time: "16:00:00", end_time: "16:30:00", is_available: true },
    ];
    const result = expandGridSlotsToContiguousRange(
      [
        { start_time: "14:30:00", end_time: "15:00:00" },
        { start_time: "16:00:00", end_time: "16:30:00" },
      ],
      grid,
      30,
    );
    expect(result.ok).toBe(false);
  });
});
