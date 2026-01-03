// src/components/staff/DoubleShiftRequestDialog.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface DoubleShiftRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffProfiles: any[];
  onSuccess: () => void;
}

const DoubleShiftRequestDialog: React.FC<DoubleShiftRequestDialogProps> = ({
  open,
  onOpenChange,
  staffId,
  staffProfiles,
  onSuccess
}) => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [coveredStaffId, setCoveredStaffId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coveredStaff, setCoveredStaff] = useState<any>(null);
  const [currentStaff, setCurrentStaff] = useState<any>(null);
  const [calculatedHours, setCalculatedHours] = useState<number>(0);
  const [estimatedAllowance, setEstimatedAllowance] = useState<number>(0);

  useEffect(() => {
    if (staffId) {
      const staff = staffProfiles.find(s => s.user_id === staffId);
      setCurrentStaff(staff);
    }
  }, [staffId, staffProfiles]);

  useEffect(() => {
    if (coveredStaffId) {
      const staff = staffProfiles.find(s => s.user_id === coveredStaffId);
      setCoveredStaff(staff);
      calculateHoursAndAllowance(staff);
    }
  }, [coveredStaffId, selectedDate, staffProfiles]);

  const calculateHoursAndAllowance = async (coveredStaff: any) => {
    if (!coveredStaff || !currentStaff) return;

    try {
      // Calculate covered shift hours
      const startTime = coveredStaff.shift_start_time.split(':');
      const endTime = coveredStaff.shift_end_time.split(':');
      const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
      const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);
      
      let totalMinutes = endMinutes - startMinutes;
      if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight shifts
      
      const hours = totalMinutes / 60;
      setCalculatedHours(hours);

      // Calculate estimated allowance
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase.rpc('calculate_double_shift_allowance', {
        p_staff_id: staffId,
        p_covered_staff_id: coveredStaffId,
        p_covered_shift_hours: hours,
        p_date: dateStr
      });

      if (error) throw error;
      setEstimatedAllowance(data || 0);
    } catch (error: any) {
      console.error('Error calculating allowance:', error);
    }
  };

  const handleSubmit = async () => {
    if (!coveredStaffId || !reason || !selectedDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (!coveredStaff) {
      toast({
        title: 'Validation Error',
        description: 'Please select a staff member to cover',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Check if there's already a pending request for this date and staff
      const { data: existing } = await supabase
        .from('staff_double_shift_requests')
        .select('id')
        .eq('staff_id', staffId)
        .eq('date', dateStr)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        toast({
          title: 'Request Already Exists',
          description: 'You already have a pending double shift request for this date',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('staff_double_shift_requests')
        .insert({
          staff_id: staffId,
          covered_staff_id: coveredStaffId,
          date: dateStr,
          original_shift_start: currentStaff.shift_start_time,
          original_shift_end: currentStaff.shift_end_time,
          covered_shift_start: coveredStaff.shift_start_time,
          covered_shift_end: coveredStaff.shift_end_time,
          total_hours: calculatedHours,
          reason: reason
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Double shift request submitted successfully'
      });

      // Reset form
      setCoveredStaffId('');
      setReason('');
      setSelectedDate(new Date());
      setCoveredStaff(null);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting double shift request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit double shift request',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableStaff = staffProfiles.filter(s => 
    s.user_id !== staffId && 
    s.is_active
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl gradient-text">Request Double Shift</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Request to cover another staff member's shift. Upon approval, you'll receive an allowance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Staff to Cover *</Label>
            <Select
              value={coveredStaffId}
              onValueChange={setCoveredStaffId}
            >
              <SelectTrigger className="bg-cuephoria-darker border-cuephoria-purple/20">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent className="bg-cuephoria-dark border-cuephoria-purple/20">
                {availableStaff.map(staff => (
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

          {coveredStaff && (
            <div className="p-3 bg-cuephoria-darker rounded-lg border border-cuephoria-purple/20 space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-cuephoria-lightpurple" />
                <span className="font-semibold text-white">{coveredStaff.username}</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Shift: {coveredStaff.shift_start_time?.substring(0, 5)} - {coveredStaff.shift_end_time?.substring(0, 5)}</p>
                <p>Hours to cover: <span className="text-white font-semibold">{calculatedHours.toFixed(2)} hours</span></p>
                {estimatedAllowance > 0 && (
                  <p className="text-green-400 font-semibold">
                    Estimated Allowance: ₹{estimatedAllowance.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you're covering this shift..."
              className="bg-cuephoria-darker border-cuephoria-purple/20 text-white min-h-[100px]"
            />
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/50 rounded-lg">
            <p className="text-sm text-blue-400">
              <Clock className="h-4 w-4 inline mr-1" />
              You'll work both your shift and the covered shift. Upon approval, an allowance will be added to your payroll.
            </p>
          </div>
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
            disabled={isSubmitting || !coveredStaffId || !reason || !selectedDate}
            className="bg-cuephoria-purple hover:bg-cuephoria-lightpurple"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DoubleShiftRequestDialog;

