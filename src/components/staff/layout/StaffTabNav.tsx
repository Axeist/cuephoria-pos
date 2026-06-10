import React from 'react';
import {
  Users,
  User,
  Activity,
  Calendar,
  FileText,
  DollarSign,
  CalendarDays,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import type { StaffTabId } from '@/types/staff.types';
import { cn } from '@/lib/utils';

const TABS: { id: StaffTabId; label: string; icon: LucideIcon; shortLabel?: string }[] = [
  { id: 'overview', label: 'Overview', icon: Users },
  { id: 'directory', label: 'Directory', icon: User },
  { id: 'attendance', label: 'Attendance', icon: Activity },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'shifts', label: 'Shifts', icon: CalendarDays, shortLabel: 'Shifts' },
  { id: 'requests', label: 'Requests', icon: FileText },
  { id: 'payroll', label: 'Payroll', icon: DollarSign },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

type Props = {
  activeTab: StaffTabId;
  onChange: (tab: StaffTabId) => void;
  pendingBadge?: number;
};

const StaffTabNav: React.FC<Props> = ({ activeTab, onChange, pendingBadge }) => (
  <div className="overflow-x-auto -mx-1 px-1">
    <div className="p-1 rounded-xl glass-card inline-flex gap-1 min-w-max">
      {TABS.map(({ id, label, icon: Icon, shortLabel }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'relative flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-lg font-medium transition-all text-xs sm:text-sm whitespace-nowrap',
              active ? 'btn-gradient text-white shadow-md' : 'text-white/55 hover:text-white hover:bg-white/5',
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{shortLabel ?? label}</span>
            {id === 'requests' && pendingBadge != null && pendingBadge > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                {pendingBadge > 99 ? '99+' : pendingBadge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

export default StaffTabNav;
