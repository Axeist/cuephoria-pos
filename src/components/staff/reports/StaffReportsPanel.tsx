import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStaffHR } from '@/context/StaffHRContext';
import StaffEmptyState from '@/components/staff/shared/StaffEmptyState';
import StatsCard from '@/components/dashboard/StatsCard';
import { fetchAttendanceForMonth, fetchAuditLog } from '@/services/staff/staffApi';
import { staffProfileIds } from '@/services/staff/staffMappers';
import { BarChart3, Download, TrendingUp, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';

const StaffReportsPanel: React.FC = () => {
  const { profiles, isLoading, staffScope } = useStaffHR();
  const [attendance, setAttendance] = useState<{ totalHours: number; records: number; lateCount: number }>({
    totalHours: 0,
    records: 0,
    lateCount: 0,
  });
  const [auditCount, setAuditCount] = useState(0);
  const [loadingReport, setLoadingReport] = useState(false);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const profileIds = useMemo(() => staffProfileIds(profiles), [profiles]);

  useEffect(() => {
    if (!profileIds.length || isLoading) return;
    let cancelled = false;
    (async () => {
      setLoadingReport(true);
      try {
        const [records, audit] = await Promise.all([
          fetchAttendanceForMonth(profileIds, month, year),
          staffScope ? fetchAuditLog(staffScope, 100) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        const totalHours = records.reduce((s, r) => s + (Number(r.total_working_hours) || 0), 0);
        setAttendance({
          totalHours,
          records: records.length,
          lateCount: records.filter((r) => r.notes?.toLowerCase().includes('late')).length,
        });
        setAuditCount(audit.length);
      } finally {
        if (!cancelled) setLoadingReport(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileIds.join(','), month, year, isLoading, staffScope?.organizationId]);

  const exportCsv = () => {
    const headers = ['Staff', 'Designation', 'Salary', 'Active'];
    const rows = profiles.map((p) => [
      p.full_name || p.username,
      p.designation,
      String(p.monthly_salary),
      p.is_active ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-report-${format(now, 'yyyy-MM')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || loadingReport) {
    return <StaffEmptyState loading />;
  }

  const payrollTotal = profiles.reduce((s, p) => s + (Number(p.monthly_salary) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            HR Reports — {format(now, 'MMMM yyyy')}
          </h3>
          <p className="text-sm text-muted-foreground">Attendance and payroll insights for your scope.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="border-border/60">
          <Download className="h-4 w-4 mr-2" />
          Export staff CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Hours logged"
          value={attendance.totalHours.toFixed(1)}
          subValue={`${attendance.records} records this month`}
          icon={Clock}
          iconColor="text-green-500"
          iconBgColor="bg-green-500/15"
        />
        <StatsCard
          title="Active headcount"
          value={profiles.filter((p) => p.is_active).length}
          subValue={`of ${profiles.length} total`}
          icon={Users}
          iconColor="text-cuephoria-lightpurple"
          iconBgColor="bg-purple-500/15"
        />
        <StatsCard
          title="Monthly salary base"
          value={`₹${payrollTotal.toLocaleString()}`}
          subValue="Sum of monthly salaries"
          icon={TrendingUp}
          iconColor="text-cuephoria-blue"
          iconBgColor="bg-blue-500/15"
        />
        <StatsCard
          title="HR audit events"
          value={auditCount}
          subValue="Recent logged actions"
          icon={BarChart3}
          iconColor="text-orange-400"
          iconBgColor="bg-orange-500/15"
        />
      </div>

      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-base">Staff payroll base</CardTitle>
          <CardDescription>Monthly salary by team member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {profiles.map((p) => (
              <div
                key={p.user_id}
                className="flex items-center justify-between theme-inset px-3 py-2 rounded-lg text-sm"
              >
                <span className="text-white">{p.full_name || p.username}</span>
                <span className="text-muted-foreground">{p.designation}</span>
                <span className="font-medium text-white">₹{Number(p.monthly_salary).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffReportsPanel;
