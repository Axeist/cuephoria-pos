import React from 'react';
import StatsCard from '@/components/dashboard/StatsCard';
import { Users, Activity, Calendar, DollarSign, FileText } from 'lucide-react';
import type { StaffStats } from '@/types/staff.types';

type Props = {
  stats: StaffStats;
};

const StaffStatGrid: React.FC<Props> = ({ stats }) => (
  <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
    <StatsCard
      title="Total Staff"
      value={stats.totalStaff}
      subValue={`${stats.inactiveStaff} inactive`}
      icon={Users}
      iconColor="text-primary"
      iconBgColor="bg-purple-500/15"
    />
    <StatsCard
      title="Active Now"
      value={stats.activeNow}
      subValue="Currently clocked in"
      icon={Activity}
      iconColor="text-green-500"
      iconBgColor="bg-green-500/15"
    />
    <StatsCard
      title="Pending Leaves"
      value={stats.pendingLeaves}
      subValue="Awaiting approval"
      icon={Calendar}
      iconColor="text-yellow-500"
      iconBgColor="bg-yellow-500/15"
    />
    <StatsCard
      title="Pending Requests"
      value={stats.pendingRequests}
      subValue="All request types"
      icon={FileText}
      iconColor="text-orange-400"
      iconBgColor="bg-orange-500/15"
    />
    <StatsCard
      title="Monthly Payroll"
      value={`₹${stats.monthlyPayroll.toLocaleString()}`}
      subValue="Total net this month"
      icon={DollarSign}
      iconColor="text-blue-400"
      iconBgColor="bg-blue-500/15"
      className="col-span-2 lg:col-span-1"
    />
  </div>
);

export default StaffStatGrid;
