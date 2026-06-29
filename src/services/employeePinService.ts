import { adminFetch } from '@/services/adminFetch';
import { staffHrCall } from '@/services/staff/staffHrTransport';
import type { StaffHrSettings } from '@/types/staff.types';
import type { StaffActivityContext } from '@/constants/staffActivityLabels';
import { CRITICAL_PIN_ACTION_LABELS, type CriticalPinActionKey } from '@/constants/criticalEmployeePinActions';

export type VerifyEmployeePinResult =
  | { ok: true; bypass: true }
  | { ok: true; bypass: false; staffId: string; staffName: string; assertionToken: string }
  | { ok: false; error: string; code?: string };

export async function fetchEmployeePinProtection(
  organizationId: string,
): Promise<StaffHrSettings> {
  return staffHrCall('fetchHrSettings', { organizationId });
}

export async function updateEmployeePinProtection(
  organizationId: string,
  enabled: boolean,
): Promise<StaffHrSettings> {
  return staffHrCall('updateHrSettings', {
    organizationId,
    employeePinProtectionEnabled: enabled,
  });
}

export async function verifyEmployeePinApi(args: {
  pin: string;
  actionKey: CriticalPinActionKey | string;
  locationId?: string | null;
}): Promise<VerifyEmployeePinResult> {
  const res = await adminFetch('/api/admin/verify-employee-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pin: args.pin,
      actionKey: args.actionKey,
      locationId: args.locationId,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || json.ok === false) {
    return {
      ok: false,
      error: String(json.error || 'PIN verification failed'),
      code: json.code ? String(json.code) : undefined,
    };
  }
  if (json.bypass === true) {
    return { ok: true, bypass: true };
  }
  return {
    ok: true,
    bypass: false,
    staffId: String(json.staffId),
    staffName: String(json.staffName),
    assertionToken: String(json.assertionToken),
  };
}

export async function logStaffActivityClient(args: {
  organizationId: string;
  locationId?: string | null;
  actorStaffId?: string | null;
  actionKey: string;
  context?: StaffActivityContext;
  outcome?: 'success' | 'failed' | 'bypass';
  entityType?: string;
  entityId?: string | null;
}): Promise<void> {
  try {
    await staffHrCall('logStaffActivity', args);
  } catch {
    /* non-blocking */
  }
}

export function pinActionLabel(actionKey: string): string {
  return CRITICAL_PIN_ACTION_LABELS[actionKey as CriticalPinActionKey] ?? actionKey;
}
