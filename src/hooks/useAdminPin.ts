import { useCallback, useMemo } from "react";
import { useAppSettings } from "@/hooks/useAppSettings";

/** Fallback when no PIN is saved for the active branch. */
export const DEFAULT_ADMIN_PIN = "1234";
export const ADMIN_PIN_MIN_LENGTH = 4;
export const ADMIN_PIN_MAX_LENGTH = 8;

const PIN_RE = /^\d{4,8}$/;

export function normalizeAdminPin(value: string | undefined | null): string {
  const trimmed = (value ?? "").trim();
  return PIN_RE.test(trimmed) ? trimmed : DEFAULT_ADMIN_PIN;
}

/**
 * Resolves the admin PIN for the active branch from location_settings
 * (securitySettings.adminPin), with a safe default.
 */
export function useAdminPin() {
  const { settings, loading } = useAppSettings();

  const expectedPin = useMemo(
    () => normalizeAdminPin(settings.securitySettings?.adminPin),
    [settings.securitySettings?.adminPin],
  );

  const isPinProtectionEnabled = useMemo(
    () => settings.securitySettings?.pinProtectionEnabled !== false,
    [settings.securitySettings?.pinProtectionEnabled],
  );

  const verifyAdminPin = useCallback(
    (entered: string) => {
      const normalized = entered.trim();
      if (!PIN_RE.test(normalized)) return false;
      return normalized === expectedPin;
    },
    [expectedPin],
  );

  return {
    loading,
    isPinProtectionEnabled,
    expectedPinLength: expectedPin.length,
    verifyAdminPin,
  };
}
