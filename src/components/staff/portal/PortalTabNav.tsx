import React from 'react';
import { cn } from '@/lib/utils';

export type PortalTabId = 'attendance' | 'requests' | 'payslips';

type Props = {
  active: PortalTabId;
  onChange: (tab: PortalTabId) => void;
};

const TABS: { id: PortalTabId; label: string }[] = [
  { id: 'attendance', label: 'Attendance' },
  { id: 'requests', label: 'My Requests' },
  { id: 'payslips', label: 'Payslips' },
];

const PortalTabNav: React.FC<Props> = ({ active, onChange }) => (
  <div className="overflow-x-auto -mx-1 px-1 mb-6">
    <div className="p-1 rounded-xl glass-card inline-flex gap-1 min-w-max w-full sm:w-auto">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'flex-1 sm:flex-none py-2.5 px-4 rounded-lg font-medium transition-all text-sm whitespace-nowrap',
            active === id
              ? 'btn-gradient text-white shadow-md'
              : 'text-white/55 hover:text-white hover:bg-white/5',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
);

export default PortalTabNav;
