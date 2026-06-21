import React, { useCallback, useState } from 'react';
import { CreditCard, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocation } from '@/context/LocationContext';
import { useToast } from '@/hooks/use-toast';
import { useNfcWedgeListener } from '@/hooks/useNfcWedgeListener';
import { assignNfcCard } from '@/services/membershipService';
import type { MembershipCard, MembershipCardLookupResult } from '@/types/membership.types';
import { isValidNfcUid, normalizeNfcUid } from '@/utils/nfcUid.utils';
import MembershipPanelShell from '@/components/memberships/MembershipPanelShell';
import { CurrencyDisplay } from '@/components/ui/currency';

type AssignMemberCardPanelProps = {
  member: MembershipCardLookupResult | null;
  onAssigned: (card: MembershipCard) => void;
  disabled?: boolean;
};

export default function AssignMemberCardPanel({
  member,
  onAssigned,
  disabled = false,
}: AssignMemberCardPanelProps) {
  const { toast } = useToast();
  const { activeLocationId } = useLocation();
  const [uid, setUid] = useState('');
  const [linking, setLinking] = useState(false);

  const linkCard = useCallback(
    async (rawUid: string) => {
      if (!member?.customer?.id) {
        toast({
          title: 'Select a member first',
          description: 'Find a member by Customer ID before linking a card.',
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
      setLinking(true);
      try {
        const res = await assignNfcCard(
          {
            uid: normalized,
            customerId: member.customer.id,
            locationId: activeLocationId,
          },
          activeLocationId,
        );
        onAssigned(res.card);
        toast({
          title: 'Card linked',
          description: `${normalized} → ${member.customer.customerId || member.customer.name}`,
        });
        setUid('');
      } catch (err) {
        toast({
          title: 'Link failed',
          description: err instanceof Error ? err.message : 'Could not link card',
          variant: 'destructive',
        });
      } finally {
        setLinking(false);
      }
    },
    [activeLocationId, member, onAssigned, toast],
  );

  useNfcWedgeListener({
    enabled: !disabled && !linking && !!member?.customer?.id,
    onScan: (scanned) => void linkCard(scanned),
  });

  return (
    <MembershipPanelShell
      step={2}
      accent="cyan"
      title="Link NFC card to member"
      description="Every card must be tied to a member. Tap the tag or enter its UID."
      icon={<Link2 className="h-5 w-5" />}
    >
      {!member?.customer ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-8 text-center">
          <CreditCard className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Select a member above to link their card.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-cyan-200/70 font-semibold">
              Linking to
            </p>
            <p className="font-semibold text-white mt-1">{member.customer.name}</p>
            <p className="text-sm text-muted-foreground mt-0.5 font-mono">
              {member.customer.customerId || member.customer.phone}
              {member.tier ? ` · ${member.tier.name}` : ''}
              {' · '}
              <CurrencyDisplay amount={member.customer.cardBalance ?? 0} />
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="assign-card-uid" className="text-xs text-muted-foreground">
                Card UID (hex)
              </Label>
              <Input
                id="assign-card-uid"
                data-nfc-wedge="true"
                value={uid}
                onChange={(e) => setUid(normalizeNfcUid(e.target.value))}
                placeholder="Scan or type UID…"
                className="font-mono uppercase tracking-widest bg-black/30 border-white/10 h-11"
                disabled={disabled || linking}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void linkCard(uid);
                  }
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                className="btn-gradient gap-2 h-11 min-w-[140px]"
                disabled={disabled || linking || !uid}
                onClick={() => void linkCard(uid)}
              >
                {linking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Link card
              </Button>
            </div>
          </div>
        </div>
      )}
    </MembershipPanelShell>
  );
}
