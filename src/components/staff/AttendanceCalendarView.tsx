// src/components/staff/AttendanceCalendarView.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle, XCircle, Clock, Coffee, AlertCircle, TrendingUp, AlertTriangle, DollarSign, User } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { staffDisplayName, staffOptionLabel, staffSecondaryUsername } from '@/services/staff/staffMappers';

interface AttendanceCalendarViewProps {
  staffProfiles: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave' | 'regularized' | 'half_day_lop' | 'absent_lop' | 'completed' | null;

interface DayAttendance {
  date: Date;
  status: AttendanceStatus;
  clockIn?: string;
  clockOut?: string;
  notes?: string;
  isLate?: boolean;
  hasOvertime?: boolean;
  overtimeHours?: number;
  lateMinutes?: number;
}

interface StaffAttendanceMap {
  [staffId: string]: {
    [dateKey: string]: DayAttendance;
  };
}

const AttendanceCalendarView: React.FC<AttendanceCalendarViewProps> = ({
  staffProfiles,
  isLoading,
  onRefresh
}) => {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<StaffAttendanceMap>({});
  const [lateLoginData, setLateLoginData] = useState<any>({});
  const [overtimeData, setOvertimeData] = useState<any>({});
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  // Refresh when staff profiles change, date changes, or refresh time changes
  useEffect(() => {
    fetchAttendanceData();
  }, [currentDate, staffProfiles, selectedStaff, lastRefreshTime]);

  // Listen for parent refresh and trigger our own refresh
  useEffect(() => {
    // Refresh calendar data when parent refreshes (with a small delay for DB updates)
    const timer = setTimeout(() => {
      setLastRefreshTime(Date.now());
    }, 1000);
    return () => clearTimeout(timer);
  }, [staffProfiles.length]); // Refresh when staff profiles array length changes

  const fetchAttendanceData = async () => {
    setIsLoadingData(true);
    try {
      const profileIds = (staffProfiles ?? []).map((s) => s.user_id).filter(Boolean);
      if (!profileIds.length) {
        setAttendanceData({});
        setLateLoginData({});
        setOvertimeData({});
        setSummaryData([]);
        setIsLoadingData(false);
        return;
      }

      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);
      
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      const { data: attendance, error: attendanceError } = await supabase
        .from('staff_attendance')
        .select('*')
        .in('staff_id', profileIds)
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      if (attendanceError) throw attendanceError;

      // Fetch late logins
      const { data: lateLogins, error: lateError } = await supabase
        .from('staff_late_logins')
        .select('*')
        .in('staff_id', profileIds)
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      if (lateError) throw lateError;

      // Fetch overtime
      const { data: overtime, error: otError } = await supabase
        .from('staff_overtime')
        .select('*')
        .in('staff_id', profileIds)
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      if (otError) throw otError;

      // Organize late login data
      const lateMap: any = {};
      (lateLogins || []).forEach(record => {
        const dateKey = format(new Date(record.date), 'yyyy-MM-dd');
        if (!lateMap[record.staff_id]) {
          lateMap[record.staff_id] = {};
        }
        lateMap[record.staff_id][dateKey] = {
          lateMinutes: record.late_minutes,
          actualClockIn: record.actual_clock_in
        };
      });
      setLateLoginData(lateMap);

      // Organize overtime data
      const otMap: any = {};
      (overtime || []).forEach(record => {
        const dateKey = format(new Date(record.date), 'yyyy-MM-dd');
        if (!otMap[record.staff_id]) {
          otMap[record.staff_id] = {};
        }
        otMap[record.staff_id][dateKey] = {
          overtimeHours: record.overtime_hours,
          status: record.status
        };
      });
      setOvertimeData(otMap);

      // Organize attendance data
      const organized: StaffAttendanceMap = {};
      
      // Initialize all staff
      staffProfiles.forEach(staff => {
        organized[staff.user_id] = {};
      });

      // Fill in actual attendance records
      (attendance || []).forEach(record => {
        const dateKey = format(new Date(record.date), 'yyyy-MM-dd');
        const status = record.status as AttendanceStatus;
        
        if (!organized[record.staff_id]) {
          organized[record.staff_id] = {};
        }

        const lateInfo = lateMap[record.staff_id]?.[dateKey];
        const otInfo = otMap[record.staff_id]?.[dateKey];
        
        // Only show overtime if status is not absent (include 'completed' as present)
        const hasOvertime = !!otInfo && 
          status !== 'absent' && 
          status !== 'absent_lop' && 
          status !== null;

        organized[record.staff_id][dateKey] = {
          date: new Date(record.date),
          status: status,
          clockIn: record.clock_in ? format(new Date(record.clock_in), 'HH:mm') : undefined,
          clockOut: record.clock_out ? format(new Date(record.clock_out), 'HH:mm') : undefined,
          notes: record.notes,
          isLate: !!lateInfo && status !== 'absent' && status !== 'absent_lop',
          lateMinutes: lateInfo?.lateMinutes,
          hasOvertime: hasOvertime,
          overtimeHours: otInfo?.overtimeHours
        };
      });

      setAttendanceData(organized);
      
      // Fetch summary data for the month
      const displayedStaffIds = selectedStaff === 'all' 
        ? staffProfiles.filter(s => s.is_active).map(s => s.user_id)
        : staffProfiles.filter(s => s.user_id === selectedStaff && s.is_active).map(s => s.user_id);
      
      await fetchSummaryData(startDateStr, endDateStr, displayedStaffIds);
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attendance data',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchSummaryData = async (startDate: string, endDate: string, staffIds: string[]) => {
    try {
      // Get attendance summary for each staff
      const summaryPromises = staffIds.map(async (staffId) => {
        const staff = staffProfiles.find(s => s.user_id === staffId);
        if (!staff) return null;

        // Get attendance records for the month
        const { data: attendance, error: attError } = await supabase
          .from('staff_attendance')
          .select('*')
          .eq('staff_id', staffId)
          .gte('date', startDate)
          .lte('date', endDate);

        if (attError) throw attError;

        // Get approved leave requests for the month
        const { data: leaves, error: leavesError } = await supabase
          .from('staff_leave_requests')
          .select('*')
          .eq('staff_id', staffId)
          .eq('status', 'approved')
          .lte('start_date', endDate)
          .gte('end_date', startDate);

        if (leavesError) throw leavesError;

        // Get allowances for the month
        const month = new Date(startDate).getMonth() + 1;
        const year = new Date(startDate).getFullYear();
        const { data: allowances, error: allowancesError } = await supabase
          .from('staff_allowances')
          .select('*')
          .eq('staff_id', staffId)
          .eq('month', month)
          .eq('year', year);

        if (allowancesError) throw allowancesError;

        const workingDays = (attendance || []).filter(a => 
          a.status && 
          (a.status === 'completed' || a.status === 'present' || a.status === 'regularized' || 
           (a.status.includes('half_day') && !a.status.includes('lop'))) &&
          a.total_working_hours > 0
        ).length;
        
        const absentDays = (attendance || []).filter(a => 
          a.status && (a.status.includes('absent') || a.status === 'absent_lop')
        ).length;

        // Calculate leave days from approved leave requests
        let leaveDays = 0;
        if (leaves) {
          leaves.forEach((leave: any) => {
            const leaveStart = new Date(leave.start_date);
            const leaveEnd = new Date(leave.end_date);
            const monthStart = new Date(startDate);
            const monthEnd = new Date(endDate);
            
            // Calculate overlapping days
            const overlapStart = leaveStart > monthStart ? leaveStart : monthStart;
            const overlapEnd = leaveEnd < monthEnd ? leaveEnd : monthEnd;
            
            if (overlapStart <= overlapEnd) {
              const days = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              leaveDays += days;
            }
          });
        }

        // Also count leave days from attendance records
        const leaveDaysFromAttendance = (attendance || []).filter(a => 
          a.status === 'leave'
        ).length;

        // Use the maximum of the two (in case of discrepancies)
        leaveDays = Math.max(leaveDays, leaveDaysFromAttendance);

        const totalEarnings = (attendance || []).reduce((sum, a) => sum + (a.daily_earnings || 0), 0);
        const totalAllowances = (allowances || []).reduce((sum, a) => sum + (a.amount || 0), 0);

        return {
          user_id: staffId,
          displayName: staffDisplayName(staff),
          loginUsername: staffSecondaryUsername(staff),
          designation: staff.designation,
          workingDays,
          absentDays,
          leaveDays,
          totalEarnings,
          totalAllowances,
          totalDays: (attendance || []).length
        };
      });

      const summaries = await Promise.all(summaryPromises);
      setSummaryData(summaries.filter(s => s !== null));
    } catch (error: any) {
      console.error('Error fetching summary:', error);
    }
  };

  const getStatusColor = (status: AttendanceStatus | string): string => {
    // Map 'completed' status from database to 'present' for display
    const normalizedStatus = status === 'completed' ? 'present' : status;
    
    switch (normalizedStatus) {
      case 'present':
      case 'regularized':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'half_day':
      case 'half_day_lop':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'leave':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'absent':
      case 'absent_lop':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusIcon = (status: AttendanceStatus | string) => {
    // Map 'completed' status from database to 'present' for display
    const normalizedStatus = status === 'completed' ? 'present' : status;
    
    switch (normalizedStatus) {
      case 'present':
      case 'regularized':
        return <CheckCircle className="h-3 w-3" />;
      case 'half_day':
      case 'half_day_lop':
        return <Clock className="h-3 w-3" />;
      case 'leave':
        return <CalendarIcon className="h-3 w-3" />;
      case 'absent':
      case 'absent_lop':
        return <XCircle className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getStatusLabel = (status: AttendanceStatus | string): string => {
    // Map 'completed' status from database to 'present' for display
    const normalizedStatus = status === 'completed' ? 'present' : status;
    
    switch (normalizedStatus) {
      case 'present':
        return 'Present';
      case 'regularized':
        return 'Regularized';
      case 'half_day':
        return 'Half Day';
      case 'half_day_lop':
        return 'Half Day LOP';
      case 'leave':
        return 'Leave';
      case 'absent':
        return 'Absent';
      case 'absent_lop':
        return 'Absent LOP';
      default:
        return 'No Record';
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get first day of week for the month
  const firstDayOfWeek = getDay(monthStart);
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const displayedStaff = selectedStaff === 'all' 
    ? staffProfiles.filter(s => s.is_active)
    : staffProfiles.filter(s => s.user_id === selectedStaff && s.is_active);

  const compactCalendar = displayedStaff.length > 4;

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary/40 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base text-foreground">Attendance calendar</CardTitle>
            <CardDescription className="text-sm">Monthly view for all staff</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedStaff}
              onValueChange={setSelectedStaff}
            >
              <SelectTrigger className="w-[200px] glass-card border-border/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card border-border/50">
                <SelectItem value="all">All Staff</SelectItem>
                {staffProfiles.filter(s => s.is_active).map(staff => (
                  <SelectItem key={staff.user_id} value={staff.user_id}>
                    {staffOptionLabel(staff)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => navigateMonth('prev')}
              variant="outline"
              size="sm"
              className="border-border/50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => navigateMonth('next')}
              variant="outline"
              size="sm"
              className="border-border/50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => {
                setLastRefreshTime(Date.now());
                fetchAttendanceData();
              }}
              variant="outline"
              size="sm"
              className="border-border/50"
            >
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingData ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary/40 border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Month Header */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                {format(currentDate, 'MMMM yyyy')}
              </h3>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                {/* Week Days Header */}
                <div className="grid grid-cols-7 gap-px mb-1 bg-border/30 rounded-t-md overflow-hidden">
                  {weekDays.map(day => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1.5 bg-card/40">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days — fixed height cells, not square */}
                <div className="grid grid-cols-7 gap-px bg-border/30 rounded-b-md overflow-hidden">
                  {emptyDays.map((_, index) => (
                    <div key={`empty-${index}`} className="min-h-[72px] bg-card/20" />
                  ))}
                  {daysInMonth.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayRecords = displayedStaff.map(staff => ({
                      staff,
                      attendance: attendanceData[staff.user_id]?.[dateKey],
                    }));
                    const presentCount = dayRecords.filter(
                      ({ attendance }) =>
                        attendance?.status &&
                        !['absent', 'absent_lop'].includes(attendance.status),
                    ).length;

                    return (
                      <div
                        key={dateKey}
                        className={cn(
                          'min-h-[72px] bg-card/20 p-1.5 flex flex-col',
                          isToday(day) && 'ring-1 ring-inset ring-primary/60 bg-primary/5',
                        )}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={cn(
                            'text-xs font-semibold leading-none',
                            isToday(day) ? 'text-primary' : 'text-foreground',
                          )}>
                            {format(day, 'd')}
                          </span>
                          {compactCalendar && displayedStaff.length > 0 && (
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {presentCount}/{displayedStaff.length}
                            </span>
                          )}
                        </div>

                        {compactCalendar ? (
                          <div className="flex flex-wrap gap-0.5 content-start flex-1">
                            {dayRecords.map(({ staff, attendance }) => {
                              const status = attendance?.status || null;
                              const isLate = attendance?.isLate;
                              const hasOvertime = attendance?.hasOvertime;
                              let tooltip = `${staffDisplayName(staff)}: ${getStatusLabel(status)}`;
                              if (attendance?.clockIn) tooltip += ` (${attendance.clockIn})`;
                              if (isLate) tooltip += ` - Late: ${attendance.lateMinutes} min`;
                              if (hasOvertime) tooltip += ` - OT: ${attendance.overtimeHours?.toFixed(1)} hrs`;

                              return (
                                <span
                                  key={staff.user_id}
                                  className={cn(
                                    'inline-block h-2.5 w-2.5 rounded-full border shrink-0',
                                    status === 'present' || status === 'regularized' || status === 'completed'
                                      ? 'bg-green-500/80 border-green-400/60'
                                      : status === 'half_day' || status === 'half_day_lop'
                                        ? 'bg-yellow-500/80 border-yellow-400/60'
                                        : status === 'leave'
                                          ? 'bg-blue-500/80 border-blue-400/60'
                                          : status === 'absent' || status === 'absent_lop'
                                            ? 'bg-red-500/80 border-red-400/60'
                                            : 'bg-muted border-border',
                                    isLate && 'ring-1 ring-orange-400',
                                  )}
                                  title={tooltip}
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-0.5 flex-1 overflow-hidden">
                            {dayRecords.map(({ staff, attendance }) => {
                              const status = attendance?.status || null;
                              const isLate = attendance?.isLate;
                              const hasOvertime = attendance?.hasOvertime;
                              let tooltip = `${staffDisplayName(staff)}: ${getStatusLabel(status)}`;
                              if (attendance?.clockIn) tooltip += ` (${attendance.clockIn})`;
                              if (isLate) tooltip += ` - Late: ${attendance.lateMinutes} min`;
                              if (hasOvertime) tooltip += ` - OT: ${attendance.overtimeHours?.toFixed(1)} hrs`;

                              return (
                                <div
                                  key={staff.user_id}
                                  className={cn(
                                    'text-xs px-1.5 py-0.5 rounded border flex items-center gap-1 min-h-[22px]',
                                    getStatusColor(status),
                                  )}
                                  title={tooltip}
                                >
                                  {getStatusIcon(status)}
                                  <span className="truncate font-medium">{staffDisplayName(staff).split(' ')[0]}</span>
                                  {isLate && (
                                    <AlertTriangle className="h-3 w-3 text-orange-400 shrink-0" />
                                  )}
                                  {hasOvertime && status !== 'absent' && status !== 'absent_lop' && (
                                    <TrendingUp className="h-3 w-3 text-blue-400 shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Staff Summary Table */}
            {summaryData.length > 0 && (
              <div className="pt-3 border-t border-border/50">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Staff summary — {format(currentDate, 'MMMM yyyy')}
                </h4>
                <div className="overflow-x-auto rounded-md border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="text-xs text-muted-foreground h-9">Staff</TableHead>
                        <TableHead className="text-xs text-muted-foreground h-9">Role</TableHead>
                        <TableHead className="text-xs text-muted-foreground h-9 text-center">Working</TableHead>
                        <TableHead className="text-xs text-muted-foreground h-9 text-center">Absent</TableHead>
                        <TableHead className="text-xs text-muted-foreground h-9 text-center">Leave</TableHead>
                        <TableHead className="text-xs text-muted-foreground h-9 text-center">Total</TableHead>
                        <TableHead className="text-xs text-muted-foreground h-9 text-right">Earned</TableHead>
                        <TableHead className="text-xs text-muted-foreground h-9 text-right">Allowances</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryData.map((summary) => (
                        <TableRow
                          key={summary.user_id}
                          className="border-border/40 hover:bg-muted/30"
                        >
                          <TableCell className="text-sm font-medium text-foreground py-2">
                            <div className="min-w-0">
                              <p className="truncate">{summary.displayName}</p>
                              {summary.loginUsername && (
                                <p className="text-xs text-muted-foreground truncate">{summary.loginUsername}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground py-2">
                            {summary.designation}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                              {summary.workingDays}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                              {summary.absentDays}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                              {summary.leaveDays || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {summary.totalDays}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <DollarSign className="h-4 w-4 text-green-400" />
                              <span className="font-semibold text-green-400">
                                ₹{summary.totalEarnings.toFixed(2)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <DollarSign className="h-4 w-4 text-purple-400" />
                              <span className="font-semibold text-purple-400">
                                ₹{(summary.totalAllowances || 0).toFixed(2)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/50">
              <div className="text-xs font-medium text-muted-foreground w-full sm:w-auto">Legend</div>
              <Badge className={getStatusColor('present')}>
                <CheckCircle className="h-3 w-3 mr-1" />
                Present
              </Badge>
              <Badge className={getStatusColor('half_day')}>
                <Clock className="h-3 w-3 mr-1" />
                Half Day
              </Badge>
              <Badge className={getStatusColor('leave')}>
                <CalendarIcon className="h-3 w-3 mr-1" />
                Leave
              </Badge>
              <Badge className={getStatusColor('absent')}>
                <XCircle className="h-3 w-3 mr-1" />
                Absent
              </Badge>
              <Badge className={getStatusColor(null)}>
                <AlertCircle className="h-3 w-3 mr-1" />
                No Record
              </Badge>
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Late Login
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                <TrendingUp className="h-3 w-3 mr-1" />
                Overtime
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceCalendarView;

