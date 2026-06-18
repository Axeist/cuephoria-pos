import React from 'react';
import { Loader2, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  loading?: boolean;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export const StaffEmptyState: React.FC<Props> = ({
  loading,
  title = 'Nothing here yet',
  description,
  action,
  className,
}) => {
  if (loading) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 gap-3', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-3 text-center', className)}>
      <div className="h-12 w-12 rounded-xl bg-muted/20 border border-border/50 flex items-center justify-center">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action}
    </div>
  );
};

export default StaffEmptyState;
