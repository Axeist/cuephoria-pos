import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  computeMembershipExpiry,
  formatValidityLabel,
  type MembershipValidityOverride,
} from '@/utils/membershipValidity.utils';
import type { MembershipCardLookupResult, MembershipTier } from '@/types/membership.types';

type ValidityChoice = 'tier_default' | 'lifetime' | 'custom_date';

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
  const [validityChoice, setValidityChoice] = useState<ValidityChoice>('tier_default');
  const [customExpiryDate, setCustomExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);

  const activeTiers = useMemo(() => tiers.filter((t) => t.isActive), [tiers]);

  const selectedTier = useMemo(
    () => activeTiers.find((t) => t.id === tierId) ?? null,
    [activeTiers, tierId],
  );

  const validityOverride = useMemo((): MembershipValidityOverride => {
    if (validityChoice === 'lifetime') return { mode: 'lifetime' };
    if (validityChoice === 'custom_date' && customExpiryDate) {
      return { mode: 'custom_date', expiryDate: new Date(customExpiryDate) };
    }
    return { mode: 'tier_default' };
  }, [validityChoice, customExpiryDate]);

  const expiryPreview = useMemo(() => {
    if (!selectedTier) return null;
    const start = new Date();
    const { expiryDate } = computeMembershipExpiry(start, selectedTier, validityOverride);
    if (!expiryDate) return 'Lifetime';
    return format(expiryDate, 'dd MMM yyyy');
  }, [selectedTier, validityOverride]);

  const handleAssign = async () => {
    if (!member?.customer?.id || !selectedTier) return;
    if (validityChoice === 'custom_date' && !customExpiryDate) {
      toast({
        title: 'Expiry date required',
        description: 'Pick an end date or choose another validity option.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const start = new Date();
      const { expiryDate, durationLabel } = computeMembershipExpiry(
        start,
        selectedTier,
        validityOverride,
      );

      await assignMembershipTier(
        {
          customerId: member.customer.id,
          tierId: selectedTier.id,
          membershipStartDate: start.toISOString(),
          membershipExpiryDate: expiryDate?.toISOString() ?? null,
          membershipDuration: durationLabel,
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
              <>
                <div className="space-y-1.5">
                  <Label>Validity</Label>
                  <Select
                    value={validityChoice}
                    onValueChange={(v: ValidityChoice) => setValidityChoice(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tier_default">
                        Tier default ({formatValidityLabel(selectedTier)})
                      </SelectItem>
                      <SelectItem value="lifetime">Lifetime</SelectItem>
                      <SelectItem value="custom_date">Custom end date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {validityChoice === 'custom_date' && (
                  <div className="space-y-1.5">
                    <Label>Expires on</Label>
                    <Input
                      type="date"
                      value={customExpiryDate}
                      onChange={(e) => setCustomExpiryDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                )}

                <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-muted-foreground">
                  <p>
                    Valid until: {expiryPreview ?? '—'}
                  </p>
                  {selectedTier.defaultMembershipHours != null && (
                    <p>Includes {selectedTier.defaultMembershipHours} playtime hours</p>
                  )}
                </div>
              </>
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
