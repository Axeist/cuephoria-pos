// src/components/staff/OvertimeRequestDialog.tsx
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
import { Badge } from "@/components/ui/badge";

interface OvertimeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  staffId: string;
}

const OvertimeRequestDialog: React.FC<OvertimeRequestDialogProps> = ({
  open,
  onOpenChange,
  staffId,
  onSuccess
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [overtimeHours, setOvertimeHours] = useState<string>('');
  const [reason, setReason] = useState('');
  const [availableOTDays, setAvailableOTDays] = useState<any[]>([]);

  useEffect(() => {
    if (open && staffId) {
      fetchAvailableOTDays();
    }
  }, [open, staffId, selectedDate]);

  const fetchAvailableOTDays = async () => {
    try {
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();
      
      // Get overtime records that haven't been requested yet
      const { data: otRecords, error: otError } = await supabase
        .from('staff_overtime')
        .select('*')
        .eq('staff_id', staffId)
        .eq('status', 'pending')
        .gte('date', `${year}-${String(month).padStart(2, '0')}-01`)
        .lt('date', `${year}-${String(month + 1).padStart(2, '0')}-01`);

      if (otError) throw otError;

      // Get already requested dates
      const { data: requestedDates, error: reqError } = await supabase
        .from('staff_overtime_requests')
        .select('date')
        .eq('staff_id', staffId)
        .in('status', ['pending', 'approved'])
        .gte('date', `${year}-${String(month).padStart(2, '0')}-01`)
        .lt('date', `${year}-${String(month + 1).padStart(2, '0')}-01`);

      if (reqError) throw reqError;

      const requestedDateSet = new Set((requestedDates || []).map(r => r.date));
      const available = (otRecords || []).filter(ot => !requestedDateSet.has(ot.date));
      
      setAvailableOTDays(available);
    } catch (error: any) {
      console.error('Error fetching OT days:', error);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim() || !overtimeHours || parseFloat(overtimeHours) <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please provide overtime hours and reason',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const { error } = await supabase
        .from('staff_overtime_requests')
        .insert({
          staff_id: staffId,
          date: dateStr,
          overtime_hours: parseFloat(overtimeHours),
          reason: reason,
          overtime_amount: 100 // ₹100 per OT day
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Overtime request submitted successfully. Awaiting admin approval.'
      });

      // Reset form
      setSelectedDate(new Date());
      setOvertimeHours('');
      setReason('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting OT request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit overtime request',
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
          <DialogTitle className="text-2xl gradient-text">Request Overtime Allowance</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Request overtime allowance for days you worked extra hours. ₹100 per OT day will be added to your salary upon approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-semibold text-blue-400">Overtime Allowance</p>
            </div>
            <p className="text-xs text-muted-foreground">
              ₹100 will be added to your salary for each approved OT day, regardless of the number of overtime hours worked.
            </p>
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
            <Label>Overtime Hours *</Label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-cuephoria-lightpurple" />
              <Input
                type="number"
                step="0.5"
                min="0.5"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(e.target.value)}
                placeholder="e.g. 2.5"
                className="bg-cuephoria-darker border-cuephoria-purple/20"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the number of overtime hours you worked on this day
            </p>
          </div>

          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for working overtime..."
              className="bg-cuephoria-darker border-cuephoria-purple/20"
              rows={4}
            />
          </div>

          <div className="p-3 bg-cuephoria-darker rounded-lg border border-cuephoria-purple/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">OT Allowance:</span>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                ₹100.00
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Fixed amount per OT day (regardless of hours)
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
            disabled={isSubmitting || !overtimeHours || !reason.trim()}
            className="bg-cuephoria-purple hover:bg-cuephoria-lightpurple"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OvertimeRequestDialog;

