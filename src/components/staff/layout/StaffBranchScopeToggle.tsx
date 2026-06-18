import React from 'react';
import { Globe, MapPin } from 'lucide-react';
import type { StaffReportScope } from '@/types/staff.types';
import { cn } from '@/lib/utils';

type Props = {
  scope: StaffReportScope;
  onChange: (scope: StaffReportScope) => void;
  locationName?: string | null;
  className?: string;
};

const StaffBranchScopeToggle: React.FC<Props> = ({
  scope,
  onChange,
  locationName,
  className,
}) => (
  <div className={cn('flex items-center gap-2 flex-wrap', className)}>
    <button
      type="button"
      onClick={() => onChange('location')}
      className={cn(
        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors',
        scope === 'location'
          ? 'bg-primary/20 border-primary/50 text-primary font-semibold'
          : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground',
      )}
    >
      <MapPin className="h-3 w-3" />
      {locationName ? `${locationName} only` : 'This branch'}
    </button>
    <button
      type="button"
      onClick={() => onChange('all')}
      className={cn(
        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors',
        scope === 'all'
          ? 'bg-blue-500/15 border-blue-400/40 text-blue-400 font-semibold'
          : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground',
      )}
    >
      <Globe className="h-3 w-3" />
      All branches
    </button>
  </div>
);

export default StaffBranchScopeToggle;
