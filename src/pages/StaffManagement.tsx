// src/pages/StaffManagement.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Clock, CalendarDays, DollarSign, FileText, UserPlus, Shield } from 'lucide-react';
import StaffOverview from '@/components/staff/StaffOverview';
import AttendanceManagement from '@/components/staff/AttendanceManagement';
import LeaveManagement from '@/components/staff/LeaveManagement';
import PayrollManagement from '@/components/staff/PayrollManagement';
import StaffDirectory from '@/components/staff/StaffDirectory';
import CreateStaffDialog from '@/components/staff/CreateStaffDialog';

const StaffManagement = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'directory' | 'attendance' | 'leaves' | 'payroll'>('overview');
  const [staffProfiles, setStaffProfiles] = useState<any[]>([]);
  const [activeShifts, setActiveShifts] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateStaff, setShowCreateStaff] = useState(false);

  useEffect(() => {
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    setIsLoading(true);
    try {
      // Fetch staff profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('staff_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      setStaffProfiles(profiles || []);

      // Fetch today's active shifts
      const { data: shifts, error: shiftsError } = await supabase
        .from('today_active_shifts')
        .select('*');

      if (shiftsError) throw shiftsError;
      setActiveShifts(shifts || []);

      // Fetch pending leave requests
      const { data: leaves, error: leavesError } = await supabase
        .from('pending_leaves_view')
        .select('*');

      if (leavesError) throw leavesError;
      setPendingLeaves(leaves || []);

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

  const statsCards = useMemo(() => [
    {
      title: 'Total Staff',
      value: staffProfiles.filter(s => s.is_active).length,
      icon: Users,
      description: `${staffProfiles.filter(s => !s.is_active).length} inactive`,
      color: 'text-cuephoria-lightpurple'
    },
    {
      title: 'Active Now',
      value: activeShifts.length,
      icon: Clock,
      description: 'Currently clocked in',
      color: 'text-green-500'
    },
    {
      title: 'Pending Leaves',
      value: pendingLeaves.length,
      icon: CalendarDays,
      description: 'Awaiting approval',
      color: 'text-yellow-500'
    },
    {
      title: 'Monthly Payroll',
      value: `₹${staffProfiles.reduce((sum, s) => sum + (s.monthly_salary || 0), 0).toLocaleString()}`,
      icon: DollarSign,
      description: 'Total monthly cost',
      color: 'text-cuephoria-blue'
    }
  ], [staffProfiles, activeShifts, pendingLeaves]);

  return (
    <div className="flex-1 space-y-6 p-6 text-white bg-inherit">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight gradient-text font-heading">
            Staff Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your team, track attendance, and process payroll
          </p>
        </div>
        <Button
          onClick={() => setShowCreateStaff(true)}
          className="bg-cuephoria-purple hover:bg-cuephoria-lightpurple transition-all duration-300"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Staff Member
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index} className="bg-cuephoria-dark border-cuephoria-purple/20 hover:border-cuephoria-purple/60 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as any)}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-5 bg-cuephoria-dark border border-cuephoria-purple/20">
          <TabsTrigger value="overview" className="data-[state=active]:bg-cuephoria-purple">
            <Shield className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="directory" className="data-[state=active]:bg-cuephoria-purple">
            <Users className="mr-2 h-4 w-4" />
            Directory
          </TabsTrigger>
          <TabsTrigger value="attendance" className="data-[state=active]:bg-cuephoria-purple">
            <Clock className="mr-2 h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="leaves" className="data-[state=active]:bg-cuephoria-purple">
            <CalendarDays className="mr-2 h-4 w-4" />
            Leaves
          </TabsTrigger>
          <TabsTrigger value="payroll" className="data-[state=active]:bg-cuephoria-purple">
            <FileText className="mr-2 h-4 w-4" />
            Payroll
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <StaffOverview
            staffProfiles={staffProfiles}
            activeShifts={activeShifts}
            pendingLeaves={pendingLeaves}
            isLoading={isLoading}
            onRefresh={fetchStaffData}
          />
        </TabsContent>

        <TabsContent value="directory" className="space-y-6 mt-6">
          <StaffDirectory
            staffProfiles={staffProfiles}
            isLoading={isLoading}
            onRefresh={fetchStaffData}
          />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6 mt-6">
          <AttendanceManagement
            staffProfiles={staffProfiles}
            activeShifts={activeShifts}
            isLoading={isLoading}
            onRefresh={fetchStaffData}
          />
        </TabsContent>

        <TabsContent value="leaves" className="space-y-6 mt-6">
          <LeaveManagement
            staffProfiles={staffProfiles}
            pendingLeaves={pendingLeaves}
            isLoading={isLoading}
            onRefresh={fetchStaffData}
          />
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6 mt-6">
          <PayrollManagement
            staffProfiles={staffProfiles}
            isLoading={isLoading}
            onRefresh={fetchStaffData}
          />
        </TabsContent>
      </Tabs>

      {/* Create Staff Dialog */}
      <CreateStaffDialog
        open={showCreateStaff}
        onOpenChange={setShowCreateStaff}
        onSuccess={() => {
          fetchStaffData();
          setShowCreateStaff(false);
        }}
      />
    </div>
  );
};

export default StaffManagement;
