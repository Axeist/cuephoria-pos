import React, { useMemo, useState } from 'react';
import { addDays, addMonths, format } from 'date-fns';
import { Loader2, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from '@/context/LocationContext';
import { assignMembershipTier } from '@/services/membershipService';
import type { MembershipCardLookupResult, MembershipTier } from '@/types/membership.types';

type AssignTierDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MembershipCardLookupResult | null;
  tiers: MembershipTier[];
  onAssigned: (tier: MembershipTier) => void;
};

export default function AssignTierDialog({
  open,
  onOpenChange,
  member,
  tiers,
  onAssigned,
}: AssignTierDialogProps) {
  const { toast } = useToast();
  const { activeLocationId } = useLocation();
  const [tierId, setTierId] = useState('');
  const [saving, setSaving] = useState(false);

  const activeTiers = useMemo(() => tiers.filter((t) => t.isActive), [tiers]);

  const selectedTier = useMemo(
    () => activeTiers.find((t) => t.id === tierId) ?? null,
    [activeTiers, tierId],
  );

  const expiryPreview = useMemo(() => {
    if (!selectedTier) return null;
    const start = new Date();
    const end =
      selectedTier.defaultDuration === 'weekly' ? addDays(start, 7) : addMonths(start, 1);
    return format(end, 'dd MMM yyyy');
  }, [selectedTier]);

  const handleAssign = async () => {
    if (!member?.customer?.id || !selectedTier) return;
    setSaving(true);
    try {
      const start = new Date();
      const expiry =
        selectedTier.defaultDuration === 'weekly'
          ? addDays(start, 7).toISOString()
          : addMonths(start, 1).toISOString();

      await assignMembershipTier(
        {
          customerId: member.customer.id,
          tierId: selectedTier.id,
          membershipStartDate: start.toISOString(),
          membershipExpiryDate: expiry,
          membershipDuration: selectedTier.defaultDuration ?? 'monthly',
          membershipHoursLeft: selectedTier.defaultMembershipHours ?? null,
        },
        activeLocationId,
      );

      onAssigned(selectedTier);
      onOpenChange(false);
      toast({
        title: 'Tier assigned',
        description:
          'Assigned without POS sale — use POS to collect payment for paid enrollments.',
      });
    } catch (err) {
      toast({
        title: 'Assign failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle>Assign membership tier</DialogTitle>
          <DialogDescription>
            {member?.customer?.name
              ? `Set tier for ${member.customer.name}`
              : 'Select a member first'}
          </DialogDescription>
        </DialogHeader>

        {member?.customer && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tier plan</Label>
              <Select value={tierId} onValueChange={setTierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose tier…" />
                </SelectTrigger>
                <SelectContent>
                  {activeTiers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTier && (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-muted-foreground">
                <p>
                  Duration: {selectedTier.defaultDuration === 'weekly' ? 'Weekly' : 'Monthly'}
                  {expiryPreview ? ` · expires ${expiryPreview}` : ''}
                </p>
                {selectedTier.defaultMembershipHours != null && (
                  <p>Includes {selectedTier.defaultMembershipHours} playtime hours</p>
                )}
              </div>
            )}

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/90">
              Complimentary assignment only. To sell a tier and collect payment, use POS.
            </div>

            <Button variant="outline" size="sm" className="w-full gap-2" asChild>
              <Link to="/pos">
                <ShoppingCart className="h-4 w-4" />
                Sell tier at POS
              </Link>
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="btn-gradient"
            disabled={!selectedTier || saving}
            onClick={() => void handleAssign()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign tier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
