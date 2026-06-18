
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export const usePinVerification = () => {
  const { user } = useAuth();
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requestPinVerification = (action: () => void) => {
    const isAdmin = user?.isAdmin || false;
    
    if (isAdmin) {
      // Admins can delete without PIN verification
      action();
    } else {
      // Staff members need PIN verification
      setPendingAction(() => action);
      setShowPinDialog(true);
    }
  };

  const handlePinSuccess = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setShowPinDialog(false);
  };

  const handlePinCancel = () => {
    setPendingAction(null);
    setShowPinDialog(false);
  };

  return {
    showPinDialog,
    requestPinVerification,
    handlePinSuccess,
    handlePinCancel
  };
};
