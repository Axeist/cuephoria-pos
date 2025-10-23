// src/pages/StaffPortal.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Clock, LogIn, LogOut, Coffee, Calendar, FileText, User, DollarSign, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StaffSelectionDialog from '@/components/staff/StaffSelectionDialog';
import jsPDF from 'jspdf';

const StaffPortal = () => {
  const { toast } = useToast();
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [showStaffSelection, setShowStaffSelection] = useState(true);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any>(null);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedStaff) {
      fetchStaffData();
    }
  }, [selectedStaff]);

  const fetchStaffData = async () => {
    if (!selectedStaff) return;
    
    setIsLoading(true);
    try {
      // Fetch current shift
      const today = new Date().toISOString().split('T')[0];
      const { data: shift } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('staff_id', selectedStaff.user_id)
        .eq('date', today)
        .is('clock_out', null)
        .maybeSingle();

      setCurrentShift(shift);

      // Fetch today's attendance
      const { data: attendance } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('staff_id', selectedStaff.user_id)
        .eq('date', today)
        .order('clock_in', { ascending: false });

      setTodayAttendance(attendance || []);

      // Fetch monthly stats
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const { data: stats } = await supabase
        .from('monthly_staff_summary')
        .select('*')
        .eq('user_id', selectedStaff.user_id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();

      setMonthlyStats(stats);

      // Fetch leave requests
      const { data: leaves } = await supabase
        .from('staff_leave_requests')
        .select('*')
        .eq('staff_id', selectedStaff.user_id)
        .order('created_at', { ascending: false })
        .limit(10);

      setLeaveRequests(leaves || []);

      // Fetch payslips
      const { data: payrollData } = await supabase
        .from('staff_payslip_view')
        .select('*')
        .eq('staff_id', selectedStaff.user_id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(6);

      setPayslips(payrollData || []);

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

  const handleClockIn = async () => {
    try {
      const { error } = await supabase
        .from('staff_attendance')
        .insert({
          staff_id: selectedStaff.user_id,
          date: new Date().toISOString().split('T')[0],
          clock_in: new Date().toISOString(),
          status: 'active'
        });

      if (error) throw error;

      toast({
        title: 'Clocked In',
        description: 'Have a great shift!'
      });

      fetchStaffData();
    } catch (error: any) {
      console.error('Error clocking in:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to clock in',
        variant: 'destructive'
      });
    }
  };

  const handleClockOut = async () => {
    if (!currentShift) return;

    try {
      const now = new Date().toISOString();
      let breakDuration = currentShift.break_duration_minutes || 0;

      if (currentShift.break_start_time && !currentShift.break_end_time) {
        const breakStart = new Date(currentShift.break_start_time);
        const breakEnd = new Date(now);
        breakDuration += Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);
      }

      const { error } = await supabase
        .from('staff_attendance')
        .update({
          clock_out: now,
          break_duration_minutes: breakDuration,
          break_end_time: currentShift.break_start_time && !currentShift.break_end_time ? now : currentShift.break_end_time
        })
        .eq('id', currentShift.id);

      if (error) throw error;

      await supabase
        .from('active_breaks')
        .update({ is_active: false, break_end: now })
        .eq('attendance_id', currentShift.id)
        .eq('is_active', true);

      toast({
        title: 'Clocked Out',
        description: 'Shift ended successfully'
      });

      fetchStaffData();
    } catch (error: any) {
      console.error('Error clocking out:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to clock out',
        variant: 'destructive'
      });
    }
  };

  const handleStartBreak = async () => {
    if (!currentShift) return;

    try {
      const now = new Date().toISOString();

      const { data: conflicts } = await supabase.rpc('check_break_conflict', {
        staff_uuid: selectedStaff.user_id,
        break_start_time: now
      });

      if (conflicts) {
        toast({
          title: 'Break Conflict',
          description: 'Another staff member is currently on break',
          variant: 'destructive'
        });
        return;
      }

      await supabase
        .from('staff_attendance')
        .update({ break_start_time: now })
        .eq('id', currentShift.id);

      await supabase
        .from('active_breaks')
        .insert({
          staff_id: selectedStaff.user_id,
          attendance_id: currentShift.id,
          break_start: now,
          is_active: true
        });

      toast({
        title: 'Break Started',
        description: 'Enjoy your break!'
      });

      fetchStaffData();
    } catch (error: any) {
      console.error('Error starting break:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start break',
        variant: 'destructive'
      });
    }
  };

  const handleEndBreak = async () => {
    if (!currentShift) return;

    try {
      const now = new Date().toISOString();
      const breakStart = new Date(currentShift.break_start_time);
      const breakEnd = new Date(now);
      const breakMinutes = Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);
      const totalBreak = (currentShift.break_duration_minutes || 0) + breakMinutes;

      await supabase
        .from('staff_attendance')
        .update({
          break_end_time: now,
          break_duration_minutes: totalBreak
        })
        .eq('id', currentShift.id);

      await supabase
        .from('active_breaks')
        .update({ is_active: false, break_end: now })
        .eq('attendance_id', currentShift.id)
        .eq('is_active', true);

      toast({
        title: 'Break Ended',
        description: `Break duration: ${breakMinutes} minutes`
      });

      fetchStaffData();
    } catch (error: any) {
      console.error('Error ending break:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to end break',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadPayslip = async (payslip: any) => {
    try {
      const doc = new jsPDF();
      
      doc.setFillColor(155, 135, 245);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('Cuephoria', 105, 20, { align: 'center' } as any);
      doc.setFontSize(12);
      doc.text('Payslip', 105, 30, { align: 'center' } as any);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Employee: ${payslip.staff_name}`, 20, 55);
      doc.text(`Designation: ${payslip.designation}`, 20, 62);
      doc.text(`Month: ${format(new Date(payslip.year, payslip.month - 1), 'MMMM yyyy')}`, 20, 69);
      
      let yPos = 90;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Earnings', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      yPos += 10;
      doc.text(`Base Salary (${payslip.total_working_days} days)`, 20, yPos);
      doc.text(`₹${payslip.gross_earnings?.toFixed(2)}`, 180, yPos, { align: 'right' } as any);
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Total Earnings:', 20, yPos);
      doc.text(`₹${(payslip.gross_earnings + payslip.total_allowances)?.toFixed(2)}`, 180, yPos, { align: 'right' } as any);
      
      yPos += 15;
      doc.setFontSize(12);
      doc.text('Deductions', 20, yPos);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Total Deductions:', 20, yPos);
      doc.text(`₹${payslip.total_deductions?.toFixed(2)}`, 180, yPos, { align: 'right' } as any);
      
      yPos += 15;
      doc.setFillColor(155, 135, 245);
      doc.rect(15, yPos - 5, 180, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text('NET SALARY:', 20, yPos + 3);
      doc.text(`₹${payslip.net_salary?.toFixed(2)}`, 185, yPos + 3, { align: 'right' } as any);
      
      doc.save(`Payslip_${format(new Date(payslip.year, payslip.month - 1), 'MMM_yyyy')}.pdf`);
      
      toast({
        title: 'Success',
        description: 'Payslip downloaded successfully'
      });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate payslip',
        variant: 'destructive'
      });
    }
  };

  if (!selectedStaff) {
    return (
      <StaffSelectionDialog
        open={showStaffSelection}
        onSelectStaff={(staff) => {
          setSelectedStaff(staff);
          setShowStaffSelection(false);
        }}
      />
    );
  }

  const isOnBreak = currentShift?.break_start_time && !currentShift?.break_end_time;

  return (
    <div className="flex-1 space-y-6 p-6 text-white bg-inherit">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-cuephoria-purple/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-cuephoria-lightpurple">
              {selectedStaff.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight gradient-text font-heading">
              Welcome, {selectedStaff.username}!
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedStaff.designation}
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setSelectedStaff(null);
            setShowStaffSelection(true);
          }}
          variant="outline"
          className="border-cuephoria-purple/20"
        >
          Switch Staff
        </Button>
      </div>

      {/* Clock In/Out Card */}
      <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Current Shift</h3>
              {currentShift ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Clocked in at {format(new Date(currentShift.clock_in), 'hh:mm a')}
                  </div>
                  {isOnBreak && (
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                      Currently on break
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Not clocked in yet</p>
              )}
            </div>
            <div className="flex gap-3">
              {!currentShift ? (
                <Button
                  onClick={handleClockIn}
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Clock In
                </Button>
              ) : (
                <>
                  {isOnBreak ? (
                    <Button
                      onClick={handleEndBreak}
                      variant="outline"
                      className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white"
                      size="lg"
                    >
                      <Coffee className="mr-2 h-5 w-5" />
                      End Break
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStartBreak}
                      variant="outline"
                      className="border-cuephoria-purple/20"
                      size="lg"
                    >
                      <Coffee className="mr-2 h-5 w-5" />
                      Start Break
                    </Button>
                  )}
                  <Button
                    onClick={handleClockOut}
                    variant="destructive"
                    size="lg"
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    Clock Out
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-cuephoria-lightpurple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {monthlyStats?.days_worked || 0} days
            </div>
            <p className="text-xs text-muted-foreground">
              {monthlyStats?.total_hours?.toFixed(1) || 0} hours worked
            </p>
          </CardContent>
        </Card>

        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ₹{monthlyStats?.total_earnings?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              This month's earnings
            </p>
          </CardContent>
        </Card>

        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Leave Requests</CardTitle>
            <FileText className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {leaveRequests.filter(l => l.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-cuephoria-dark border border-cuephoria-purple/20">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4 mt-6">
          <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
            <CardHeader>
              <CardTitle className="text-white">Today's Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              {todayAttendance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance records for today
                </div>
              ) : (
                <div className="space-y-3">
                  {todayAttendance.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-cuephoria-darker border border-cuephoria-purple/10"
                    >
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Clock In</p>
                        <p className="text-white">{format(new Date(record.clock_in), 'hh:mm a')}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-sm text-muted-foreground">Clock Out</p>
                        <p className="text-white">
                          {record.clock_out ? format(new Date(record.clock_out), 'hh:mm a') : 'In Progress'}
                        </p>
                      </div>
                      {record.total_working_hours && (
                        <div className="space-y-1 text-right">
                          <p className="text-sm text-muted-foreground">Hours</p>
                          <Badge variant="outline" className="text-green-500 border-green-500">
                            {record.total_working_hours.toFixed(1)} hrs
                          </Badge>
                        </div>
                      )}
                      {record.daily_earnings && (
                        <div className="space-y-1 text-right">
                          <p className="text-sm text-muted-foreground">Earnings</p>
                          <p className="text-cuephoria-blue font-semibold">
                            ₹{record.daily_earnings.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4 mt-6">
          <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
            <CardHeader>
              <CardTitle className="text-white">Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {leaveRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No leave requests
                </div>
              ) : (
                <div className="space-y-3">
                  {leaveRequests.map((leave) => (
                    <div
                      key={leave.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-cuephoria-darker border border-cuephoria-purple/10"
                    >
                      <div>
                        <Badge
                          variant="outline"
                          className={
                            leave.status === 'approved'
                              ? 'text-green-500 border-green-500'
                              : leave.status === 'rejected'
                              ? 'text-red-500 border-red-500'
                              : 'text-yellow-500 border-yellow-500'
                          }
                        >
                          {leave.status?.toUpperCase()}
                        </Badge>
                        <p className="text-white mt-2">
                          {format(new Date(leave.start_date), 'MMM dd')} - {format(new Date(leave.end_date), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {leave.total_days} day{leave.total_days > 1 ? 's' : ''} • {leave.leave_type?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payslips" className="space-y-4 mt-6">
          <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
            <CardHeader>
              <CardTitle className="text-white">Payslips</CardTitle>
            </CardHeader>
            <CardContent>
              {payslips.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payslips available
                </div>
              ) : (
                <div className="space-y-3">
                  {payslips.map((payslip) => (
                    <div
                      key={payslip.payroll_id}
                      className="flex items-center justify-between p-4 rounded-lg bg-cuephoria-darker border border-cuephoria-purple/10"
                    >
                      <div>
                        <p className="text-white font-semibold">
                          {format(new Date(payslip.year, payslip.month - 1), 'MMMM yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payslip.total_working_days} days • {payslip.total_working_hours?.toFixed(1)} hours
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold text-white">
                            ₹{payslip.net_salary?.toFixed(2)}
                          </p>
                          <Badge
                            variant={payslip.payment_status === 'paid' ? 'default' : 'secondary'}
                            className={payslip.payment_status === 'paid' ? 'bg-green-500' : ''}
                          >
                            {payslip.payment_status?.toUpperCase()}
                          </Badge>
                        </div>
                        <Button
                          onClick={() => handleDownloadPayslip(payslip)}
                          variant="outline"
                          size="sm"
                          className="border-cuephoria-purple/20"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffPortal;
