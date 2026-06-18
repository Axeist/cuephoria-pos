import type { SecuritySettings } from "@/hooks/useAppSettings.types";

export const DEFAULT_ADMIN_PIN = "1234";

const PIN_RE = /^\d{4,8}$/;

/** Whether PIN prompts are active (explicit false in DB/settings turns them off). */
export function coercePinProtectionEnabled(value: unknown): boolean {
  if (value === false) return false;
  if (value === true) return true;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "false" || v === "0" || v === "off" || v === "no") return false;
    if (v === "true" || v === "1" || v === "on" || v === "yes") return true;
  }
  if (value === 0) return false;
  if (value === 1) return true;
  return true;
}

export function normalizeAdminPin(value: unknown): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return PIN_RE.test(trimmed) ? trimmed : DEFAULT_ADMIN_PIN;
}

export function normalizeSecuritySettings(raw: unknown): SecuritySettings {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    pinProtectionEnabled: coercePinProtectionEnabled(obj.pinProtectionEnabled),
    adminPin: normalizeAdminPin(obj.adminPin),
  };
}
