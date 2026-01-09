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

const StaffManagement = () => {
  const { toast } = useToast();
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
  }, []);

  const fetchStaffData = async () => {
    setIsLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('staff_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      setStaffProfiles(profiles || []);

      const { data: shifts, error: shiftsError } = await supabase
        .from('today_active_shifts')
        .select('*');

      if (shiftsError) throw shiftsError;
      setActiveShifts(shifts || []);

      const { data: leaves, error: leavesError } = await supabase
        .from('pending_leaves_view')
        .select('*');

      if (leavesError) throw leavesError;
      setPendingLeaves(leaves || []);

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const { data: payroll, error: payrollError } = await supabase
        .from('staff_payslip_view')
        .select('net_salary')
        .eq('month', currentMonth)
        .eq('year', currentYear);

      if (payrollError) throw payrollError;
      
      const total = (payroll || []).reduce((sum, p) => sum + (p.net_salary || 0), 0);
      setMonthlyPayroll(total);

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
            className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white"
          >
            Regularize Attendance
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-cuephoria-purple hover:bg-cuephoria-lightpurple"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Staff Member
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
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

        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
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

        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
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

        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
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
        <div className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 p-1 bg-cuephoria-dark border border-cuephoria-purple/20 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setActiveStaffTab('overview')}
            className={`flex items-center justify-center gap-2 py-3 px-2 sm:px-4 rounded-lg font-medium transition-all duration-200 whitespace-nowrap text-xs sm:text-sm ${
              activeStaffTab === 'overview'
                ? 'bg-cuephoria-purple text-white shadow-lg shadow-cuephoria-purple/30'
                : 'text-muted-foreground hover:text-white hover:bg-cuephoria-purple/20'
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
                ? 'bg-cuephoria-purple text-white shadow-lg shadow-cuephoria-purple/30'
                : 'text-muted-foreground hover:text-white hover:bg-cuephoria-purple/20'
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
                ? 'bg-cuephoria-purple text-white shadow-lg shadow-cuephoria-purple/30'
                : 'text-muted-foreground hover:text-white hover:bg-cuephoria-purple/20'
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
                ? 'bg-cuephoria-purple text-white shadow-lg shadow-cuephoria-purple/30'
                : 'text-muted-foreground hover:text-white hover:bg-cuephoria-purple/20'
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
                ? 'bg-cuephoria-purple text-white shadow-lg shadow-cuephoria-purple/30'
                : 'text-muted-foreground hover:text-white hover:bg-cuephoria-purple/20'
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
                ? 'bg-cuephoria-purple text-white shadow-lg shadow-cuephoria-purple/30'
                : 'text-muted-foreground hover:text-white hover:bg-cuephoria-purple/20'
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
