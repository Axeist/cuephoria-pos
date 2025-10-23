// src/components/staff/AttendanceManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Clock, Calendar, Coffee, LogOut, LogIn, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AttendanceManagementProps {
  staffProfiles: any[];
  activeShifts: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

const AttendanceManagement: React.FC<AttendanceManagementProps> = ({
  staffProfiles,
  activeShifts,
  isLoading,
  onRefresh
}) => {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [selectedMonth, selectedYear]);

  const fetchAttendanceRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const { data, error } = await supabase
        .from('staff_attendance')
        .select(`
          *,
          staff_profiles!staff_attendance_staff_id_fkey (
            username,
            full_name,
            designation
          )
        `)
        .gte('date', `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`)
        .lt('date', `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`)
        .order('date', { ascending: false });

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attendance records',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleClockOut = async (shiftId: string, staffId: string) => {
    try {
      const now = new Date().toISOString();
      
      // Get the shift details
      const { data: shift, error: fetchError } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('id', shiftId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate break duration if on break
      let breakDuration = shift.break_duration_minutes || 0;
      if (shift.break_start_time && !shift.break_end_time) {
        const breakStart = new Date(shift.break_start_time);
        const breakEnd = new Date(now);
        breakDuration += Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);
      }

      // Update shift with clock out
      const { error: updateError } = await supabase
        .from('staff_attendance')
        .update({
          clock_out: now,
          break_duration_minutes: breakDuration,
          break_end_time: shift.break_start_time && !shift.break_end_time ? now : shift.break_end_time
        })
        .eq('id', shiftId);

      if (updateError) throw updateError;

      // End any active breaks
      await supabase
        .from('active_breaks')
        .update({ is_active: false, break_end: now })
        .eq('attendance_id', shiftId)
        .eq('is_active', true);

      toast({
        title: 'Clocked Out',
        description: 'Shift ended successfully'
      });

      onRefresh();
      fetchAttendanceRecords();
    } catch (error: any) {
      console.error('Error clocking out:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to clock out',
        variant: 'destructive'
      });
    }
  };

  const handleStartBreak = async (shiftId: string, staffId: string) => {
    try {
      const now = new Date().toISOString();

      // Check for break conflicts
      const { data: conflicts } = await supabase.rpc('check_break_conflict', {
        staff_uuid: staffId,
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

      // Update shift
      await supabase
        .from('staff_attendance')
        .update({ break_start_time: now })
        .eq('id', shiftId);

      // Create active break record
      await supabase
        .from('active_breaks')
        .insert({
          staff_id: staffId,
          attendance_id: shiftId,
          break_start: now,
          is_active: true
        });

      toast({
        title: 'Break Started',
        description: 'Enjoy your break!'
      });

      onRefresh();
    } catch (error: any) {
      console.error('Error starting break:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start break',
        variant: 'destructive'
      });
    }
  };

  const handleEndBreak = async (shiftId: string, staffId: string) => {
    try {
      const now = new Date().toISOString();

      // Get current shift
      const { data: shift } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('id', shiftId)
        .single();

      if (!shift || !shift.break_start_time) return;

      // Calculate break duration
      const breakStart = new Date(shift.break_start_time);
      const breakEnd = new Date(now);
      const breakMinutes = Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000);
      const totalBreak = (shift.break_duration_minutes || 0) + breakMinutes;

      // Update shift
      await supabase
        .from('staff_attendance')
        .update({
          break_end_time: now,
          break_duration_minutes: totalBreak
        })
        .eq('id', shiftId);

      // End active break
      await supabase
        .from('active_breaks')
        .update({ is_active: false, break_end: now })
        .eq('attendance_id', shiftId)
        .eq('is_active', true);

      toast({
        title: 'Break Ended',
        description: `Break duration: ${breakMinutes} minutes`
      });

      onRefresh();
    } catch (error: any) {
      console.error('Error ending break:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to end break',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-cuephoria-dark border border-cuephoria-purple/20">
          <TabsTrigger value="active">Active Shifts</TabsTrigger>
          <TabsTrigger value="history">Attendance History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-6">
          <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Active Shifts</CardTitle>
                  <CardDescription>Currently clocked in staff members</CardDescription>
                </div>
                <Button
                  onClick={onRefresh}
                  variant="outline"
                  size="sm"
                  className="border-cuephoria-purple/20"
                >
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeShifts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active shifts at the moment</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeShifts.map((shift) => {
                    const isOnBreak = shift.break_start_time && !shift.break_end_time;
                    
                    return (
                      <Card
                        key={shift.id}
                        className="bg-cuephoria-darker border-cuephoria-purple/10"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-full bg-cuephoria-purple/20 flex items-center justify-center">
                                <span className="text-xl font-bold text-cuephoria-lightpurple">
                                  {shift.staff_name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold text-white">{shift.staff_name}</p>
                                <p className="text-sm text-muted-foreground">{shift.designation}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm">
                                  <span className="text-muted-foreground">
                                    In: {format(new Date(shift.clock_in), 'hh:mm a')}
                                  </span>
                                  <span className="text-green-500">
                                    {shift.hours_so_far?.toFixed(1)} hrs
                                  </span>
                                  {isOnBreak && (
                                    <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                                      On Break
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {isOnBreak ? (
                                <Button
                                  onClick={() => handleEndBreak(shift.id, shift.staff_id)}
                                  variant="outline"
                                  size="sm"
                                  className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white"
                                >
                                  <Coffee className="h-4 w-4 mr-2" />
                                  End Break
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleStartBreak(shift.id, shift.staff_id)}
                                  variant="outline"
                                  size="sm"
                                  className="border-cuephoria-purple/20"
                                >
                                  <Coffee className="h-4 w-4 mr-2" />
                                  Start Break
                                </Button>
                              )}
                              <Button
                                onClick={() => handleClockOut(shift.id, shift.staff_id)}
                                variant="destructive"
                                size="sm"
                              >
                                <LogOut className="h-4 w-4 mr-2" />
                                Clock Out
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-6">
          <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Attendance History</CardTitle>
                <div className="flex gap-2">
                  <Select
                    value={String(selectedMonth)}
                    onValueChange={(v) => setSelectedMonth(parseInt(v))}
                  >
                    <SelectTrigger className="w-[140px] bg-cuephoria-darker border-cuephoria-purple/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-cuephoria-dark border-cuephoria-purple/20">
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {format(new Date(2025, i, 1), 'MMMM')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(selectedYear)}
                    onValueChange={(v) => setSelectedYear(parseInt(v))}
                  >
                    <SelectTrigger className="w-[100px] bg-cuephoria-darker border-cuephoria-purple/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-cuephoria-dark border-cuephoria-purple/20">
                      {Array.from({ length: 3 }, (_, i) => (
                        <SelectItem key={i} value={String(2025 - i)}>
                          {2025 - i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingRecords ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No attendance records for this period</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attendanceRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-cuephoria-darker border border-cuephoria-purple/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-cuephoria-purple/20 flex items-center justify-center">
                          <span className="text-lg font-bold text-cuephoria-lightpurple">
                            {record.staff_profiles?.username?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white">{record.staff_profiles?.username}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(record.date), 'EEE, MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {format(new Date(record.clock_in), 'hh:mm a')}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-muted-foreground">
                            {record.clock_out ? format(new Date(record.clock_out), 'hh:mm a') : 'In Progress'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          {record.total_working_hours && (
                            <Badge variant="outline" className="text-green-500 border-green-500">
                              {record.total_working_hours.toFixed(1)} hrs
                            </Badge>
                          )}
                          {record.daily_earnings && (
                            <span className="text-cuephoria-blue font-semibold">
                              ₹{record.daily_earnings.toFixed(2)}
                            </span>
                          )}
                        </div>
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

export default AttendanceManagement;
