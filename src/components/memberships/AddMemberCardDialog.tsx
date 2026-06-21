import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Loader2, Plus, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocation } from '@/context/LocationContext';
import { useToast } from '@/hooks/use-toast';
import { useNfcWedgeListener } from '@/hooks/useNfcWedgeListener';
import { assignNfcCard, lookupMember } from '@/services/membershipService';
import type { Customer } from '@/types/pos.types';
import type { MembershipCardLookupResult } from '@/types/membership.types';
import { isValidNfcUid, normalizeNfcUid } from '@/utils/nfcUid.utils';
import { CurrencyDisplay } from '@/components/ui/currency';

type AddMemberCardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  initialMember?: MembershipCardLookupResult | null;
  onAdded: () => void;
};

export default function AddMemberCardDialog({
  open,
  onOpenChange,
  customers,
  initialMember,
  onAdded,
}: AddMemberCardDialogProps) {
  const { toast } = useToast();
  const { activeLocationId } = useLocation();

  const [memberQuery, setMemberQuery] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);
  const [member, setMember] = useState<MembershipCardLookupResult | null>(null);

  const [uid, setUid] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMember(initialMember ?? null);
    setMemberQuery(
      initialMember?.customer?.customerId ||
        initialMember?.customer?.phone ||
        '',
    );
    setUid('');
  }, [open, initialMember]);

  const resolveMember = useCallback(
    async (ref: string) => {
      const trimmed = ref.trim();
      if (!trimmed) return;

      setMemberLoading(true);
      try {
        const res = await lookupMember(trimmed, activeLocationId);
        const result = res.result as MembershipCardLookupResult;
        if (!result?.customer) throw new Error('Customer not found');
        setMember(result);
        toast({
          title: 'Member found',
          description: result.customer.customerId
            ? `${result.customer.name} · ${result.customer.customerId}`
            : result.customer.name,
        });
      } catch (err) {
        setMember(null);
        toast({
          title: 'Lookup failed',
          description: err instanceof Error ? err.message : 'Customer not found',
          variant: 'destructive',
        });
      } finally {
        setMemberLoading(false);
      }
    },
    [activeLocationId, toast],
  );

  const addCard = useCallback(
    async (rawUid: string) => {
      if (!member?.customer?.id) {
        toast({
          title: 'Select a member first',
          description: 'Find the customer before adding their card.',
          variant: 'destructive',
        });
        return;
      }

      const normalized = normalizeNfcUid(rawUid);
      if (!isValidNfcUid(normalized)) {
        toast({
          title: 'Invalid card UID',
          description: 'Enter 4–32 hex characters from the NFC tag.',
          variant: 'destructive',
        });
        return;
      }

      setUid(normalized);
      setAdding(true);
      try {
        await assignNfcCard(
          {
            uid: normalized,
            customerId: member.customer.id,
            locationId: activeLocationId,
          },
          activeLocationId,
        );
        toast({
          title: 'Card added',
          description: `${normalized} → ${member.customer.customerId || member.customer.name}`,
        });
        onAdded();
        onOpenChange(false);
      } catch (err) {
        toast({
          title: 'Add card failed',
          description: err instanceof Error ? err.message : 'Could not add card',
          variant: 'destructive',
        });
      } finally {
        setAdding(false);
      }
    },
    [activeLocationId, member, onAdded, onOpenChange, toast],
  );

  useNfcWedgeListener({
    enabled: open && !adding && !!member?.customer?.id,
    onScan: (scanned) => {
      setUid(scanned);
      void addCard(scanned);
    },
  });

  const quickPick = (c: Customer) => {
    const ref = c.customerId || c.phone || c.name;
    setMemberQuery(ref);
    void resolveMember(ref);
  };

  const recentMembers = customers
    .filter((c) => c.membershipTierId || c.isMember)
    .slice(0, 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-cyan-500/25 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-cyan-400" />
            Add member card
          </DialogTitle>
          <DialogDescription>
            Link a new NFC tag to a customer. Tap the card on your reader or type the UID manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="add-card-member">Member</Label>
            <div className="flex gap-2">
              <Input
                id="add-card-member"
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Customer ID or phone"
                className="font-mono bg-black/30 border-white/10 h-10"
                disabled={memberLoading || adding}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void resolveMember(memberQuery);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 h-10"
                disabled={memberLoading || adding || !memberQuery.trim()}
                onClick={() => void resolveMember(memberQuery)}
              >
                {memberLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {!member && recentMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {recentMembers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-muted-foreground hover:border-violet-400/30 hover:text-violet-200 transition"
                    onClick={() => quickPick(c)}
                  >
                    {c.customerId || c.name}
                  </button>
                ))}
              </div>
            )}
            {member?.customer && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm">
                <p className="font-medium text-emerald-100">{member.customer.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {member.customer.customerId || member.customer.phone}
                  {member.tier ? ` · ${member.tier.name}` : ''}
                  {' · '}
                  <CurrencyDisplay amount={member.customer.cardBalance ?? 0} />
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-card-uid">Card UID</Label>
            <Input
              id="add-card-uid"
              data-nfc-wedge="true"
              value={uid}
              onChange={(e) => setUid(normalizeNfcUid(e.target.value))}
              placeholder="TAP OR ENTER UID…"
              className="font-mono uppercase tracking-widest bg-black/30 border-white/10 h-11"
              disabled={adding || !member?.customer}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void addCard(uid);
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              {member?.customer
                ? 'Place the NFC tag on your reader — UID fills automatically.'
                : 'Find a member first, then tap or enter the card UID.'}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={adding}>
            Cancel
          </Button>
          <Button
            type="button"
            className="btn-gradient gap-2"
            disabled={adding || !member?.customer || !uid}
            onClick={() => void addCard(uid)}
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
