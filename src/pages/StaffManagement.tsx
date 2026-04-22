// src/pages/StaffManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserPlus, Calendar, FileText, DollarSign, Activity, User } from 'lucide-react';
import StaffOverview from '@/components/staff/StaffOverview';
import StaffDirectory from '@/components/staff/StaffDirectory';
import AttendanceManagement from '@/components/staff/AttendanceManagement';
import PayrollManagement from '@/components/staff/PayrollManagement';
import AttendanceCalendarView from '@/components/staff/AttendanceCalendarView';
import AdminRegularizationDialog from '@/components/staff/AdminRegularizationDialog';
import StaffRequestsManagement from '@/components/staff/StaffRequestsManagement';
import CreateStaffDialog from '@/components/staff/CreateStaffDialog';
import { useLocation } from '@/context/LocationContext';

const StaffManagement = () => {
  const { toast } = useToast();
  const { activeLocationId, activeLocation } = useLocation();
  const [staffProfiles, setStaffProfiles] = useState<any[]>([]);
  const [activeShifts, setActiveShifts] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [monthlyPayroll, setMonthlyPayroll] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAdminRegularizationDialog, setShowAdminRegularizationDialog] = useState(false);
  const [activeStaffTab, setActiveStaffTab] = useState<'overview'|'directory'|'attendance'|'calendar'|'requests'|'payroll'>('overview');

  useEffect(() => {
    fetchStaffData();
  }, [activeLocationId]);

  const fetchStaffData = async () => {
    setIsLoading(true);
    try {
      let profilesQuery = supabase
        .from('staff_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeLocationId) profilesQuery = profilesQuery.eq('location_id', activeLocationId);

      let { data: profiles, error: profilesError } = await profilesQuery;

      // If location_id column doesn't exist yet (migration pending), retry without filter
      if (profilesError && (profilesError.code === '42703' || profilesError.message?.includes('location_id'))) {
        const retry = await supabase
          .from('staff_profiles')
          .select('*')
          .order('created_at', { ascending: false });
        profiles = retry.data;
        profilesError = retry.error;
      }

      if (profilesError) throw profilesError;
      setStaffProfiles(profiles || []);

      // Views key staff_id to staff_profiles.user_id (PK), not a separate profile row id.
      const profileIds = (profiles || [])
        .map((p: { user_id?: string; id?: string }) => p.user_id ?? p.id)
        .filter((id): id is string => Boolean(id));

      let shifts: any[] = [];
      if (profileIds.length > 0) {
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('today_active_shifts')
          .select('*')
          .in('staff_id', profileIds);
        if (shiftsError) {
          console.warn('StaffManagement: today_active_shifts', shiftsError);
        } else {
          shifts = shiftsData || [];
        }
      }
      setActiveShifts(shifts);

      let leaves: any[] = [];
      if (profileIds.length > 0) {
        const { data: leavesData, error: leavesError } = await supabase
          .from('pending_leaves_view')
          .select('*')
          .in('staff_id', profileIds);
        if (leavesError) {
          console.warn('StaffManagement: pending_leaves_view', leavesError);
        } else {
          leaves = leavesData || [];
        }
      }
      setPendingLeaves(leaves);

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      let payrollTotal = 0;
      if (profileIds.length > 0) {
        const { data: payroll, error: payrollError } = await supabase
          .from('staff_payslip_view')
          .select('net_salary')
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .in('staff_id', profileIds);
        if (payrollError) {
          console.warn('StaffManagement: staff_payslip_view', payrollError);
        } else {
          payrollTotal = (payroll || []).reduce((sum, p) => sum + (p.net_salary || 0), 0);
        }
      }
      setMonthlyPayroll(payrollTotal);

    } catch (error: any) {
      console.error('Error fetching staff data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load staff data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    totalStaff: staffProfiles?.length || 0,
    activeStaff: staffProfiles?.filter(s => s.is_active).length || 0,
    inactiveStaff: staffProfiles?.filter(s => !s.is_active).length || 0,
    activeNow: activeShifts?.length || 0,
    pendingLeaves: pendingLeaves?.length || 0,
    monthlyPayroll: monthlyPayroll
  };

  return (
    <div className="flex-1 space-y-6 p-6 text-white">
      {/* Branch context banner */}
      {activeLocation && (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
          activeLocation.slug === 'lite'
            ? 'bg-cyan-500/8 border-cyan-400/25 text-cyan-200'
            : 'bg-purple-500/8 border-purple-400/25 text-purple-200'
        }`}>
          <span className={`flex h-2 w-2 rounded-full flex-shrink-0 ${
            activeLocation.slug === 'lite' ? 'bg-cyan-400' : 'bg-purple-400'
          }`} />
          <span className="text-sm font-medium">
            Viewing staff data for <strong>{activeLocation.name}</strong>
          </span>
          <span className="ml-auto text-xs opacity-50 font-mono">[{activeLocation.short_code}]</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight gradient-text font-heading">
            Staff Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage your team, track attendance, and process payroll
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAdminRegularizationDialog(true)}
            variant="outline"
            className="border-amber-400/50 text-amber-200 hover:bg-amber-500/15 hover:text-white"
          >
            Regularize Attendance
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="btn-gradient border-0"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Staff Member
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card glass-card-interactive border-white/10 hover:border-white/15">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-cuephoria-lightpurple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalStaff}</div>
            <p className="text-xs text-muted-foreground">
              {stats.inactiveStaff} inactive
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card glass-card-interactive border-white/10 hover:border-white/15">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.activeNow}</div>
            <p className="text-xs text-muted-foreground">
              Currently clocked in
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card glass-card-interactive border-white/10 hover:border-white/15">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Pending Leaves</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.pendingLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card glass-card-interactive border-white/10 hover:border-white/15">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Monthly Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-cuephoria-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ₹{stats.monthlyPayroll.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total monthly cost
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="w-full">
        <div className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 p-1 bg-white/[0.06] border border-white/10 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setActiveStaffTab('overview')}
            className={`flex items-center justify-center gap-2 py-3 px-2 sm:px-4 rounded-lg font-medium transition-all duration-200 whitespace-nowrap text-xs sm:text-sm ${
              activeStaffTab === 'overview'
                ? 'bg-white/15 text-white shadow-lg ring-1 ring-white/10'
                : 'text-white/55 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Overview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStaffTab('directory')}
            className={`flex items-center justify-center gap-2 py-3 px-2 sm:px-4 rounded-lg font-medium transition-all duration-200 whitespace-nowrap text-xs sm:text-sm ${
              activeStaffTab === 'directory'
                ? 'bg-white/15 text-white shadow-lg ring-1 ring-white/10'
                : 'text-white/55 hover:text-white hover:bg-white/10'
            }`}
          >
            <User className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Directory</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStaffTab('attendance')}
            className={`flex items-center justify-center gap-2 py-3 px-2 sm:px-4 rounded-lg font-medium transition-all duration-200 whitespace-nowrap text-xs sm:text-sm ${
              activeStaffTab === 'attendance'
                ? 'bg-white/15 text-white shadow-lg ring-1 ring-white/10'
                : 'text-white/55 hover:text-white hover:bg-white/10'
            }`}
          >
            <Activity className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Attendance</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStaffTab('calendar')}
            className={`flex items-center justify-center gap-2 py-3 px-2 sm:px-4 rounded-lg font-medium transition-all duration-200 whitespace-nowrap text-xs sm:text-sm ${
              activeStaffTab === 'calendar'
                ? 'bg-white/15 text-white shadow-lg ring-1 ring-white/10'
                : 'text-white/55 hover:text-white hover:bg-white/10'
            }`}
          >
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Calendar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStaffTab('requests')}
            className={`flex items-center justify-center gap-2 py-3 px-2 sm:px-4 rounded-lg font-medium transition-all duration-200 whitespace-nowrap text-xs sm:text-sm ${
              activeStaffTab === 'requests'
                ? 'bg-white/15 text-white shadow-lg ring-1 ring-white/10'
                : 'text-white/55 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Requests</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStaffTab('payroll')}
            className={`flex items-center justify-center gap-2 py-3 px-2 sm:px-4 rounded-lg font-medium transition-all duration-200 whitespace-nowrap text-xs sm:text-sm ${
              activeStaffTab === 'payroll'
                ? 'bg-white/15 text-white shadow-lg ring-1 ring-white/10'
                : 'text-white/55 hover:text-white hover:bg-white/10'
            }`}
          >
            <DollarSign className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Payroll</span>
          </button>
        </div>

        {activeStaffTab === 'overview' && (
          <div className="space-y-4 mt-6">
            <StaffOverview
              staffProfiles={staffProfiles || []}
              activeShifts={activeShifts || []}
              pendingLeaves={pendingLeaves || []}
              isLoading={isLoading}
              onRefresh={fetchStaffData}
            />
          </div>
        )}

        {activeStaffTab === 'directory' && (
          <div className="space-y-4 mt-6">
            <StaffDirectory
              staffProfiles={staffProfiles || []}
              isLoading={isLoading}
              onRefresh={fetchStaffData}
            />
          </div>
        )}

        {activeStaffTab === 'attendance' && (
          <div className="space-y-4 mt-6">
            <AttendanceManagement
              staffProfiles={staffProfiles || []}
              activeShifts={activeShifts || []}
              isLoading={isLoading}
              onRefresh={fetchStaffData}
            />
          </div>
        )}

        {activeStaffTab === 'calendar' && (
          <div className="space-y-4 mt-6">
            <AttendanceCalendarView
              staffProfiles={staffProfiles || []}
              isLoading={isLoading}
              onRefresh={fetchStaffData}
            />
          </div>
        )}

        {activeStaffTab === 'requests' && (
          <div className="space-y-4 mt-6">
            <StaffRequestsManagement
              staffProfiles={staffProfiles || []}
              isLoading={isLoading}
              onRefresh={fetchStaffData}
            />
          </div>
        )}

        {activeStaffTab === 'payroll' && (
          <div className="space-y-4 mt-6">
            <PayrollManagement
              staffProfiles={staffProfiles || []}
              isLoading={isLoading}
              onRefresh={fetchStaffData}
            />
          </div>
        )}
      </div>

      <CreateStaffDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchStaffData}
        locationId={activeLocationId || undefined}
      />

      <AdminRegularizationDialog
        open={showAdminRegularizationDialog}
        onOpenChange={setShowAdminRegularizationDialog}
        staffProfiles={staffProfiles || []}
        onSuccess={fetchStaffData}
      />
    </div>
  );
};

export default StaffManagement;
