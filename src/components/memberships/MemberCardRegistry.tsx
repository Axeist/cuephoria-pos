import React, { useMemo } from 'react';
import { CreditCard, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MembershipCardWithMember } from '@/types/membership.types';
import MembershipPanelShell from '@/components/memberships/MembershipPanelShell';
import { cn } from '@/lib/utils';

type MemberCardRegistryProps = {
  cards: MembershipCardWithMember[];
};

const STATUS_STYLE: Record<string, string> = {
  assigned: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  inventory: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  lost: 'border-red-500/40 bg-red-500/10 text-red-300',
  retired: 'border-white/20 bg-white/5 text-muted-foreground',
};

export default function MemberCardRegistry({ cards }: MemberCardRegistryProps) {
  const linked = useMemo(
    () => cards.filter((c) => c.customerId && c.status === 'assigned'),
    [cards],
  );
  const needsLink = useMemo(
    () => cards.filter((c) => !c.customerId || c.status === 'inventory'),
    [cards],
  );

  return (
    <MembershipPanelShell
      accent="emerald"
      title="Member card registry"
      description={`${linked.length} active link${linked.length === 1 ? '' : 's'} — each UID is bound to a Customer ID.`}
      icon={<CreditCard className="h-5 w-5" />}
    >
      {cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No cards linked yet.</p>
          <p className="text-xs text-muted-foreground/80 mt-1">
            Select a member and tap Link card to register their NFC tag.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {needsLink.length > 0 && (
            <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              {needsLink.length} card(s) without a member — link them using the panel above.
            </p>
          )}
          <div className="space-y-2 max-h-[min(420px,50vh)] overflow-y-auto pr-1">
            {cards.map((card) => (
              <div
                key={card.id}
                className="group flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-3 transition hover:border-emerald-500/25 hover:bg-emerald-500/5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/15 border border-white/10">
                  <CreditCard className="h-4 w-4 text-violet-200" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold text-white tracking-wide">
                    {card.uid}
                  </p>
                  {card.customerName ? (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
                      <User className="h-3 w-3 shrink-0 opacity-60" />
                      <span className="truncate">{card.customerName}</span>
                      {card.customerDisplayId && (
                        <span className="font-mono text-emerald-200/80 shrink-0">
                          · {card.customerDisplayId}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-300/90 mt-0.5">No member linked</p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn('shrink-0 capitalize text-[10px]', STATUS_STYLE[card.status])}
                >
                  {card.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </MembershipPanelShell>
  );
}
