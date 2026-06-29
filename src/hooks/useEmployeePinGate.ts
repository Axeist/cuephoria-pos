import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganizationOptional } from '@/context/OrganizationContext';
import { useLocation } from '@/context/LocationContext';
import { usePermissions } from '@/context/PermissionsContext';
import { useEmployeePinProtection } from '@/hooks/useEmployeePinProtection';
import { logStaffActivityClient } from '@/services/employeePinService';
import type { CriticalPinActionKey } from '@/constants/criticalEmployeePinActions';
import type { StaffActivityContext } from '@/constants/staffActivityLabels';

type PendingPinRequest = {
  actionKey: CriticalPinActionKey | string;
  action: () => void;
  logContext: StaffActivityContext;
};

/**
 * Gates critical actions behind employee portal PIN when enabled.
 * Owners / super-admins bypass on the client; server verifies bypass too.
 */
export function useEmployeePinGate() {
  const { user } = useAuth();
  const { role, isLoading: permissionsLoading } = usePermissions();
  const orgCtx = useOrganizationOptional();
  const organizationId = orgCtx?.organization?.id ?? null;
  const orgLoading = orgCtx?.status === 'loading';
  const { activeLocationId } = useLocation();
  const { enabled, loading: protectionLoading } = useEmployeePinProtection();

  const gateLoading = orgLoading || permissionsLoading || protectionLoading;

  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pendingActionKey, setPendingActionKey] = useState<CriticalPinActionKey | string>('');
  const [pendingLogContext, setPendingLogContext] = useState<StaffActivityContext>({});
  const deferredRef = useRef<PendingPinRequest | null>(null);

  const canBypassPin = Boolean(
    user?.isSuperAdmin || (!permissionsLoading && role?.slug === 'owner'),
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

  const openPinDialog = useCallback(
    (actionKey: CriticalPinActionKey | string, action: () => void, logContext: StaffActivityContext) => {
      setPendingActionKey(actionKey);
      setPendingLogContext(logContext);
      setPendingAction(() => action);
      setShowPinDialog(true);
    },
    [],
  );

  const runWithoutPin = useCallback(
    (actionKey: CriticalPinActionKey | string, action: () => void, logContext: StaffActivityContext) => {
      action();
      if (enabled) {
        void logAction(actionKey, logContext);
      }
    },
    [enabled, logAction],
  );

  const requestEmployeePin = useCallback(
    (
      actionKey: CriticalPinActionKey | string,
      action: () => void,
      logContext: StaffActivityContext = {},
    ) => {
      if (gateLoading) {
        deferredRef.current = { actionKey, action, logContext };
        return;
      }

      if (canBypassPin) {
        runWithoutPin(actionKey, action, logContext);
        return;
      }

      if (!enabled) {
        action();
        return;
      }

      openPinDialog(actionKey, action, logContext);
    },
    [gateLoading, canBypassPin, enabled, runWithoutPin, openPinDialog],
  );

  useEffect(() => {
    if (gateLoading || !deferredRef.current) return;
    const deferred = deferredRef.current;
    deferredRef.current = null;

    if (canBypassPin) {
      runWithoutPin(deferred.actionKey, deferred.action, deferred.logContext);
      return;
    }

    if (!enabled) {
      deferred.action();
      return;
    }

    openPinDialog(deferred.actionKey, deferred.action, deferred.logContext);
  }, [gateLoading, enabled, canBypassPin, runWithoutPin, openPinDialog]);

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
    pinProtectionLoading: gateLoading,
    logAction,
  };
}
