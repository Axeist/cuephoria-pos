import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash } from 'lucide-react';
import { usePinVerification } from '@/hooks/usePinVerification';
import { usePermission } from '@/context/PermissionsContext';
import PinVerificationDialog from '@/components/PinVerificationDialog';
import { Bill } from '@/types/pos.types';

interface BillActionsProps {
  bill: Bill;
  onEdit?: (bill: Bill) => void;
  onDelete: (billId: string, customerId: string) => void;
}

const BillActions: React.FC<BillActionsProps> = ({ bill, onEdit, onDelete }) => {
  const canDeleteRecord = usePermission('reports.delete_record');
  const canEditBill = usePermission('reports.export');
  const { showPinDialog, requestPinVerification, handlePinSuccess, handlePinCancel } = usePinVerification();

  if (!canDeleteRecord && !canEditBill) return null;

  const handleDelete = () => {
    if (!canDeleteRecord) return;
    requestPinVerification(() => onDelete(bill.id, bill.customerId));
  };

  return (
    <>
      <div className="flex gap-2">
        {canEditBill && onEdit && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onEdit(bill)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        {canDeleteRecord && (
        <Button 
          variant="outline" 
          size="sm" 
          className="text-red-500" 
          onClick={handleDelete}
          title="Delete bill"
        >
          <Trash className="h-4 w-4" />
        </Button>
        )}
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
