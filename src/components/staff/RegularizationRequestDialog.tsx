// src/components/staff/RegularizationRequestDialog.tsx
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';
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

interface RegularizationRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  staffId: string;
}

const RegularizationRequestDialog: React.FC<RegularizationRequestDialogProps> = ({
  open,
  onOpenChange,
  staffId,
  onSuccess
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [regularizationType, setRegularizationType] = useState<'missing_clock_in' | 'missing_clock_out' | 'apply_leave'>('missing_clock_in');
  const [requestedClockIn, setRequestedClockIn] = useState('');
  const [requestedClockOut, setRequestedClockOut] = useState('');
  const [leaveType, setLeaveType] = useState<string>('');
  const [reason, setReason] = useState('');
  const [remainingRegularizations, setRemainingRegularizations] = useState(3);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && staffId) {
      checkRegularizationLimit();
    }
  }, [open, staffId, selectedDate]);

  const checkRegularizationLimit = async () => {
    try {
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();
      
      const { data, error: rpcError } = await supabase.rpc('check_regularization_limit', {
        p_staff_id: staffId,
        p_month: month,
        p_year: year
      });

      if (rpcError) throw rpcError;
      
      const used = data === false ? 3 : 0;
      const remaining = 3 - used;
      setRemainingRegularizations(remaining);
      
      if (remaining <= 0) {
        setError('You have reached the maximum limit of 3 regularizations for this month.');
      } else {
        setError('');
      }
    } catch (error: any) {
      console.error('Error checking limit:', error);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a reason for regularization',
        variant: 'destructive'
      });
      return;
    }

    if (remainingRegularizations <= 0) {
      toast({
        title: 'Limit Reached',
        description: 'You have reached the maximum limit of 3 regularizations for this month',
        variant: 'destructive'
      });
      return;
    }

    if (regularizationType === 'missing_clock_in' && !requestedClockIn) {
      toast({
        title: 'Validation Error',
        description: 'Please provide clock in time',
        variant: 'destructive'
      });
      return;
    }

    if (regularizationType === 'missing_clock_out' && !requestedClockOut) {
      toast({
        title: 'Validation Error',
        description: 'Please provide clock out time',
        variant: 'destructive'
      });
      return;
    }

    if (regularizationType === 'apply_leave' && !leaveType) {
      toast({
        title: 'Validation Error',
        description: 'Please select a leave type',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const clockInTime = requestedClockIn ? new Date(`${dateStr}T${requestedClockIn}`).toISOString() : null;
      const clockOutTime = requestedClockOut ? new Date(`${dateStr}T${requestedClockOut}`).toISOString() : null;

      const { error } = await supabase
        .from('staff_attendance_regularization')
        .insert({
          staff_id: staffId,
          date: dateStr,
          regularization_type: regularizationType,
          requested_clock_in: clockInTime,
          requested_clock_out: clockOutTime,
          leave_type: regularizationType === 'apply_leave' ? leaveType : null,
          reason: reason
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Regularization request submitted successfully. Awaiting admin approval.'
      });

      // Reset form
      setSelectedDate(new Date());
      setRegularizationType('missing_clock_in');
      setRequestedClockIn('');
      setRequestedClockOut('');
      setLeaveType('');
      setReason('');
      setError('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting regularization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit regularization request',
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
          <DialogTitle className="text-2xl gradient-text">Request Attendance Regularization</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            You can request regularization for missing clock in/out or apply leave. Maximum 3 requests per month.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-cuephoria-darker rounded-lg border border-cuephoria-purple/20">
            <span className="text-sm text-muted-foreground">Remaining Regularizations:</span>
            <Badge variant={remainingRegularizations > 0 ? 'default' : 'destructive'} className="text-lg px-3 py-1">
              {remainingRegularizations} / 3
            </Badge>
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

          <div className="space-y-2">
            <Label>Regularization Type *</Label>
            <Select
              value={regularizationType}
              onValueChange={(value: any) => {
                setRegularizationType(value);
                setRequestedClockIn('');
                setRequestedClockOut('');
                setLeaveType('');
              }}
            >
              <SelectTrigger className="bg-cuephoria-darker border-cuephoria-purple/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-cuephoria-dark border-cuephoria-purple/20">
                <SelectItem value="missing_clock_in">Missing Clock In</SelectItem>
                <SelectItem value="missing_clock_out">Missing Clock Out</SelectItem>
                <SelectItem value="apply_leave">Apply Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {regularizationType === 'missing_clock_in' && (
            <div className="space-y-2">
              <Label>Requested Clock In Time *</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cuephoria-lightpurple" />
                <Input
                  type="time"
                  value={requestedClockIn}
                  onChange={(e) => setRequestedClockIn(e.target.value)}
                  className="bg-cuephoria-darker border-cuephoria-purple/20"
                />
              </div>
              <div className="space-y-2 mt-2">
                <Label>Requested Clock Out Time (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cuephoria-lightpurple" />
                  <Input
                    type="time"
                    value={requestedClockOut}
                    onChange={(e) => setRequestedClockOut(e.target.value)}
                    className="bg-cuephoria-darker border-cuephoria-purple/20"
                  />
                </div>
              </div>
            </div>
          )}

          {regularizationType === 'missing_clock_out' && (
            <div className="space-y-2">
              <Label>Requested Clock Out Time *</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cuephoria-lightpurple" />
                <Input
                  type="time"
                  value={requestedClockOut}
                  onChange={(e) => setRequestedClockOut(e.target.value)}
                  className="bg-cuephoria-darker border-cuephoria-purple/20"
                />
              </div>
            </div>
          )}

          {regularizationType === 'apply_leave' && (
            <div className="space-y-2">
              <Label>Leave Type *</Label>
              <Select
                value={leaveType}
                onValueChange={setLeaveType}
              >
                <SelectTrigger className="bg-cuephoria-darker border-cuephoria-purple/20">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent className="bg-cuephoria-dark border-cuephoria-purple/20">
                  <SelectItem value="paid_leave">Paid Leave</SelectItem>
                  <SelectItem value="unpaid_leave">Unpaid Leave</SelectItem>
                  <SelectItem value="sick_leave">Sick Leave</SelectItem>
                  <SelectItem value="casual_leave">Casual Leave</SelectItem>
                  <SelectItem value="emergency_leave">Emergency Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for this regularization request..."
              className="bg-cuephoria-darker border-cuephoria-purple/20"
              rows={4}
            />
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
            disabled={isSubmitting || remainingRegularizations <= 0}
            className="bg-cuephoria-purple hover:bg-cuephoria-lightpurple"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegularizationRequestDialog;

