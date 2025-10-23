// src/components/staff/LeaveRequestDialog.tsx
import React, { useState } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  leaveBalance: { paid: number; unpaid: number };
  onSuccess: () => void;
}

const LeaveRequestDialog: React.FC<LeaveRequestDialogProps> = ({
  open,
  onOpenChange,
  staffId,
  leaveBalance,
  onSuccess
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [leaveType, setLeaveType] = useState<string>('sick_leave');
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select start and end dates',
        variant: 'destructive'
      });
      return;
    }

    if (endDate < startDate) {
      toast({
        title: 'Validation Error',
        description: 'End date must be after start date',
        variant: 'destructive'
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a reason for leave',
        variant: 'destructive'
      });
      return;
    }

    // Calculate days
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check leave balance
    if (leaveType === 'unpaid_leave') {
      if (daysDiff > leaveBalance.unpaid) {
        toast({
          title: 'Insufficient Leave Balance',
          description: `You only have ${leaveBalance.unpaid} unpaid leave day(s) remaining`,
          variant: 'destructive'
        });
        return;
      }
    } else {
      if (daysDiff > leaveBalance.paid) {
        toast({
          title: 'Insufficient Leave Balance',
          description: `You only have ${leaveBalance.paid} paid leave day(s) remaining`,
          variant: 'destructive'
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('staff_leave_requests')
        .insert({
          staff_id: staffId,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          leave_type: leaveType,
          reason: reason.trim(),
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Leave request submitted successfully'
      });

      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setLeaveType('sick_leave');
      setReason('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting leave request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit leave request',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl gradient-text">Request Leave</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Submit a leave request for approval
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Leave Type */}
          <div className="space-y-2">
            <Label>Leave Type</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger className="bg-cuephoria-darker border-cuephoria-purple/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-cuephoria-dark border-cuephoria-purple/20">
                <SelectItem value="sick_leave">Sick Leave (Paid - {leaveBalance.paid} day remaining)</SelectItem>
                <SelectItem value="casual_leave">Casual Leave (Paid - {leaveBalance.paid} day remaining)</SelectItem>
                <SelectItem value="emergency_leave">Emergency Leave (Paid - {leaveBalance.paid} day remaining)</SelectItem>
                <SelectItem value="unpaid_leave">Unpaid Leave ({leaveBalance.unpaid} days remaining)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-cuephoria-darker border-cuephoria-purple/20",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-cuephoria-dark border-cuephoria-purple/20">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className="bg-cuephoria-dark text-white"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-cuephoria-darker border-cuephoria-purple/20",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-cuephoria-dark border-cuephoria-purple/20">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => 
                    date < new Date(new Date().setHours(0, 0, 0, 0)) || 
                    (startDate ? date < startDate : false)
                  }
                  initialFocus
                  className="bg-cuephoria-dark text-white"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Show days calculation */}
          {startDate && endDate && (
            <div className="p-3 bg-cuephoria-darker rounded-lg border border-cuephoria-purple/20">
              <p className="text-sm text-white">
                Total Days: <span className="font-bold text-cuephoria-lightpurple">
                  {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
                </span>
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide reason for your leave request..."
              className="bg-cuephoria-darker border-cuephoria-purple/20 min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {reason.length}/500 characters
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
            disabled={isSubmitting}
            className="bg-cuephoria-purple hover:bg-cuephoria-lightpurple"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveRequestDialog;
