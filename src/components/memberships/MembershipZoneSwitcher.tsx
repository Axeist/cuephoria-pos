import React from 'react';
import { motion } from 'framer-motion';
import { Settings2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { membershipSpring } from '@/components/memberships/membershipMotion';
import type { HubZone } from '@/components/memberships/membershipHubConstants';

type MembershipZoneSwitcherProps = {
  activeZone: HubZone;
  onZoneChange: (zone: HubZone) => void;
};

const ZONES: { id: HubZone; label: string; icon: React.ElementType }[] = [
  { id: 'ops', label: 'Member desk', icon: Users },
  { id: 'setup', label: 'Program setup', icon: Settings2 },
];

export default function MembershipZoneSwitcher({
  activeZone,
  onZoneChange,
}: MembershipZoneSwitcherProps) {
  const activeIndex = ZONES.findIndex((z) => z.id === activeZone);

  return (
    <div className="relative inline-flex w-full sm:w-auto rounded-xl border border-white/10 bg-black/30 p-1 backdrop-blur-md shadow-inner shadow-black/20">
      <motion.div
        className="absolute inset-y-1 rounded-lg bg-gradient-to-r from-violet-600/90 to-indigo-600/90 shadow-lg shadow-violet-900/40"
        layoutId="membership-zone-pill"
        transition={membershipSpring}
        style={{
          width: `calc((100% - 0.5rem) / ${ZONES.length})`,
          left: `calc(0.25rem + ${activeIndex} * ((100% - 0.5rem) / ${ZONES.length}))`,
        }}
      />
      {ZONES.map((zone) => {
        const active = activeZone === zone.id;
        return (
          <button
            key={zone.id}
            type="button"
            onClick={() => onZoneChange(zone.id)}
            className={cn(
              'relative z-10 flex flex-1 sm:flex-none sm:min-w-[130px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active ? 'text-white' : 'text-muted-foreground hover:text-white/80',
            )}
          >
            <zone.icon className="h-4 w-4" />
            {zone.label}
          </button>
        );
      })}
    </div>
  );
}
