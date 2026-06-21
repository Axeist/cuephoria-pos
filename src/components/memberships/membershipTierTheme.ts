export type MembershipTierAccent = 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'gold';

export const TIER_ACCENT_OPTIONS: { id: MembershipTierAccent; label: string; hex: string }[] = [
  { id: 'violet', label: 'Royal Violet', hex: '#8B5CF6' },
  { id: 'cyan', label: 'Electric Cyan', hex: '#06B6D4' },
  { id: 'emerald', label: 'Emerald', hex: '#10B981' },
  { id: 'amber', label: 'Gold Amber', hex: '#F59E0B' },
  { id: 'rose', label: 'Rose', hex: '#F43F5E' },
  { id: 'gold', label: 'Champagne', hex: '#EAB308' },
];

export const TIER_ACCENT_STYLES: Record<
  MembershipTierAccent,
  { border: string; bg: string; glow: string; text: string; chip: string }
> = {
  violet: {
    border: 'border-violet-500/40',
    bg: 'from-violet-600/25 via-violet-950/40 to-[#0a0814]',
    glow: 'shadow-violet-500/20',
    text: 'text-violet-200',
    chip: 'bg-violet-500/15 text-violet-200 border-violet-400/25',
  },
  cyan: {
    border: 'border-cyan-500/40',
    bg: 'from-cyan-600/20 via-cyan-950/35 to-[#0a0814]',
    glow: 'shadow-cyan-500/20',
    text: 'text-cyan-200',
    chip: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/25',
  },
  emerald: {
    border: 'border-emerald-500/40',
    bg: 'from-emerald-600/20 via-emerald-950/35 to-[#0a0814]',
    glow: 'shadow-emerald-500/20',
    text: 'text-emerald-200',
    chip: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25',
  },
  amber: {
    border: 'border-amber-500/40',
    bg: 'from-amber-600/20 via-amber-950/30 to-[#0a0814]',
    glow: 'shadow-amber-500/20',
    text: 'text-amber-200',
    chip: 'bg-amber-500/15 text-amber-200 border-amber-400/25',
  },
  rose: {
    border: 'border-rose-500/40',
    bg: 'from-rose-600/20 via-rose-950/35 to-[#0a0814]',
    glow: 'shadow-rose-500/20',
    text: 'text-rose-200',
    chip: 'bg-rose-500/15 text-rose-200 border-rose-400/25',
  },
  gold: {
    border: 'border-yellow-500/40',
    bg: 'from-yellow-600/15 via-yellow-950/25 to-[#0a0814]',
    glow: 'shadow-yellow-500/15',
    text: 'text-yellow-200',
    chip: 'bg-yellow-500/15 text-yellow-200 border-yellow-400/25',
  },
};

export function normalizeTierAccent(value?: string | null): MembershipTierAccent {
  const key = (value ?? 'violet') as MembershipTierAccent;
  return TIER_ACCENT_STYLES[key] ? key : 'violet';
}
