import React, { useState, useEffect } from 'react';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResponsiveDialog, ResponsiveDialogContent } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePOS, Customer } from '@/context/POSContext';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2 } from 'lucide-react';

const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: (customer: Customer) => void;
}

const AddCustomerDialog: React.FC<AddCustomerDialogProps> = ({
  open,
  onOpenChange,
  onAdded,
}) => {
  const { addCustomer } = usePOS();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setPhone('');
      setEmail('');
      setPhoneError('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const normalized = normalizePhone(phone);

    if (!trimmedName) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    if (normalized.length !== 10) {
      setPhoneError('Phone must be exactly 10 digits');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(normalized)) {
      setPhoneError('Enter a valid Indian mobile number (starts with 6–9)');
      return;
    }

    setSaving(true);
    setPhoneError('');
    try {
      const result = await addCustomer({
        name: trimmedName,
        phone: normalized,
        email: email.trim() || undefined,
        isMember: false,
        loyaltyPoints: 0,
        totalSpent: 0,
        totalPlayTime: 0,
      });
      if (result) {
        onAdded?.(result);
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} mobileVariant="sheet-bottom">
      <ResponsiveDialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-cuephoria-lightpurple" />
            Add customer
          </DialogTitle>
          <DialogDescription>
            Create a walk-in customer, then start their session right away.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="add-cust-name">Name</Label>
            <Input
              id="add-cust-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name"
              autoComplete="name"
              className="bg-black/40 border-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-cust-phone">Phone</Label>
            <Input
              id="add-cust-phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneError('');
              }}
              placeholder="10-digit mobile"
              inputMode="numeric"
              autoComplete="tel"
              className="bg-black/40 border-white/10"
            />
            {phoneError && <p className="text-xs text-red-400">{phoneError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-cust-email">Email (optional)</Label>
            <Input
              id="add-cust-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              autoComplete="email"
              className="bg-black/40 border-white/10"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-cuephoria-purple hover:bg-cuephoria-purple/90">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                'Add customer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default AddCustomerDialog;
