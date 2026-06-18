import React, { useMemo } from 'react';
import {
  Users,
  User,
  Activity,
  Calendar,
  FileText,
  DollarSign,
  CalendarDays,
  BarChart3,
  BookOpen,
  History,
  type LucideIcon,
} from 'lucide-react';
import type { StaffTabId } from '@/types/staff.types';
import { HR_TAB_PERMISSIONS } from '@/constants/permissionCatalog';
import { cn } from '@/lib/utils';

export type StaffNavItem = {
  id: StaffTabId;
  label: string;
  description?: string;
  icon: LucideIcon;
};

export type StaffNavGroup = {
  label: string;
  items: StaffNavItem[];
};

export const STAFF_NAV_GROUPS: StaffNavGroup[] = [
  {
    label: 'People',
    items: [
      { id: 'overview', label: 'Overview', description: 'Live shifts & pending items', icon: Users },
      { id: 'directory', label: 'Directory', description: 'Profiles and roles', icon: User },
    ],
  },
  {
    label: 'Time',
    items: [
      { id: 'attendance', label: 'Attendance', description: 'Clock-ins and history', icon: Activity },
      { id: 'calendar', label: 'Calendar', description: 'Monthly grid view', icon: Calendar },
      { id: 'shifts', label: 'Shifts', description: 'Weekly roster', icon: CalendarDays },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'requests', label: 'Requests', description: 'Leave, OT, regularization', icon: FileText },
      { id: 'payroll', label: 'Payroll', description: 'Payslips and payouts', icon: DollarSign },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'reports', label: 'Reports', description: 'Exports and summaries', icon: BarChart3 },
    ],
  },
  {
    label: 'HR',
    items: [
      { id: 'policies', label: 'Policies', description: 'Leave quotas', icon: BookOpen },
      { id: 'holidays', label: 'Holidays', description: 'Holiday calendar', icon: CalendarDays },
      { id: 'audit', label: 'Audit', description: 'Change history', icon: History },
    ],
  },
];

export const STAFF_SECTION_META: Record<StaffTabId, { title: string; description: string }> = {
  overview: { title: 'Overview', description: 'Active shifts, pending leaves, and quick actions for your team.' },
  directory: { title: 'Staff directory', description: 'Manage profiles, salaries, and employment details.' },
  attendance: { title: 'Attendance', description: 'Monitor active shifts and review attendance history.' },
  calendar: { title: 'Attendance calendar', description: 'Visual monthly view of every employee’s status.' },
  shifts: { title: 'Shift roster', description: 'Set default weekly schedules per staff member.' },
  requests: { title: 'Requests', description: 'Approve or reject leave, OT, and regularization requests.' },
  payroll: { title: 'Payroll', description: 'Generate payslips, allowances, and deductions.' },
  reports: { title: 'Reports', description: 'Attendance summaries and CSV exports.' },
  policies: { title: 'Leave policies', description: 'Configure annual quotas and seed balances.' },
  holidays: { title: 'Holidays', description: 'Org-wide and branch-specific holiday dates.' },
  audit: { title: 'Audit trail', description: 'Sensitive HR actions and payroll changes.' },
};

const ALL_ITEMS = STAFF_NAV_GROUPS.flatMap((g) => g.items);

type DesktopProps = {
  activeTab: StaffTabId;
  onChange: (tab: StaffTabId) => void;
  pendingBadge?: number;
  canAccess?: (tab: StaffTabId) => boolean;
};

export function StaffNavDesktop({ activeTab, onChange, pendingBadge, canAccess }: DesktopProps) {
  return (
    <nav className="space-y-5" aria-label="Staff sections">
      {STAFF_NAV_GROUPS.map((group) => {
        const items = canAccess ? group.items.filter((item) => canAccess(item.id)) : group.items;
        if (items.length === 0) return null;
        return (
        <div key={group.label} className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {items.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onChange(item.id)}
                    className={cn(
                      'relative w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      active
                        ? 'bg-primary/10 text-foreground border border-primary/20 shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', active ? 'text-primary' : 'opacity-70')} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-none">{item.label}</span>
                      {item.description && (
                        <span className="block text-xs text-muted-foreground mt-1 leading-snug">
                          {item.description}
                        </span>
                      )}
                    </span>
                    {item.id === 'requests' && pendingBadge != null && pendingBadge > 0 && (
                      <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                        {pendingBadge > 99 ? '99+' : pendingBadge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        );
      })}
    </nav>
  );
}

export function StaffNavMobile({ activeTab, onChange, pendingBadge, canAccess }: DesktopProps) {
  const items = canAccess ? ALL_ITEMS.filter((item) => canAccess(item.id)) : ALL_ITEMS;
  return (
    <div className="lg:hidden -mx-1 overflow-x-auto scrollbar-hide">
      <div className="flex gap-1.5 px-1 pb-1 min-w-max">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                'relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors border',
                active
                  ? 'bg-primary/15 border-primary/30 text-foreground'
                  : 'bg-muted/30 border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
              {item.id === 'requests' && pendingBadge != null && pendingBadge > 0 && (
                <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white inline-flex items-center justify-center">
                  {pendingBadge > 99 ? '99+' : pendingBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function useStaffNavLabel(tab: StaffTabId): string {
  return useMemo(() => ALL_ITEMS.find((i) => i.id === tab)?.label ?? tab, [tab]);
}

export { HR_TAB_PERMISSIONS };
