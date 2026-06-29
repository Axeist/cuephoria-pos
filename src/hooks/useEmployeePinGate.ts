import { useCallback, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganizationOptional } from '@/context/OrganizationContext';
import { useLocation } from '@/context/LocationContext';
import { usePermissions } from '@/context/PermissionsContext';
import { useEmployeePinProtection } from '@/hooks/useEmployeePinProtection';
import { logStaffActivityClient } from '@/services/employeePinService';
import type { CriticalPinActionKey } from '@/constants/criticalEmployeePinActions';
import type { StaffActivityContext } from '@/constants/staffActivityLabels';

/**
 * Gates critical actions behind employee portal PIN when enabled.
 * Owners / super-admins bypass on the client; server verifies bypass too.
 */
export function useEmployeePinGate() {
  const { user } = useAuth();
  const { role } = usePermissions();
  const orgCtx = useOrganizationOptional();
  const organizationId = orgCtx?.organization?.id ?? null;
  const { activeLocationId } = useLocation();
  const { enabled, loading } = useEmployeePinProtection();

  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pendingActionKey, setPendingActionKey] = useState<CriticalPinActionKey | string>('');

  const [pendingLogContext, setPendingLogContext] = useState<StaffActivityContext>({});

  const canBypassPin = Boolean(
    user?.isSuperAdmin || role?.slug === 'owner',
  );

  const logAction = useCallback(
    async (
      actionKey: string,
      context: StaffActivityContext,
      actorStaffId?: string | null,
    ) => {
      if (!organizationId || !enabled) return;
      await logStaffActivityClient({
        organizationId,
        locationId: activeLocationId,
        actorStaffId: actorStaffId ?? null,
        actionKey,
        context,
        outcome: 'success',
      });
    },
    [organizationId, activeLocationId, enabled],
  );

  const requestEmployeePin = useCallback(
    (
      actionKey: CriticalPinActionKey | string,
      action: () => void,
      logContext: StaffActivityContext = {},
    ) => {
      if (loading || !enabled || canBypassPin) {
        action();
        if (enabled) {
          void logAction(actionKey, logContext);
        }
        return;
      }

      setPendingActionKey(actionKey);
      setPendingLogContext(logContext);
      setPendingAction(() => action);
      setShowPinDialog(true);
    },
    [enabled, loading, canBypassPin, logAction],
  );

  const handlePinSuccess = useCallback(
    (result: { bypass: boolean; staffId?: string; staffName?: string }) => {
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
      void logAction(
        pendingActionKey,
        { ...pendingLogContext, staffName: result.staffName ?? undefined },
        result.staffId,
      );
    },
    [pendingAction, pendingActionKey, pendingLogContext, logAction],
  );

  const handlePinCancel = useCallback(() => {
    setPendingAction(null);
    setShowPinDialog(false);
  }, []);

  return {
    showPinDialog,
    setShowPinDialog,
    pendingActionKey,
    requestEmployeePin,
    handlePinSuccess,
    handlePinCancel,
    pinProtectionEnabled: enabled,
    logAction,
  };
}
