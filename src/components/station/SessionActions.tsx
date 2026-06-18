
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash, Lock } from 'lucide-react';
import { usePinVerification } from '@/hooks/usePinVerification';
import { useAuth } from '@/context/AuthContext';
import PinVerificationDialog from '@/components/PinVerificationDialog';
import { Session } from '@/types/pos.types';

interface SessionActionsProps {
  session: Session;
  onDelete: (sessionId: string) => void;
}

const SessionActions: React.FC<SessionActionsProps> = ({ session, onDelete }) => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const { showPinDialog, requestPinVerification, handlePinSuccess, handlePinCancel } = usePinVerification();

  const handleDelete = () => {
    requestPinVerification(() => onDelete(session.id));
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="text-red-500 relative" 
        onClick={handleDelete}
        title={!isAdmin ? "PIN verification required for staff" : "Delete session"}
      >
        <Trash className="h-4 w-4" />
        {!isAdmin && (
          <Lock className="h-3 w-3 absolute -top-1 -right-1 text-amber-500" />
        )}
      </Button>

      <PinVerificationDialog
        open={showPinDialog}
        onOpenChange={handlePinCancel}
        onSuccess={handlePinSuccess}
        title="Verify PIN to Delete"
        description="Enter the PIN to confirm this delete operation."
      />
    </>
  );
};

export default SessionActions;
