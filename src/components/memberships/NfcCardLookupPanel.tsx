import React, { useCallback, useState } from 'react';
import { CreditCard, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocation } from '@/context/LocationContext';
import { useToast } from '@/hooks/use-toast';
import { useNfcWedgeListener } from '@/hooks/useNfcWedgeListener';
import { lookupMembershipCard } from '@/services/membershipService';
import type { MembershipCardLookupResult } from '@/types/membership.types';
import { isValidNfcUid, normalizeNfcUid } from '@/utils/nfcUid.utils';
import MembershipPanelShell from '@/components/memberships/MembershipPanelShell';
import { CurrencyDisplay } from '@/components/ui/currency';
import { cn } from '@/lib/utils';

type NfcCardLookupPanelProps = {
  onMemberResolved: (result: MembershipCardLookupResult) => void;
  className?: string;
  disabled?: boolean;
  wedgeEnabled?: boolean;
  compact?: boolean;
};

export default function NfcCardLookupPanel({
  onMemberResolved,
  className,
  disabled = false,
  wedgeEnabled = true,
  compact = false,
}: NfcCardLookupPanelProps) {
  const { toast } = useToast();
  const { activeLocationId } = useLocation();
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<MembershipCardLookupResult | null>(null);

  const runLookup = useCallback(
    async (rawUid: string) => {
      const normalized = normalizeNfcUid(rawUid);
      if (!isValidNfcUid(normalized)) {
        toast({
          title: 'Invalid card UID',
          description: 'Enter 4–32 hex characters.',
          variant: 'destructive',
        });
        return;
      }

      setUid(normalized);
      setLoading(true);
      try {
        const res = await lookupMembershipCard(normalized, activeLocationId);
        const result = res.result as MembershipCardLookupResult;
        if (!result?.customer) {
          throw new Error('Card is not linked to a member yet');
        }
        setLastResult(result);
        onMemberResolved(result);
        toast({
          title: 'Member found',
          description: result.customer.customerId
            ? `${result.customer.name} · ${result.customer.customerId}`
            : result.customer.name,
        });
      } catch (err) {
        setLastResult(null);
        toast({
          title: 'Lookup failed',
          description: err instanceof Error ? err.message : 'Card not found',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [activeLocationId, onMemberResolved, toast],
  );

  useNfcWedgeListener({
    enabled: wedgeEnabled && !disabled && !loading,
    onScan: (scanned) => void runLookup(scanned),
  });

  return (
    <MembershipPanelShell
      accent="amber"
      title={compact ? 'Tap to find member' : 'Find by NFC tap'}
      description="Scan a linked card to pull up the member instantly."
      icon={<CreditCard className="h-5 w-5" />}
      className={cn(className)}
    >
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="nfc-uid" className="text-xs text-muted-foreground">
            Card UID
          </Label>
          <Input
            id="nfc-uid"
            data-nfc-wedge="true"
            value={uid}
            onChange={(e) => setUid(normalizeNfcUid(e.target.value))}
            placeholder="Tap or enter UID…"
            className="font-mono uppercase tracking-wider bg-black/30 border-white/10 h-11"
            disabled={disabled || loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void runLookup(uid);
              }
            }}
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            className="btn-gradient gap-1.5 min-w-[120px] h-11"
            disabled={disabled || loading || !uid}
            onClick={() => void runLookup(uid)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Look up
          </Button>
        </div>
      </div>

      {lastResult && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3">
          <p className="font-medium text-emerald-200">{lastResult.customer.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {lastResult.customer.customerId && (
              <span className="font-mono text-emerald-200/80 mr-2">
                {lastResult.customer.customerId}
              </span>
            )}
            {lastResult.tier ? `${lastResult.tier.name} · ` : ''}
            Balance <CurrencyDisplay amount={lastResult.customer.cardBalance ?? 0} />
          </p>
        </div>
      )}
    </MembershipPanelShell>
  );
}
