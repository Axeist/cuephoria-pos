import React, { useCallback, useState } from 'react';
import { CreditCard, Loader2, Search, Zap } from 'lucide-react';
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
import { useLocation } from '@/context/LocationContext';
import { useToast } from '@/hooks/use-toast';
import { useMembershipFeatures } from '@/hooks/useMembershipFeatures';
import { useNfcWedgeListener } from '@/hooks/useNfcWedgeListener';
import { lookupMembershipCard } from '@/services/membershipService';
import type { MembershipCardLookupResult } from '@/types/membership.types';
import { isValidNfcUid, normalizeNfcUid } from '@/utils/nfcUid.utils';
import { cn } from '@/lib/utils';
import { CurrencyDisplay } from '@/components/ui/currency';

const SIMULATED_UIDS = [
  { label: 'Demo card A', uid: 'AABBCCDD' },
  { label: 'Demo card B', uid: '11223344' },
  { label: 'Demo card C', uid: 'DEADBEEF' },
];

type NfcCardLookupPanelProps = {
  onMemberResolved: (result: MembershipCardLookupResult) => void;
  className?: string;
  disabled?: boolean;
  wedgeEnabled?: boolean;
};

export default function NfcCardLookupPanel({
  onMemberResolved,
  className,
  disabled = false,
  wedgeEnabled = true,
}: NfcCardLookupPanelProps) {
  const { toast } = useToast();
  const { activeLocationId } = useLocation();
  const { canUse } = useMembershipFeatures();
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<MembershipCardLookupResult | null>(null);

  const showSimulation =
    import.meta.env.DEV || canUse('nfc_simulation_enabled');

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
          throw new Error('Card is not linked to a member');
        }
        setLastResult(result);
        onMemberResolved(result);
        toast({
          title: 'Card found',
          description: result.customer.name,
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
    onScan: (scanned) => {
      void runLookup(scanned);
    },
  });

  return (
    <div className={cn('glass-card border-white/10 p-4 sm:p-5 space-y-4', className)}>
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-2.5">
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white">NFC card lookup</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tap a card on the reader or enter the UID manually.
          </p>
        </div>
      </div>

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
            placeholder="AABBCCDD"
            className="font-mono uppercase tracking-wider"
            disabled={disabled || loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void runLookup(uid);
              }
            }}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button
            type="button"
            className="btn-gradient gap-1.5 min-w-[120px]"
            disabled={disabled || loading || !uid}
            onClick={() => void runLookup(uid)}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Look up
          </Button>
        </div>
      </div>

      {showSimulation && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            Simulate tap
          </div>
          <Select
            disabled={disabled || loading}
            onValueChange={(value) => void runLookup(value)}
          >
            <SelectTrigger className="h-9 text-sm bg-white/[0.03] border-white/10">
              <SelectValue placeholder="Choose demo UID…" />
            </SelectTrigger>
            <SelectContent>
              {SIMULATED_UIDS.map((item) => (
                <SelectItem key={item.uid} value={item.uid} className="font-mono">
                  {item.label} — {item.uid}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {lastResult && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm">
          <p className="font-medium text-emerald-200">{lastResult.customer.name}</p>
          <p className="text-sm text-muted-foreground mt-1.5">
            {lastResult.customer.phone}
            {lastResult.customer.customerId ? ` · ${lastResult.customer.customerId}` : ''}
            {lastResult.tier ? ` · ${lastResult.tier.name}` : ''}
            {' · Balance '}
            <CurrencyDisplay amount={lastResult.customer.cardBalance ?? 0} />
          </p>
        </div>
      )}
    </div>
  );
}
