// src/components/staff/EditStaffDialog.tsx
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Clock, User, Mail, Phone, DollarSign } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface EditStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  staff: any | null;
}

const EditStaffDialog: React.FC<EditStaffDialogProps> = ({
  open,
  onOpenChange,
  staff,
  onSuccess
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    designation: '',
    email: '',
    phone: '',
    monthly_salary: '',
    shift_start_time: '',
    shift_end_time: '',
  });

  useEffect(() => {
    if (staff && open) {
      setFormData({
        username: staff.username || '',
        full_name: staff.full_name || '',
        designation: staff.designation || '',
        email: staff.email || '',
        phone: staff.phone || '',
        monthly_salary: staff.monthly_salary?.toString() || '',
        shift_start_time: staff.shift_start_time?.substring(0, 5) || '11:00',
        shift_end_time: staff.shift_end_time?.substring(0, 5) || '23:00',
      });
    }
  }, [staff, open]);

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
    if (!staff) return;

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
        .update({
          username: formData.username,
          full_name: formData.full_name || formData.username,
          designation: formData.designation,
          email: formData.email || null,
          phone: formData.phone || null,
          monthly_salary: parseFloat(formData.monthly_salary),
          hourly_rate: hourlyRate,
          shift_start_time: formData.shift_start_time,
          shift_end_time: formData.shift_end_time,
          default_shift_hours: shiftHours,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', staff.user_id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Staff information updated successfully'
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update staff information',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!staff) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl gradient-text">Edit Staff Information</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update staff member details. Changes to shift timing will affect future calculations.
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
            <Label>Shift Timing *</Label>
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
                Updating...
              </>
            ) : (
              'Update Staff'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditStaffDialog;

