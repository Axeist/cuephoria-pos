// src/components/staff/AttendanceManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Clock, Calendar, Trash2, Edit, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [deleteAttendanceId, setDeleteAttendanceId] = useState<string | null>(null);
  const [editAttendance, setEditAttendance] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    clock_in: '',
    clock_out: '',
    break_duration_minutes: 0
  });

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

  const handleDeleteAttendance = async () => {
    if (!deleteAttendanceId) return;

    try {
      const { error } = await supabase
        .from('staff_attendance')
        .delete()
        .eq('id', deleteAttendanceId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Attendance record deleted successfully'
      });

      setDeleteAttendanceId(null);
      fetchAttendanceRecords();
      onRefresh();
    } catch (error: any) {
      console.error('Error deleting attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete attendance',
        variant: 'destructive'
      });
    }
  };

  const handleEditAttendance = (record: any) => {
    setEditAttendance(record);
    setEditForm({
      clock_in: format(new Date(record.clock_in), "yyyy-MM-dd'T'HH:mm"),
      clock_out: record.clock_out ? format(new Date(record.clock_out), "yyyy-MM-dd'T'HH:mm") : '',
      break_duration_minutes: record.break_duration_minutes || 0
    });
  };

  const handleSaveEdit = async () => {
    if (!editAttendance) return;

    try {
      const { error } = await supabase
        .from('staff_attendance')
        .update({
          clock_in: new Date(editForm.clock_in).toISOString(),
          clock_out: editForm.clock_out ? new Date(editForm.clock_out).toISOString() : null,
          break_duration_minutes: editForm.break_duration_minutes
        })
        .eq('id', editAttendance.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Attendance updated successfully'
      });

      setEditAttendance(null);
      fetchAttendanceRecords();
      onRefresh();
    } catch (error: any) {
      console.error('Error updating attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update attendance',
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
    <>
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
                    {activeShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-cuephoria-darker border border-cuephoria-purple/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-cuephoria-purple/20 flex items-center justify-center">
                            <span className="font-bold text-cuephoria-lightpurple">
                              {shift.staff_name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-white">{shift.staff_name}</p>
                            <p className="text-sm text-muted-foreground">{shift.designation}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Clocked in at</p>
                          <p className="text-white font-semibold">
                            {format(new Date(shift.clock_in), 'hh:mm a')}
                          </p>
                          <p className="text-sm text-cuephoria-blue mt-1">
                            {shift.hours_so_far?.toFixed(1)} hours
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-6">
            <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Attendance History</CardTitle>
                    <CardDescription>View and manage attendance records</CardDescription>
                  </div>
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
                    No attendance records for this period
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attendanceRecords.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-cuephoria-darker border border-cuephoria-purple/10"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-semibold text-white">
                              {record.staff_profiles?.username}
                            </p>
                            <Badge variant="outline" className="text-cuephoria-lightpurple border-cuephoria-lightpurple">
                              {format(new Date(record.date), 'MMM dd, yyyy')}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Clock In</p>
                              <p className="text-white">{format(new Date(record.clock_in), 'hh:mm a')}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Clock Out</p>
                              <p className="text-white">
                                {record.clock_out ? format(new Date(record.clock_out), 'hh:mm a') : 'In Progress'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Hours</p>
                              <p className="text-white">{record.total_working_hours?.toFixed(2) || '0.00'} hrs</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Earnings</p>
                              <p className="text-cuephoria-blue font-semibold">
                                ₹{record.daily_earnings?.toFixed(2) || '0.00'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleEditAttendance(record)}
                            variant="outline"
                            size="sm"
                            className="border-cuephoria-purple text-cuephoria-purple hover:bg-cuephoria-purple hover:text-white"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => setDeleteAttendanceId(record.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Edit Dialog */}
      <Dialog open={!!editAttendance} onOpenChange={() => setEditAttendance(null)}>
        <DialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white">
          <DialogHeader>
            <DialogTitle>Edit Attendance</DialogTitle>
            <DialogDescription>
              Modify attendance record for {editAttendance?.staff_profiles?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Clock In</Label>
              <Input
                type="datetime-local"
                value={editForm.clock_in}
                onChange={(e) => setEditForm({...editForm, clock_in: e.target.value})}
                className="bg-cuephoria-darker border-cuephoria-purple/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Clock Out</Label>
              <Input
                type="datetime-local"
                value={editForm.clock_out}
                onChange={(e) => setEditForm({...editForm, clock_out: e.target.value})}
                className="bg-cuephoria-darker border-cuephoria-purple/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Break Duration (minutes)</Label>
              <Input
                type="number"
                value={editForm.break_duration_minutes}
                onChange={(e) => setEditForm({...editForm, break_duration_minutes: parseInt(e.target.value)})}
                className="bg-cuephoria-darker border-cuephoria-purple/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditAttendance(null)}
              className="border-cuephoria-purple/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-cuephoria-purple hover:bg-cuephoria-lightpurple"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAttendanceId} onOpenChange={() => setDeleteAttendanceId(null)}>
        <AlertDialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attendance Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete this attendance record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-cuephoria-purple/20">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAttendance}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AttendanceManagement;
