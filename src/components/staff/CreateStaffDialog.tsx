// src/components/staff/CreateStaffDialog.tsx
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar, Clock } from 'lucide-react';
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

interface CreateStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateStaffDialog: React.FC<CreateStaffDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joiningDate, setJoiningDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    designation: '',
    email: '',
    phone: '',
    monthly_salary: '',
    shift_start_time: '11:00',
    shift_end_time: '23:00',
    role: 'staff'
  });

  const calculateShiftHours = () => {
    const start = formData.shift_start_time.split(':');
    const end = formData.shift_end_time.split(':');
    const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
    const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
    let diff = endMinutes - startMinutes;
    if (diff < 0) diff += 24 * 60; // Handle overnight shifts
    return (diff / 60).toFixed(1);
  };

  const handleSubmit = async () => {
    if (!formData.username || !formData.designation || !formData.monthly_salary) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const shiftHours = parseFloat(calculateShiftHours());
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const hourlyRate = parseFloat(formData.monthly_salary) / (daysInMonth * shiftHours);

      const { error } = await supabase
        .from('staff_profiles')
        .insert({
          username: formData.username,
          full_name: formData.full_name || formData.username,
          designation: formData.designation,
          email: formData.email || null,
          phone: formData.phone || null,
          monthly_salary: parseFloat(formData.monthly_salary),
          hourly_rate: hourlyRate,
          shift_start_time: formData.shift_start_time,
          shift_end_time: formData.shift_end_time,
          joining_date: format(joiningDate, 'yyyy-MM-dd'),
          default_shift_hours: shiftHours,
          role: formData.role,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Staff member added successfully'
      });

      setFormData({
        username: '',
        full_name: '',
        designation: '',
        email: '',
        phone: '',
        monthly_salary: '',
        shift_start_time: '11:00',
        shift_end_time: '23:00',
        role: 'staff'
      });
      setJoiningDate(new Date());
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create staff member',
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
          <DialogTitle className="text-2xl gradient-text">Add Staff Member</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new staff member profile
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username *</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="Enter username"
                className="bg-cuephoria-darker border-cuephoria-purple/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                placeholder="Enter full name"
                className="bg-cuephoria-darker border-cuephoria-purple/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Designation *</Label>
            <Input
              value={formData.designation}
              onChange={(e) => setFormData({...formData, designation: e.target.value})}
              placeholder="e.g. Receptionist, Cook, Manager"
              className="bg-cuephoria-darker border-cuephoria-purple/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="email@example.com"
                className="bg-cuephoria-darker border-cuephoria-purple/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+91 1234567890"
                className="bg-cuephoria-darker border-cuephoria-purple/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Joining Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-cuephoria-darker border-cuephoria-purple/20",
                    !joiningDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {joiningDate ? format(joiningDate, "PPP") : "Select joining date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-cuephoria-dark border-cuephoria-purple/20">
                <CalendarComponent
                  mode="single"
                  selected={joiningDate}
                  onSelect={(date) => date && setJoiningDate(date)}
                  initialFocus
                  className="bg-cuephoria-dark text-white"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Monthly Salary (₹) *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.monthly_salary}
              onChange={(e) => setFormData({...formData, monthly_salary: e.target.value})}
              placeholder="12000.00"
              className="bg-cuephoria-darker border-cuephoria-purple/20"
            />
          </div>

          <div className="space-y-2">
            <Label>Working Hours</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Shift Start</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cuephoria-lightpurple" />
                  <Input
                    type="time"
                    value={formData.shift_start_time}
                    onChange={(e) => setFormData({...formData, shift_start_time: e.target.value})}
                    className="bg-cuephoria-darker border-cuephoria-purple/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Shift End</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cuephoria-lightpurple" />
                  <Input
                    type="time"
                    value={formData.shift_end_time}
                    onChange={(e) => setFormData({...formData, shift_end_time: e.target.value})}
                    className="bg-cuephoria-darker border-cuephoria-purple/20"
                  />
                </div>
              </div>
            </div>
            <div className="p-3 bg-cuephoria-darker rounded-lg border border-cuephoria-purple/20 mt-2">
              <p className="text-sm text-white">
                Total shift hours: <span className="font-bold text-cuephoria-lightpurple">{calculateShiftHours()} hours/day</span>
              </p>
              {formData.monthly_salary && (
                <p className="text-sm text-muted-foreground mt-1">
                  Hourly rate: ₹{(
                    parseFloat(formData.monthly_salary) / 
                    (new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() * parseFloat(calculateShiftHours()))
                  ).toFixed(2)}/hour
                </p>
              )}
            </div>
          </div>

          <div className="p-4 bg-cuephoria-darker rounded-lg border border-cuephoria-purple/20">
            <h4 className="font-semibold text-white mb-2">Salary Calculation Example</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              {formData.monthly_salary && (
                <>
                  <p>• Monthly Salary: ₹{parseFloat(formData.monthly_salary).toFixed(2)}</p>
                  <p>• Days in current month: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} days</p>
                  <p>• Daily rate: ₹{(parseFloat(formData.monthly_salary) / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()).toFixed(2)}</p>
                  <p>• Shift hours: {calculateShiftHours()} hours/day</p>
                  <p className="text-cuephoria-lightpurple font-semibold">
                    • Hourly rate: ₹{(
                      parseFloat(formData.monthly_salary) / 
                      (new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() * parseFloat(calculateShiftHours()))
                    ).toFixed(2)}/hour
                  </p>
                </>
              )}
            </div>
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
                Creating...
              </>
            ) : (
              'Create Staff'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStaffDialog;
