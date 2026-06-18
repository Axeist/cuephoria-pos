import { useCallback, useMemo } from "react";
import { useAppSettings } from "@/hooks/useAppSettings";
import {
  coercePinProtectionEnabled,
  normalizeAdminPin,
} from "@/utils/securitySettings";

export const DEFAULT_ADMIN_PIN = "1234";
export const ADMIN_PIN_MIN_LENGTH = 4;
export const ADMIN_PIN_MAX_LENGTH = 8;

const PIN_RE = /^\d{4,8}$/;

export function useAdminPin() {
  const { settings, loading } = useAppSettings();
  const security = settings.securitySettings;

  const isPinProtectionEnabled = useMemo(
    () => coercePinProtectionEnabled(security?.pinProtectionEnabled),
    [security?.pinProtectionEnabled],
  );

  const expectedPin = useMemo(
    () => normalizeAdminPin(security?.adminPin),
    [security?.adminPin],
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
