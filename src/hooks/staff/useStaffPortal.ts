import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  clearStaffPortalUnlock,
  getStaffPortalUnlock,
  setStaffPortalUnlocked,
} from '@/utils/staffPortalSession';
import { resolveStaffHourlyRate, resolveStaffShiftHours } from '@/utils/staffEarnings';

function mapPortalProfileToStaff(profile: Record<string, unknown>) {
  const shift_start_time = profile.shiftStartTime as string | null | undefined;
  const shift_end_time = profile.shiftEndTime as string | null | undefined;
  const default_shift_hours =
    (profile.defaultShiftHours as number | null | undefined) ??
    resolveStaffShiftHours({ shift_start_time, shift_end_time });

  const base = {
    user_id: profile.userId,
    username: profile.username,
    full_name: profile.fullName,
    designation: profile.designation,
    email: profile.email,
    location_id: profile.locationId,
    monthly_salary: profile.monthlySalary,
    shift_start_time,
    shift_end_time,
    default_shift_hours,
    is_active: profile.isActive,
  };

  return {
    ...base,
    hourly_rate: resolveStaffHourlyRate({
      hourly_rate: profile.hourlyRate as number | null | undefined,
      monthly_salary: base.monthly_salary as number | null | undefined,
      shift_start_time,
      shift_end_time,
      default_shift_hours,
    }),
  };
}

export function useStaffPortal() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [portalGate, setPortalGate] = useState<'loading' | 'no_profile' | 'pin' | 'ready'>('loading');
  const [portalDisplayName, setPortalDisplayName] = useState<string | null>(null);
  const [showLeaveRequest, setShowLeaveRequest] = useState(false);
  const [showRegularizationRequest, setShowRegularizationRequest] = useState(false);
  const [showOTRequest, setShowOTRequest] = useState(false);
  const [showDoubleShiftRequest, setShowDoubleShiftRequest] = useState(false);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [activePortalTab, setActivePortalTab] = useState<'attendance'|'requests'|'payslips'>('attendance');
  const [filteredAttendance, setFilteredAttendance] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any>(null);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [regularizationRequests, setRegularizationRequests] = useState<any[]>([]);
  const [otRequests, setOtRequests] = useState<any[]>([]);
  const [doubleShiftRequests, setDoubleShiftRequests] = useState<any[]>([]);
  const [allStaffProfiles, setAllStaffProfiles] = useState<any[]>([]);
  const [leaveBalance, setLeaveBalance] = useState({ paid: 1, unpaid: 2 });
  const [payslips, setPayslips] = useState<any[]>([]);
  const [breakViolations, setBreakViolations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteLeaveId, setDeleteLeaveId] = useState<string | null>(null);
  const [attendanceFilters, setAttendanceFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    let cancelled = false;

    const bootPortal = async () => {
      if (!user?.id) {
        setPortalGate('pin');
        return;
      }

      const unlockedStaffId = getStaffPortalUnlock(user.id);
      if (unlockedStaffId) {
        try {
          const res = await fetch('/api/admin/staff-portal', { method: 'GET', credentials: 'same-origin' });
          const json = await res.json();
          if (!cancelled && json?.ok && json.hasProfile && json.profile?.userId === unlockedStaffId) {
            setSelectedStaff(mapPortalProfileToStaff(json.profile));
            setPortalGate('ready');
            return;
          }
        } catch {
          /* fall through to PIN */
        }
        clearStaffPortalUnlock();
      }

      try {
        const res = await fetch('/api/admin/staff-portal', { method: 'GET', credentials: 'same-origin' });
        const json = await res.json();
        if (cancelled) return;

        if (!json?.ok) {
          setPortalGate('no_profile');
          return;
        }
        if (!json.hasProfile) {
          setPortalGate('no_profile');
          return;
        }

        setPortalDisplayName(json.profile?.fullName ?? user.displayName ?? user.username);
        setPortalGate('pin');
      } catch {
        if (!cancelled) setPortalGate('no_profile');
      }
    };

    bootPortal();
    return () => { cancelled = true; };
  }, [user?.id, user?.displayName, user?.username]);

  useEffect(() => {
    if (selectedStaff) {
      fetchStaffData();
    }
  }, [selectedStaff]);

  // Apply attendance filters
  useEffect(() => {
    let filtered = [...allAttendance];

    // Filter by status
    if (attendanceFilters.status !== 'all') {
      if (attendanceFilters.status === 'regularized') {
        filtered = filtered.filter(a => a.status === 'regularized' && a.notes?.includes('Admin regularization'));
      } else if (attendanceFilters.status === 'absent') {
        filtered = filtered.filter(a => a.status === 'absent' || a.status === 'absent_lop');
      } else {
        filtered = filtered.filter(a => a.status === attendanceFilters.status);
      }
    }

    // Filter by date range
    if (attendanceFilters.dateFrom) {
      filtered = filtered.filter(a => new Date(a.date) >= new Date(attendanceFilters.dateFrom));
    }
    if (attendanceFilters.dateTo) {
      filtered = filtered.filter(a => new Date(a.date) <= new Date(attendanceFilters.dateTo));
    }

    // Limit to 30 for display
    setFilteredAttendance(filtered.slice(0, 30));
  }, [allAttendance, attendanceFilters]);

  const fetchStaffData = async () => {
    if (!selectedStaff) return;
    
    setIsLoading(true);
    try {
      // Refresh pay fields from server so live earnings reflect latest salary
      let staffSnapshot = selectedStaff;
      try {
        const res = await fetch('/api/admin/staff-portal', { method: 'GET', credentials: 'same-origin' });
        const json = await res.json();
        if (json?.ok && json.hasProfile && json.profile) {
          staffSnapshot = mapPortalProfileToStaff(json.profile);
          setSelectedStaff(staffSnapshot);
        }
      } catch {
        /* keep cached profile */
      }

      const hourlyRate = resolveStaffHourlyRate(staffSnapshot);
      if (hourlyRate > 0) {
        const { data: zeroEarnings } = await supabase
          .from('staff_attendance')
          .select('id, clock_out')
          .eq('staff_id', staffSnapshot.user_id)
          .not('clock_out', 'is', null)
          .or('daily_earnings.is.null,daily_earnings.eq.0')
          .limit(20);

        for (const row of zeroEarnings ?? []) {
          if (!row.clock_out) continue;
          await supabase
            .from('staff_attendance')
            .update({ clock_out: row.clock_out })
            .eq('id', row.id);
        }
      }

      // Any open shift (including stale shifts from prior days)
      const { data: shift } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('staff_id', selectedStaff.user_id)
        .is('clock_out', null)
        .not('clock_in', 'is', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      setCurrentShift(shift);

      // Fetch ALL attendance (last 100 records for filtering)
      const { data: attendance } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('staff_id', selectedStaff.user_id)
        .order('date', { ascending: false })
        .order('clock_in', { ascending: false })
        .limit(100);

      setAllAttendance(attendance || []);

      // Fetch regularization requests
      const { data: regRequests } = await supabase
        .from('staff_attendance_regularization')
        .select('*')
        .eq('staff_id', selectedStaff.user_id)
        .order('created_at', { ascending: false });

      setRegularizationRequests(regRequests || []);

      // Fetch OT requests
      const { data: otReqs } = await supabase
        .from('staff_overtime_requests')
        .select('*')
        .eq('staff_id', selectedStaff.user_id)
        .order('created_at', { ascending: false });

      setOtRequests(otReqs || []);

      // Fetch double shift requests
      const { data: dsReqs } = await supabase
        .from('staff_double_shift_requests')
        .select('*')
        .eq('staff_id', selectedStaff.user_id)
        .order('requested_at', { ascending: false });

      setDoubleShiftRequests(dsReqs || []);

      // Fetch colleagues at same branch for double-shift requests
      const { data: allStaff } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('is_active', true)
        .eq('location_id', selectedStaff.location_id);

      setAllStaffProfiles(allStaff || []);

      // Fetch break violations
      const { data: violations } = await supabase
        .from('staff_break_violations')
        .select('*')
        .eq('staff_id', selectedStaff.user_id)
        .order('created_at', { ascending: false })
        .limit(10);

      setBreakViolations(violations || []);

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      // Calculate monthly stats including regularized attendance
      const startOfMonth = format(new Date(currentYear, currentMonth - 1, 1), 'yyyy-MM-dd');
      const endOfMonth = format(new Date(currentYear, currentMonth, 0), 'yyyy-MM-dd');
      
      const { data: attendanceStats } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('staff_id', selectedStaff.user_id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .in('status', ['completed', 'regularized', 'present', 'half_day', 'half_day_lop']);

      // Calculate stats manually to include regularized attendance
      const workingDays = (attendanceStats || []).filter(a => a.total_working_hours > 0).length;
      const totalHours = (attendanceStats || []).reduce((sum, a) => sum + (a.total_working_hours || 0), 0);
      const totalEarnings = (attendanceStats || []).reduce((sum, a) => sum + (a.daily_earnings || 0), 0);

      setMonthlyStats({
        days_worked: workingDays,
        total_hours: totalHours,
        total_earnings: totalEarnings
      });

      const { data: leaves } = await supabase
        .from('staff_leave_requests')
        .select('*')
        .eq('staff_id', selectedStaff.user_id)
        .order('created_at', { ascending: false })
        .limit(10);

      setLeaveRequests(leaves || []);

      const { data: balanceRows } = await supabase
        .from('staff_leave_balances')
        .select('leave_type, remaining')
        .eq('staff_id', selectedStaff.user_id)
        .eq('year', currentYear);

      if (balanceRows && balanceRows.length > 0) {
        const paidRemaining = balanceRows
          .filter((b) => b.leave_type !== 'unpaid_leave')
          .reduce((sum, b) => sum + (Number(b.remaining) || 0), 0);
        const unpaidRemaining = balanceRows
          .filter((b) => b.leave_type === 'unpaid_leave')
          .reduce((sum, b) => sum + (Number(b.remaining) || 0), 0);
        setLeaveBalance({ paid: paidRemaining, unpaid: unpaidRemaining });
      } else {
        const approvedPaidLeaves = (leaves || []).filter(
          l => l.status === 'approved' &&
          l.leave_type !== 'unpaid_leave' &&
          new Date(l.start_date).getFullYear() === currentYear
        ).reduce((sum, l) => sum + (l.total_days || 0), 0);

        const approvedUnpaidLeaves = (leaves || []).filter(
          l => l.status === 'approved' &&
          l.leave_type === 'unpaid_leave' &&
          new Date(l.start_date).getFullYear() === currentYear
        ).reduce((sum, l) => sum + (l.total_days || 0), 0);

        setLeaveBalance({
          paid: Math.max(0, 12 - approvedPaidLeaves),
          unpaid: Math.max(0, 6 - approvedUnpaidLeaves),
        });
      }

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
    if (!selectedStaff?.user_id) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data: openShift } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('staff_id', selectedStaff.user_id)
        .is('clock_out', null)
        .not('clock_in', 'is', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openShift) {
        setCurrentShift(openShift);
        toast({
          title: 'Already clocked in',
          description:
            openShift.date === today
              ? 'You are already on an active shift.'
              : `You have an open shift from ${format(new Date(openShift.date), 'MMM dd')}. Clock out first.`,
        });
        return;
      }

      const { data: todayRecord } = await supabase
        .from('staff_attendance')
        .select('id, clock_out')
        .eq('staff_id', selectedStaff.user_id)
        .eq('date', today)
        .maybeSingle();

      if (todayRecord?.clock_out) {
        toast({
          title: 'Shift already completed',
          description: 'You have already clocked out for today.',
          variant: 'destructive',
        });
        return;
      }

      const now = new Date().toISOString();
      const { data: inserted, error } = await supabase
        .from('staff_attendance')
        .insert({
          staff_id: selectedStaff.user_id,
          date: today,
          clock_in: now,
          status: 'active',
          location_id: selectedStaff.location_id,
        })
        .select('*')
        .single();

      if (error) throw error;

      setCurrentShift(inserted);

      toast({
        title: 'Clocked In',
        description: 'Have a great shift!',
      });

      await fetchStaffData();
    } catch (error: any) {
      console.error('Error clocking in:', error);
      const message =
        error?.code === '23505'
          ? 'You already have an attendance record for today.'
          : error.message || 'Failed to clock in';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
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

      setCurrentShift(null);

      toast({
        title: 'Clocked Out',
        description: 'Shift ended successfully',
      });

      await fetchStaffData();
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
        description: 'Enjoy your break! Remember: max 1 hour per day'
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

      if (totalBreak > 60) {
        toast({
          title: '⚠️ Break Time Exceeded',
          description: `Total break: ${totalBreak} minutes. Maximum allowed is 60 minutes. Penalty may be applied.`,
          variant: 'destructive',
          duration: 10000
        });
      } else {
        toast({
          title: 'Break Ended',
          description: `Break duration: ${breakMinutes} minutes`
        });
      }

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

  const handleDeleteLeave = async () => {
    if (!deleteLeaveId) return;

    try {
      const { error } = await supabase
        .from('staff_leave_requests')
        .delete()
        .eq('id', deleteLeaveId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Leave request deleted successfully'
      });

      setDeleteLeaveId(null);
      fetchStaffData();
    } catch (error: any) {
      console.error('Error deleting leave:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete leave request',
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

  const handleCloseDialog = () => {
    navigate('/dashboard');
  };

  const handlePinVerified = (profile: Record<string, unknown>) => {
    if (user?.id && profile.userId) {
      setStaffPortalUnlocked(user.id, String(profile.userId));
    }
    setSelectedStaff(mapPortalProfileToStaff(profile));
    setPortalGate('ready');
  };

  return {
    toast, navigate, user,
    selectedStaff, setSelectedStaff,
    portalGate, setPortalGate,
    portalDisplayName, setPortalDisplayName,
    showLeaveRequest, setShowLeaveRequest,
    showRegularizationRequest, setShowRegularizationRequest,
    showOTRequest, setShowOTRequest,
    showDoubleShiftRequest, setShowDoubleShiftRequest,
    currentShift, allAttendance, activePortalTab, setActivePortalTab,
    filteredAttendance, monthlyStats, leaveRequests, regularizationRequests,
    otRequests, doubleShiftRequests, allStaffProfiles, leaveBalance, payslips,
    breakViolations, isLoading, deleteLeaveId, setDeleteLeaveId,
    attendanceFilters, setAttendanceFilters,
    fetchStaffData, handleClockIn, handleClockOut, handleStartBreak, handleEndBreak,
    handleDeleteLeave, handleDownloadPayslip, handleCloseDialog, handlePinVerified,
    isOnBreak: currentShift?.break_start_time && !currentShift?.break_end_time,
  };
}
