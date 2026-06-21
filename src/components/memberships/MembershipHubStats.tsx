import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, IdCard, Layers, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MembershipCardWithMember, MembershipCoupon, MembershipTier } from '@/types/membership.types';

interface MembershipHubStatsProps {
  activeMembersCount: number;
  tiers: MembershipTier[];
  cards: MembershipCardWithMember[];
  coupons: MembershipCoupon[];
}

export default function MembershipHubStats({
  activeMembersCount,
  tiers,
  cards,
  coupons,
}: MembershipHubStatsProps) {
  const stats = useMemo(() => {
    const activeTiers = tiers.filter((t) => t.isActive).length;
    const linkedCards = cards.filter((c) => c.customerId && c.status === 'assigned').length;
    const activeCoupons = coupons.filter((c) => c.enabled).length;
    return { activeTiers, linkedCards, activeCoupons };
  }, [tiers, cards, coupons]);

  const widgets = [
    {
      label: 'Active members',
      value: activeMembersCount,
      sub: 'With tier assigned',
      icon: IdCard,
      accent: 'from-violet-500/20 to-purple-600/10 border-violet-400/30 text-violet-200',
    },
    {
      label: 'Tier plans',
      value: stats.activeTiers,
      sub: `${tiers.length} total`,
      icon: Layers,
      accent: 'from-blue-500/20 to-indigo-600/10 border-blue-400/30 text-blue-200',
    },
    {
      label: 'Linked cards',
      value: stats.linkedCards,
      sub: `${cards.length} total`,
      icon: CreditCard,
      accent: 'from-cyan-500/20 to-teal-600/10 border-cyan-400/30 text-cyan-200',
    },
    {
      label: 'Member coupons',
      value: stats.activeCoupons,
      sub: `${coupons.length} total`,
      icon: Wallet,
      accent: 'from-emerald-500/20 to-green-600/10 border-emerald-400/30 text-emerald-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {widgets.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className={cn(
            'relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 lg:p-5',
            card.accent,
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-wider opacity-70 font-medium">
                {card.label}
              </p>
              <p className="text-3xl lg:text-4xl font-bold mt-1 tabular-nums">{card.value}</p>
              <p className="text-xs opacity-60 mt-1">{card.sub}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-2.5 border border-white/10">
              <card.icon className="h-5 w-5 opacity-90" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
