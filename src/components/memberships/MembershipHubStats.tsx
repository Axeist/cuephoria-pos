import React, { useMemo } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { CreditCard, IdCard, Layers, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  countSpring,
  staggerContainer,
  staggerItem,
} from '@/components/memberships/membershipMotion';
import type { MembershipCardWithMember, MembershipCoupon, MembershipTier } from '@/types/membership.types';

export type HubStatAction = 'members' | 'tiers' | 'cards' | 'coupons';

function AnimatedCount({ value }: { value: number }) {
  const spring = useSpring(0, countSpring);
  const display = useTransform(spring, (v) => Math.round(v));
  const [shown, setShown] = React.useState(0);

  React.useEffect(() => {
    spring.set(value);
    return display.on('change', (v) => setShown(v));
  }, [value, spring, display]);

  return <span>{shown}</span>;
}

interface MembershipHubStatsProps {
  activeMembersCount: number;
  tiers: MembershipTier[];
  cards: MembershipCardWithMember[];
  coupons: MembershipCoupon[];
  onStatClick?: (action: HubStatAction) => void;
}

export default function MembershipHubStats({
  activeMembersCount,
  tiers,
  cards,
  coupons,
  onStatClick,
}: MembershipHubStatsProps) {
  const stats = useMemo(() => {
    const activeTiers = tiers.filter((t) => t.isActive).length;
    const linkedCards = cards.filter((c) => c.customerId && c.status === 'assigned').length;
    const activeCoupons = coupons.filter((c) => c.enabled).length;
    return { activeTiers, linkedCards, activeCoupons };
  }, [tiers, cards, coupons]);

  const widgets: {
    label: string;
    value: number;
    sub: string;
    icon: React.ElementType;
    accent: string;
    iconGlow: string;
    action: HubStatAction;
  }[] = [
    {
      label: 'Active members',
      value: activeMembersCount,
      sub: 'With tier assigned',
      icon: IdCard,
      accent: 'from-violet-500/25 to-purple-600/10 border-violet-400/35 text-violet-100',
      iconGlow: 'group-hover:shadow-violet-500/30',
      action: 'members',
    },
    {
      label: 'Tier plans',
      value: stats.activeTiers,
      sub: `${tiers.length} total`,
      icon: Layers,
      accent: 'from-blue-500/25 to-indigo-600/10 border-blue-400/35 text-blue-100',
      iconGlow: 'group-hover:shadow-blue-500/30',
      action: 'tiers',
    },
    {
      label: 'Linked cards',
      value: stats.linkedCards,
      sub: `${cards.length} total`,
      icon: CreditCard,
      accent: 'from-cyan-500/25 to-teal-600/10 border-cyan-400/35 text-cyan-100',
      iconGlow: 'group-hover:shadow-cyan-500/30',
      action: 'cards',
    },
    {
      label: 'Member coupons',
      value: stats.activeCoupons,
      sub: `${coupons.length} total`,
      icon: Wallet,
      accent: 'from-emerald-500/25 to-green-600/10 border-emerald-400/35 text-emerald-100',
      iconGlow: 'group-hover:shadow-emerald-500/30',
      action: 'coupons',
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {widgets.map((card) => {
        const clickable = !!onStatClick;
        const Tag = clickable ? motion.button : motion.div;
        return (
          <motion.div key={card.label} variants={staggerItem}>
            <Tag
              type={clickable ? 'button' : undefined}
              onClick={clickable ? () => onStatClick(card.action) : undefined}
              whileHover={clickable ? { y: -4, scale: 1.02 } : undefined}
              whileTap={clickable ? { scale: 0.98 } : undefined}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={cn(
                'group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 lg:p-5 w-full text-left',
                card.accent,
                clickable &&
                  'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60',
              )}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.06] to-white/0 opacity-0 group-hover:opacity-100"
                initial={false}
                transition={{ duration: 0.4 }}
              />
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wider opacity-70 font-medium">
                    {card.label}
                  </p>
                  <p className="text-3xl lg:text-4xl font-bold mt-1 tabular-nums">
                    <AnimatedCount value={card.value} />
                  </p>
                  <p className="text-xs opacity-60 mt-1">{card.sub}</p>
                </div>
                <motion.div
                  className={cn(
                    'rounded-xl bg-white/8 p-2.5 border border-white/15 shadow-lg transition-shadow',
                    card.iconGlow,
                  )}
                  whileHover={{ rotate: 6, scale: 1.08 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                >
                  <card.icon className="h-5 w-5 opacity-95" />
                </motion.div>
              </div>
            </Tag>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
