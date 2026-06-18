
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number | React.ReactNode;
  icon: LucideIcon;
  subValue?: string | React.ReactNode;
  iconColor: string;
  iconBgColor: string;
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  subValue,
  iconColor,
  iconBgColor,
  className = ""
}) => {
  return (
    <Card
      className={`glass-card glass-card-interactive group relative overflow-hidden ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-40 transition-opacity duration-300 group-hover:opacity-70"
        style={{
          background:
            'radial-gradient(circle, color-mix(in oklab, var(--brand-primary-hex) 60%, transparent) 0%, transparent 70%)',
        }}
      />
      <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-white/70 tracking-wide">
          {title}
        </CardTitle>
        <div
          className={`h-10 w-10 rounded-xl ${iconBgColor} flex items-center justify-center border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-3xl font-extrabold font-heading text-white tracking-tight">
          {value}
        </div>
        {subValue && (
          typeof subValue === 'string'
            ? <p className="text-xs text-white/50 mt-1">{subValue}</p>
            : <div className="text-xs text-white/50 mt-1">{subValue}</div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;
