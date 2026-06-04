import { useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAdminPin } from "@/hooks/useAdminPin";

/**
 * PIN-gated actions (update when adding new prompts):
 * - Stations: add station (all users when enabled + requireForAdmin)
 * - SessionActions, Reports: delete session
 * - BillActions: delete bill
 * - ProductCard, Products: delete product
 * - POS: unlock discount override
 * - StartSessionDialog, MultiStartSessionDialog: late-night rate override
 * - Settings: reset tournament leaderboard
 * - CafeMenu: reduce stock (non–cafe-admin)
 */

export type PinVerificationOptions = {
  /** When true, admins must enter PIN too (e.g. add station). Default: staff only. */
  requireForAdmin?: boolean;
};

export const usePinVerification = () => {
  const { user } = useAuth();
  const { isPinProtectionEnabled } = useAdminPin();
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requestPinVerification = useCallback(
    (action: () => void, options?: PinVerificationOptions) => {
      if (!isPinProtectionEnabled) {
        action();
        return;
      }

      const isAdmin = user?.isAdmin || false;
      const requireForAdmin = options?.requireForAdmin === true;

      if (isAdmin && !requireForAdmin) {
        action();
        return;
      }

      setPendingAction(() => action);
      setShowPinDialog(true);
    },
    [isPinProtectionEnabled, user?.isAdmin],
  );

  const handlePinSuccess = useCallback(() => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setShowPinDialog(false);
  }, [pendingAction]);

  const handlePinCancel = useCallback(() => {
    setPendingAction(null);
    setShowPinDialog(false);
  }, []);

  return {
    showPinDialog,
    isPinProtectionEnabled,
    requestPinVerification,
    handlePinSuccess,
    handlePinCancel,
  };
};
