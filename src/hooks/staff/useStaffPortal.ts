import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
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
import { staffPortalCall } from '@/services/staff/staffPortalTransport';
import { adminFetch } from '@/services/adminFetch';
import type { FloorClockIn } from '@/components/staff/portal/FloorOnDutyPanel';
import { useLocation } from '@/context/LocationContext';

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
  const { activeLocationId } = useLocation();
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [portalGate, setPortalGate] = useState<'loading' | 'no_profile' | 'pin' | 'ready'>('loading');
  const [portalDisplayName, setPortalDisplayName] = useState<string | null>(null);
  const [floorClockIns, setFloorClockIns] = useState<FloorClockIn[]>([]);
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

  const refreshFloorClockIns = async () => {
    try {
      const qs = activeLocationId ? `?locationId=${encodeURIComponent(activeLocationId)}` : '';
      const res = await adminFetch(`/api/admin/staff-portal${qs}`, { method: 'GET', credentials: 'same-origin' });
      const json = await res.json();
      if (json?.ok) {
        setFloorClockIns(json.floorClockIns ?? []);
      }
    } catch {
      /* non-blocking */
    }
  };

  useEffect(() => {
    let cancelled = false;

    const bootPortal = async () => {
      if (!user?.id) {
        setPortalGate('pin');
        return;
      }

      const unlock = getStaffPortalUnlock(user.id);
      if (unlock?.profile) {
        setSelectedStaff(mapPortalProfileToStaff(unlock.profile));
        setPortalGate('ready');
        void refreshFloorClockIns();
        return;
      }

      try {
        const qs = activeLocationId ? `?locationId=${encodeURIComponent(activeLocationId)}` : '';
        const res = await adminFetch(`/api/admin/staff-portal${qs}`, { method: 'GET', credentials: 'same-origin' });
        const json = await res.json();
        if (cancelled) return;

        if (!json?.ok) {
          setPortalGate('no_profile');
          return;
        }

        setFloorClockIns(json.floorClockIns ?? []);

        if (json.hasProfile && json.profile) {
          setPortalDisplayName(json.profile?.fullName ?? user.displayName ?? user.username);
        } else {
          setPortalDisplayName(null);
        }
        setPortalGate('pin');
      } catch {
        if (!cancelled) setPortalGate('pin');
      }
    };

    bootPortal();
    return () => { cancelled = true; };
  }, [user?.id, user?.displayName, user?.username, activeLocationId]);

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
        const res = await adminFetch('/api/admin/staff-portal', { method: 'GET', credentials: 'same-origin' });
        const json = await res.json();
        if (json?.ok && json.hasProfile && json.profile) {
          staffSnapshot = mapPortalProfileToStaff(json.profile);
          setSelectedStaff(staffSnapshot);
        }
      } catch {
        /* keep cached profile */
      }

      const dashboard = await staffPortalCall<{
        currentShift: any;
        allAttendance: any[];
        regularizationRequests: any[];
        otRequests: any[];
        doubleShiftRequests: any[];
        allStaffProfiles: any[];
        breakViolations: any[];
        monthlyStats: any;
        leaveRequests: any[];
        leaveBalance: { paid: number; unpaid: number };
        payslips: any[];
      }>('fetchDashboard', {}, { adminUserId: user?.id ?? null });

      setCurrentShift(dashboard.currentShift);
      setAllAttendance(dashboard.allAttendance);
      setRegularizationRequests(dashboard.regularizationRequests);
      setOtRequests(dashboard.otRequests);
      setDoubleShiftRequests(dashboard.doubleShiftRequests);
      setAllStaffProfiles(dashboard.allStaffProfiles);
      setBreakViolations(dashboard.breakViolations);
      setMonthlyStats(dashboard.monthlyStats);
      setLeaveRequests(dashboard.leaveRequests);
      setLeaveBalance(dashboard.leaveBalance);
      setPayslips(dashboard.payslips);
      await refreshFloorClockIns();
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
      const result = await staffPortalCall<{ ok: boolean; error?: string; currentShift?: any }>(
        'clockIn',
        {},
        { adminUserId: user?.id ?? null },
      );
      if (!result.ok) {
        if (result.currentShift) setCurrentShift(result.currentShift);
        toast({
          title: result.error?.includes('already') || result.error?.includes('Already') ? 'Already clocked in' : 'Error',
          description: result.error || 'Failed to clock in',
          variant: 'destructive',
        });
        return;
      }

      if (result.currentShift) setCurrentShift(result.currentShift);
      toast({ title: 'Clocked In', description: 'Have a great shift!' });
      await fetchStaffData();
    } catch (error: any) {
      console.error('Error clocking in:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to clock in',
        variant: 'destructive',
      });
    }
  };

  const handleClockOut = async () => {
    if (!currentShift) return;

    try {
      await staffPortalCall('clockOut', { attendanceId: currentShift.id }, { adminUserId: user?.id ?? null });
      setCurrentShift(null);
      toast({ title: 'Clocked Out', description: 'Shift ended successfully' });
      await fetchStaffData();
    } catch (error: any) {
      console.error('Error clocking out:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to clock out',
        variant: 'destructive',
      });
    }
  };

  const handleStartBreak = async () => {
    if (!currentShift) return;

    try {
      const result = await staffPortalCall<{ ok: boolean; error?: string }>(
        'startBreak',
        { attendanceId: currentShift.id },
        { adminUserId: user?.id ?? null },
      );
      if (!result.ok) {
        toast({
          title: 'Break Conflict',
          description: result.error || 'Could not start break',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Break Started',
        description: 'Enjoy your break! Remember: max 1 hour per day',
      });
      fetchStaffData();
    } catch (error: any) {
      console.error('Error starting break:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start break',
        variant: 'destructive',
      });
    }
  };

  const handleEndBreak = async () => {
    if (!currentShift) return;

    try {
      const result = await staffPortalCall<{ breakMinutes: number; totalBreak: number; exceeded: boolean }>(
        'endBreak',
        { attendanceId: currentShift.id },
        { adminUserId: user?.id ?? null },
      );

      if (result.exceeded) {
        toast({
          title: '⚠️ Break Time Exceeded',
          description: `Total break: ${result.totalBreak} minutes. Maximum allowed is 60 minutes. Penalty may be applied.`,
          variant: 'destructive',
          duration: 10000,
        });
      } else {
        toast({
          title: 'Break Ended',
          description: `Break duration: ${result.breakMinutes} minutes`,
        });
      }

      fetchStaffData();
    } catch (error: any) {
      console.error('Error ending break:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to end break',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLeave = async () => {
    if (!deleteLeaveId) return;

    try {
      await staffPortalCall('deleteLeave', { leaveId: deleteLeaveId }, { adminUserId: user?.id ?? null });
      toast({ title: 'Success', description: 'Leave request deleted successfully' });
      setDeleteLeaveId(null);
      fetchStaffData();
    } catch (error: any) {
      console.error('Error deleting leave:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete leave request',
        variant: 'destructive',
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

  const handlePinVerified = (
    profile: Record<string, unknown>,
    portalSessionToken?: string,
  ) => {
    if (user?.id && profile.userId) {
      setStaffPortalUnlocked(
        user.id,
        String(profile.userId),
        portalSessionToken,
        profile,
      );
    }
    setSelectedStaff(mapPortalProfileToStaff(profile));
    setPortalGate('ready');
    void refreshFloorClockIns();
  };

  return {
    toast, navigate, user,
    selectedStaff, setSelectedStaff,
    portalGate, setPortalGate,
    portalDisplayName, setPortalDisplayName,
    floorClockIns, refreshFloorClockIns,
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
