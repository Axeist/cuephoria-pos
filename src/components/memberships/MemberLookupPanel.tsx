import React, { useCallback, useMemo, useState } from 'react';
import { BadgeCheck, CreditCard, Loader2, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from '@/context/LocationContext';
import { lookupMember } from '@/services/membershipService';
import type { Customer } from '@/types/pos.types';
import type { MembershipCardLookupResult } from '@/types/membership.types';
import { CurrencyDisplay } from '@/components/ui/currency';
import MembershipPanelShell from '@/components/memberships/MembershipPanelShell';
import { cn } from '@/lib/utils';

type MemberLookupPanelProps = {
  members: Customer[];
  onMemberResolved: (result: MembershipCardLookupResult) => void;
  className?: string;
  step?: number;
  title?: string;
  description?: string;
};

export default function MemberLookupPanel({
  members,
  onMemberResolved,
  className,
  step = 1,
  title = 'Find member',
  description = 'Search by Customer ID, phone, or name — the same reference used on POS, stations, and receipts.',
}: MemberLookupPanelProps) {
  const { toast } = useToast();
  const { activeLocationId } = useLocation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<MembershipCardLookupResult | null>(null);

  const activeMembers = useMemo(
    () => members.filter((c) => c.membershipTierId || c.isMember).slice(0, 48),
    [members],
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeMembers.slice(0, 8);
    return activeMembers
      .filter((c) => {
        const id = (c.customerId ?? '').toLowerCase();
        return (
          id.includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
        );
      })
      .slice(0, 8);
  }, [activeMembers, query]);

  const resolveResult = useCallback(
    async (ref: string) => {
      const trimmed = ref.trim();
      if (!trimmed) return;

      setLoading(true);
      try {
        const res = await lookupMember(trimmed, activeLocationId);
        const result = res.result as MembershipCardLookupResult;
        if (!result?.customer) {
          throw new Error('Customer not found');
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
          description: err instanceof Error ? err.message : 'Customer not found',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [activeLocationId, onMemberResolved, toast],
  );

  const pickLocal = (customer: Customer) => {
    const ref = customer.customerId || customer.phone || customer.name;
    setQuery(ref);
    void resolveResult(ref);
  };

  return (
    <MembershipPanelShell
      step={step}
      accent="violet"
      title={title}
      description={description}
      icon={<BadgeCheck className="h-5 w-5" />}
      className={className}
    >
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="member-ref" className="text-xs text-muted-foreground">
            Customer ID or phone
          </Label>
          <Input
            id="member-ref"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. CUE1234ABCD or 9876543210"
            className="font-mono tracking-wide bg-black/30 border-white/10 h-11"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void resolveResult(query);
              }
            }}
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            className="btn-gradient gap-1.5 min-w-[130px] h-11"
            disabled={loading || !query.trim()}
            onClick={() => void resolveResult(query)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Find member
          </Button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            {query.trim() ? 'Matches' : 'Active members'}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {suggestions.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={loading}
                onClick={() => pickLocal(m)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-left',
                  'transition hover:border-violet-400/35 hover:bg-violet-500/10 hover:shadow-md hover:shadow-violet-900/20',
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 border border-violet-400/20">
                  <User className="h-4 w-4 text-violet-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{m.name}</p>
                  <p className="text-xs text-violet-200/70 font-mono truncate">
                    {m.customerId || m.phone}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {lastResult && (
        <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 to-transparent px-4 py-3.5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-emerald-100">{lastResult.customer.name}</p>
            {lastResult.customer.customerId && (
              <span className="rounded-md bg-black/30 px-2 py-0.5 font-mono text-xs text-emerald-200/90 border border-emerald-500/20">
                {lastResult.customer.customerId}
              </span>
            )}
          </div>
          {lastResult.card?.uid && (
            <p className="text-xs font-mono text-cyan-200/90 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Card UID: {lastResult.card.uid}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {lastResult.customer.phone}
            {lastResult.tier ? ` · ${lastResult.tier.name}` : ''}
            {' · Balance '}
            <CurrencyDisplay amount={lastResult.customer.cardBalance ?? 0} />
          </p>
        </div>
      )}
    </MembershipPanelShell>
  );
}
