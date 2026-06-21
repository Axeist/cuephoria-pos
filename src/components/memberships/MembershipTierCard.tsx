import React from 'react';
import { Gamepad2, Utensils, Wallet, Calendar, Clock, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CurrencyDisplay } from '@/components/ui/currency';
import type { MembershipTier } from '@/types/membership.types';
import { cn } from '@/lib/utils';
import {
  normalizeTierAccent,
  TIER_ACCENT_STYLES,
} from '@/components/memberships/membershipTierTheme';

type MembershipTierCardProps = {
  tier: MembershipTier;
  className?: string;
  compact?: boolean;
};

export default function MembershipTierCard({ tier, className, compact }: MembershipTierCardProps) {
  const accent = normalizeTierAccent(tier.accentColor);
  const style = TIER_ACCENT_STYLES[accent];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-gradient-to-br shadow-lg transition hover:scale-[1.01]',
        style.border,
        style.bg,
        style.glow,
        compact ? 'p-4' : 'p-5',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/[0.04] blur-2xl"
      />
      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className={cn('h-4 w-4 shrink-0', style.text)} />
              <h3 className={cn('font-bold truncate', compact ? 'text-base' : 'text-lg', style.text)}>
                {tier.name}
              </h3>
            </div>
            {tier.tagline ? (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tier.tagline}</p>
            ) : null}
          </div>
          <Badge
            variant="outline"
            className={cn('shrink-0 text-[10px] uppercase tracking-wide', style.chip)}
          >
            {tier.isActive ? 'Live' : 'Draft'}
          </Badge>
        </div>

        {tier.description ? (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {tier.description}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {tier.playtimeDiscountPct > 0 && (
            <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px]', style.chip)}>
              <Gamepad2 className="h-3 w-3" />
              {tier.playtimeDiscountPct}% playtime
            </span>
          )}
          {tier.fnbDiscountPct > 0 && (
            <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px]', style.chip)}>
              <Utensils className="h-3 w-3" />
              {tier.fnbDiscountPct}% F&B
            </span>
          )}
          {(tier.walletCreditOnPurchase ?? 0) > 0 && (
            <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px]', style.chip)}>
              <Wallet className="h-3 w-3" />
              +<CurrencyDisplay amount={tier.walletCreditOnPurchase ?? 0} /> wallet
            </span>
          )}
          <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px]', style.chip)}>
            <Calendar className="h-3 w-3" />
            {tier.defaultDuration === 'weekly' ? 'Weekly' : 'Monthly'}
          </span>
          <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px]', style.chip)}>
            <Clock className="h-3 w-3" />
            {tier.defaultMembershipHours ?? 4}h included
          </span>
        </div>

        <div className="flex items-end justify-between gap-2 pt-1 border-t border-white/8">
          <div>
            {(tier.compareAtPrice ?? 0) > (tier.retailPrice ?? 0) && (
              <p className="text-xs text-muted-foreground line-through">
                <CurrencyDisplay amount={tier.compareAtPrice ?? 0} />
              </p>
            )}
            <p className={cn('text-xl font-bold tabular-nums', style.text)}>
              <CurrencyDisplay amount={tier.retailPrice ?? 0} />
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">POS price</p>
          </div>
          {tier.productId && (
            <span className="text-[10px] font-mono text-muted-foreground/80">In catalog</span>
          )}
        </div>
      </div>
    </div>
  );
}
