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

interface AttendanceCalendarViewProps {
  staffProfiles: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave' | 'regularized' | 'half_day_lop' | 'absent_lop' | null;

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

  useEffect(() => {
    fetchAttendanceData();
  }, [currentDate, staffProfiles]);

  const fetchAttendanceData = async () => {
    setIsLoadingData(true);
    try {
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);
      
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Fetch attendance
      const { data: attendance, error: attendanceError } = await supabase
        .from('staff_attendance')
        .select('*')
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      if (attendanceError) throw attendanceError;

      // Fetch late logins
      const { data: lateLogins, error: lateError } = await supabase
        .from('staff_late_logins')
        .select('*')
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      if (lateError) throw lateError;

      // Fetch overtime
      const { data: overtime, error: otError } = await supabase
        .from('staff_overtime')
        .select('*')
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
      
      staffProfiles.forEach(staff => {
        organized[staff.user_id] = {};
      });

      (attendance || []).forEach(record => {
        const dateKey = format(new Date(record.date), 'yyyy-MM-dd');
        const status = record.status as AttendanceStatus;
        
        if (!organized[record.staff_id]) {
          organized[record.staff_id] = {};
        }

        const lateInfo = lateMap[record.staff_id]?.[dateKey];
        const otInfo = otMap[record.staff_id]?.[dateKey];
        
        // Only show overtime if status is not absent
        const hasOvertime = !!otInfo && status !== 'absent' && status !== 'absent_lop';

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

        const workingDays = (attendance || []).filter(a => 
          a.status && !a.status.includes('absent') && !a.status.includes('leave') && a.total_working_hours > 0
        ).length;
        
        const absentDays = (attendance || []).filter(a => 
          a.status && (a.status.includes('absent') || a.status === 'absent_lop')
        ).length;

        const totalEarnings = (attendance || []).reduce((sum, a) => sum + (a.daily_earnings || 0), 0);

        return {
          user_id: staffId,
          username: staff.username,
          designation: staff.designation,
          workingDays,
          absentDays,
          totalEarnings,
          totalDays: (attendance || []).length
        };
      });

      const summaries = await Promise.all(summaryPromises);
      setSummaryData(summaries.filter(s => s !== null));
    } catch (error: any) {
      console.error('Error fetching summary:', error);
    }
  };

  const getStatusColor = (status: AttendanceStatus): string => {
    switch (status) {
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

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
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

  const getStatusLabel = (status: AttendanceStatus): string => {
    switch (status) {
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
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Attendance Calendar View</CardTitle>
            <CardDescription>Track all employees' attendance status</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedStaff}
              onValueChange={setSelectedStaff}
            >
              <SelectTrigger className="w-[200px] bg-cuephoria-darker border-cuephoria-purple/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-cuephoria-dark border-cuephoria-purple/20">
                <SelectItem value="all">All Staff</SelectItem>
                {staffProfiles.filter(s => s.is_active).map(staff => (
                  <SelectItem key={staff.user_id} value={staff.user_id}>
                    {staff.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => navigateMonth('prev')}
              variant="outline"
              size="sm"
              className="border-cuephoria-purple/20"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => navigateMonth('next')}
              variant="outline"
              size="sm"
              className="border-cuephoria-purple/20"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              onClick={fetchAttendanceData}
              variant="outline"
              size="sm"
              className="border-cuephoria-purple/20"
            >
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingData ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Month Header */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white">
                {format(currentDate, 'MMMM yyyy')}
              </h3>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Week Days Header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {emptyDays.map((_, index) => (
                    <div key={`empty-${index}`} className="aspect-square" />
                  ))}
                  {daysInMonth.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    return (
                      <div
                        key={dateKey}
                        className={cn(
                          "aspect-square border border-cuephoria-purple/20 rounded-lg p-1",
                          isToday(day) && "ring-2 ring-cuephoria-purple"
                        )}
                      >
                        <div className="text-xs font-semibold text-white mb-1">
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {displayedStaff.map(staff => {
                            const attendance = attendanceData[staff.user_id]?.[dateKey];
                            const status = attendance?.status || null;
                            const isLate = attendance?.isLate;
                            const hasOvertime = attendance?.hasOvertime;
                            
                            let tooltip = `${staff.username}: ${getStatusLabel(status)}`;
                            if (attendance?.clockIn) tooltip += ` (${attendance.clockIn})`;
                            if (isLate) tooltip += ` - Late: ${attendance.lateMinutes} min`;
                            if (hasOvertime) tooltip += ` - OT: ${attendance.overtimeHours?.toFixed(1)} hrs`;
                            
                            return (
                              <div
                                key={staff.user_id}
                                className={cn(
                                  "text-[10px] px-1 py-0.5 rounded border flex items-center gap-1 relative",
                                  getStatusColor(status)
                                )}
                                title={tooltip}
                              >
                                {getStatusIcon(status)}
                                <span className="truncate">{staff.username.split(' ')[0]}</span>
                                {isLate && (
                                  <AlertTriangle className="h-2.5 w-2.5 text-orange-400 ml-0.5" title={`Late: ${attendance.lateMinutes} min`} />
                                )}
                                {hasOvertime && status !== 'absent' && status !== 'absent_lop' && (
                                  <TrendingUp className="h-2.5 w-2.5 text-blue-400 ml-0.5" title={`OT: ${attendance.overtimeHours?.toFixed(1)} hrs`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Staff Summary Table */}
            {summaryData.length > 0 && (
              <div className="pt-4 border-t border-cuephoria-purple/20">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-cuephoria-lightpurple" />
                  Staff Summary - {format(currentDate, 'MMMM yyyy')}
                </h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-cuephoria-darker border-cuephoria-purple/20">
                        <TableHead className="text-white">Staff Name</TableHead>
                        <TableHead className="text-white">Designation</TableHead>
                        <TableHead className="text-white text-center">Working Days</TableHead>
                        <TableHead className="text-white text-center">Absent Days</TableHead>
                        <TableHead className="text-white text-center">Total Days</TableHead>
                        <TableHead className="text-white text-right">Salary Earned</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryData.map((summary) => (
                        <TableRow 
                          key={summary.user_id}
                          className="bg-cuephoria-darker/50 border-cuephoria-purple/10 hover:bg-cuephoria-darker"
                        >
                          <TableCell className="font-medium text-white">
                            {summary.username}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-cuephoria-purple/20">
              <div className="text-sm font-semibold text-white">Legend:</div>
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

