
import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash, Lock } from 'lucide-react';
import { usePinVerification } from '@/hooks/usePinVerification';
import { useAuth } from '@/context/AuthContext';
import PinVerificationDialog from '@/components/PinVerificationDialog';
import { Bill } from '@/types/pos.types';

interface BillActionsProps {
  bill: Bill;
  onEdit?: (bill: Bill) => void;
  onDelete: (billId: string, customerId: string) => void;
}

const BillActions: React.FC<BillActionsProps> = ({ bill, onEdit, onDelete }) => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const { showPinDialog, requestPinVerification, handlePinSuccess, handlePinCancel } = usePinVerification();

  const handleDelete = () => {
    requestPinVerification(() => onDelete(bill.id, bill.customerId));
  };

  return (
    <>
      <div className="flex gap-2">
        {onEdit && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onEdit(bill)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          className="text-red-500 relative" 
          onClick={handleDelete}
          title={!isAdmin ? "PIN verification required for staff" : "Delete bill"}
        >
          <Trash className="h-4 w-4" />
          {!isAdmin && (
            <Lock className="h-3 w-3 absolute -top-1 -right-1 text-amber-500" />
          )}
        </Button>
      </div>

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

export default BillActions;
