import React from 'react';
import { cn } from '@/lib/utils';

type Tab<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
};

function StaffSubTabNav<T extends string>({ tabs, active, onChange, className }: Props<T>) {
  return (
    <div className={cn('overflow-x-auto -mx-1 px-1', className)}>
      <div className="p-1 rounded-xl glass-card inline-flex gap-1 min-w-max">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'py-2 px-4 rounded-lg font-medium transition-all text-sm whitespace-nowrap',
              active === id
                ? 'btn-gradient text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default StaffSubTabNav;
