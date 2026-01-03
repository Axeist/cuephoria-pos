// src/components/staff/AdminRegularizationDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Calendar as CalendarIcon, Clock, User, AlertCircle } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface AdminRegularizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  staffProfiles: any[];
}

const AdminRegularizationDialog: React.FC<AdminRegularizationDialogProps> = ({
  open,
  onOpenChange,
  staffProfiles,
  onSuccess
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [regularizationType, setRegularizationType] = useState<'full_day' | 'half_day' | 'absent'>('full_day');
  const [selectedStaffData, setSelectedStaffData] = useState<any>(null);
  const [calculatedHours, setCalculatedHours] = useState<number>(0);
  const [calculatedEarnings, setCalculatedEarnings] = useState<number>(0);

  useEffect(() => {
    if (selectedStaff && selectedDate) {
      const staff = staffProfiles.find(s => s.user_id === selectedStaff);
      setSelectedStaffData(staff);
      calculateHoursAndEarnings(staff, regularizationType);
    }
  }, [selectedStaff, selectedDate, regularizationType, staffProfiles]);

  const calculateHoursAndEarnings = (staff: any, type: 'full_day' | 'half_day' | 'absent') => {
    if (!staff || !staff.shift_start_time || !staff.shift_end_time) {
      setCalculatedHours(0);
      setCalculatedEarnings(0);
      return;
    }

    // Parse shift times
    const startTime = staff.shift_start_time.split(':');
    const endTime = staff.shift_end_time.split(':');
    const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
    const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);
    
    // Handle overnight shifts
    let totalMinutes = endMinutes - startMinutes;
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60; // Add 24 hours for overnight shift
    }
    
    const fullDayHours = totalMinutes / 60;
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const dailyRate = staff.monthly_salary / daysInMonth;
    const hourlyRate = dailyRate / fullDayHours;

    if (type === 'absent') {
      setCalculatedHours(0);
      setCalculatedEarnings(0);
    } else if (type === 'half_day') {
      const halfHours = fullDayHours / 2;
      setCalculatedHours(halfHours);
      setCalculatedEarnings(halfHours * hourlyRate);
    } else {
      setCalculatedHours(fullDayHours);
      setCalculatedEarnings(fullDayHours * hourlyRate);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStaff || !selectedDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select staff and date',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedStaffData) {
      toast({
        title: 'Validation Error',
        description: 'Staff data not found',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const staff = selectedStaffData;
      
      // Calculate clock in and clock out times based on shift
      const startTime = staff.shift_start_time.split(':');
      const endTime = staff.shift_end_time.split(':');
      
      let clockInTime: string;
      let clockOutTime: string | null = null;
      
      if (regularizationType === 'absent') {
        // For absent, use shift start time as clock_in (required by DB) but mark as absent
        // This represents when they were supposed to clock in
        clockInTime = new Date(`${dateStr}T${staff.shift_start_time}`).toISOString();
        clockOutTime = clockInTime; // Set same as clock_in to indicate no work done
      } else if (regularizationType === 'half_day') {
        // Half day: clock in at shift start, clock out at midpoint
        clockInTime = new Date(`${dateStr}T${staff.shift_start_time}`).toISOString();
        const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
        const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);
        let totalMinutes = endMinutes - startMinutes;
        if (totalMinutes < 0) totalMinutes += 24 * 60;
        const halfMinutes = startMinutes + (totalMinutes / 2);
        let halfHours = Math.floor(halfMinutes / 60) % 24;
        const halfMins = Math.floor(halfMinutes % 60);
        // Handle date rollover for overnight shifts
        let halfDayDate = dateStr;
        if (halfHours < parseInt(startTime[0]) || (halfHours === parseInt(startTime[0]) && halfMins < parseInt(startTime[1]))) {
          // If half point is before start, it's next day
          const nextDay = new Date(selectedDate);
          nextDay.setDate(nextDay.getDate() + 1);
          halfDayDate = format(nextDay, 'yyyy-MM-dd');
        }
        clockOutTime = new Date(`${halfDayDate}T${String(halfHours).padStart(2, '0')}:${String(halfMins).padStart(2, '0')}`).toISOString();
      } else {
        // Full day: use full shift times
        clockInTime = new Date(`${dateStr}T${staff.shift_start_time}`).toISOString();
        clockOutTime = new Date(`${dateStr}T${staff.shift_end_time}`).toISOString();
      }

      // Create or update attendance record
      const attendanceData: any = {
        staff_id: selectedStaff,
        date: dateStr,
        clock_in: clockInTime, // Always set clock_in (required by DB), even for absent
        clock_out: clockOutTime,
        total_working_hours: regularizationType === 'absent' ? 0 : calculatedHours,
        daily_earnings: regularizationType === 'absent' ? 0 : calculatedEarnings,
        status: regularizationType === 'absent' ? 'absent_lop' : 'regularized',
        notes: `Admin regularization - ${regularizationType === 'full_day' ? 'Full Day Present' : regularizationType === 'half_day' ? 'Half Day Present' : 'Absent'} by ${user?.username || 'admin'}`
      };

      // Check if attendance record exists
      const { data: existing } = await supabase
        .from('staff_attendance')
        .select('id')
        .eq('staff_id', selectedStaff)
        .eq('date', dateStr)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('staff_attendance')
          .update(attendanceData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('staff_attendance')
          .insert(attendanceData);

        if (error) throw error;
      }

      // Remove any LOP deductions for this date if marking present
      if (regularizationType !== 'absent') {
        await supabase
          .from('staff_deductions')
          .delete()
          .eq('staff_id', selectedStaff)
          .eq('deduction_date', dateStr)
          .eq('deduction_type', 'lop')
          .eq('marked_by', 'system');
      } else {
        // Add LOP deduction for absent
        const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
        const dailyRate = staff.monthly_salary / daysInMonth;
        
        await supabase
          .from('staff_deductions')
          .insert({
            staff_id: selectedStaff,
            deduction_type: 'lop',
            amount: dailyRate,
            reason: `Full-day LOP - Marked absent on ${dateStr}`,
            deduction_date: dateStr,
            marked_by: user?.username || 'admin',
            month: selectedDate.getMonth() + 1,
            year: selectedDate.getFullYear()
          });
      }

      toast({
        title: 'Success',
        description: `Attendance ${regularizationType === 'full_day' ? 'marked as full day present' : regularizationType === 'half_day' ? 'marked as half day present' : 'marked as absent'} successfully`
      });

      // Reset form
      setSelectedStaff('');
      setSelectedDate(new Date());
      setRegularizationType('full_day');
      setSelectedStaffData(null);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error regularizing attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to regularize attendance',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl gradient-text">Admin Attendance Regularization</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Regularize attendance for any staff member. Select staff, date, and attendance type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Staff *</Label>
            <Select
              value={selectedStaff}
              onValueChange={setSelectedStaff}
            >
              <SelectTrigger className="bg-cuephoria-darker border-cuephoria-purple/20">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent className="bg-cuephoria-dark border-cuephoria-purple/20">
                {staffProfiles.filter(s => s.is_active).map(staff => (
                  <SelectItem key={staff.user_id} value={staff.user_id}>
                    {staff.username} - {staff.designation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-cuephoria-darker border-cuephoria-purple/20",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-cuephoria-dark border-cuephoria-purple/20">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="bg-cuephoria-dark text-white"
                />
              </PopoverContent>
            </Popover>
          </div>

          {selectedStaffData && (
            <div className="p-3 bg-cuephoria-darker rounded-lg border border-cuephoria-purple/20">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-cuephoria-lightpurple" />
                <span className="font-semibold text-white">{selectedStaffData.username}</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Shift: {selectedStaffData.shift_start_time?.substring(0, 5)} - {selectedStaffData.shift_end_time?.substring(0, 5)}</p>
                <p>Monthly Salary: ₹{selectedStaffData.monthly_salary?.toFixed(2)}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Attendance Type *</Label>
            <Select
              value={regularizationType}
              onValueChange={(value: any) => setRegularizationType(value)}
            >
              <SelectTrigger className="bg-cuephoria-darker border-cuephoria-purple/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-cuephoria-dark border-cuephoria-purple/20">
                <SelectItem value="full_day">Full Day Present</SelectItem>
                <SelectItem value="half_day">Half Day Present</SelectItem>
                <SelectItem value="absent">Absent (No Salary)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedStaffData && regularizationType !== 'absent' && (
            <div className="p-4 bg-cuephoria-darker rounded-lg border border-cuephoria-purple/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Working Hours:</span>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                  <Clock className="h-3 w-3 mr-1" />
                  {calculatedHours.toFixed(2)} hours
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Daily Earnings:</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                  ₹{calculatedEarnings.toFixed(2)}
                </Badge>
              </div>
            </div>
          )}

          {regularizationType === 'absent' && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-500">
                Marking as absent will result in no salary for this day. LOP deduction will be applied.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-cuephoria-purple/20"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedStaff || !selectedDate}
            className="bg-cuephoria-purple hover:bg-cuephoria-lightpurple"
          >
            {isSubmitting ? 'Processing...' : 'Regularize Attendance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminRegularizationDialog;

