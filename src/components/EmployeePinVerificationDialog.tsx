import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useLocation } from '@/context/LocationContext';
import { verifyEmployeePinApi, pinActionLabel } from '@/services/employeePinService';
import type { CriticalPinActionKey } from '@/constants/criticalEmployeePinActions';
import { Link } from 'react-router-dom';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionKey: CriticalPinActionKey | string;
  onSuccess: (result: { bypass: boolean; staffId?: string; staffName?: string }) => void;
};

export default function EmployeePinVerificationDialog({
  open,
  onOpenChange,
  actionKey,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const { activeLocationId } = useLocation();
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const actionLabel = useMemo(() => pinActionLabel(actionKey), [actionKey]);

  const handleVerify = async () => {
    if (!pin.trim()) {
      toast({ title: 'Enter your employee PIN', variant: 'destructive' });
      return;
    }
    setVerifying(true);
    try {
      const result = await verifyEmployeePinApi({
        pin: pin.trim(),
        actionKey,
        locationId: activeLocationId,
      });
      if (!result.ok) {
        toast({
          title:
            result.code === 'not_clocked_in'
              ? 'Not clocked in'
              : result.code === 'ambiguous_pin'
                ? 'Duplicate PIN'
                : 'PIN failed',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      setPin('');
      onOpenChange(false);
      if (result.bypass) {
        onSuccess({ bypass: true });
      } else {
        onSuccess({
          bypass: false,
          staffId: result.staffId,
          staffName: result.staffName,
        });
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Who is on duty?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Enter <strong>your own</strong> My Portal PIN to confirm <strong>{actionLabel}</strong>.
          This works even when someone else is logged into this device — we record who actually
          performed the action.
        </p>
        <div className="space-y-2 py-2">
          <Label htmlFor="employee-pin">Employee PIN</Label>
          <Input
            id="employee-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && void handleVerify()}
          />
          <p className="text-xs text-muted-foreground">
            You must be clocked in on My Portal. Any on-duty staff member can enter their own PIN
            on a shared floor login.{' '}
            <Link to="/staff-portal" className="text-primary underline">
              Open My Portal
            </Link>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleVerify()} disabled={verifying}>
            {verifying ? 'Verifying…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
