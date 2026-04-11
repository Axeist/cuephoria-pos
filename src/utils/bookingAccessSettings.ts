/**
 * booking_settings JSONB values for public_booking_enabled / online_payment_enabled.
 * Stored as JSON booleans; defaults to true when missing (backward compatible).
 */
export function parseBookingSettingBool(raw: unknown, defaultTrue = true): boolean {
  if (raw === null || raw === undefined) return defaultTrue;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (s === "false" || s === "0" || s === "no") return false;
    if (s === "true" || s === "1" || s === "yes") return true;
    return defaultTrue;
  }
  if (typeof raw === "object" && raw !== null && "enabled" in raw) {
    return Boolean((raw as { enabled?: boolean }).enabled);
  }
  return defaultTrue;
}

export const BOOKING_ACCESS_KEYS = {
  publicBooking: "public_booking_enabled",
  onlinePayment: "online_payment_enabled",
} as const;
