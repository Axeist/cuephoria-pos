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
import { Loader2 } from 'lucide-react';

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
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    designation: '',
    monthly_salary: '',
    phone: '',
    email: '',
    default_shift_hours: '8'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const salary = parseFloat(formData.monthly_salary);
      const hourlyRate = salary / 208; // 26 days * 8 hours

      const { data, error } = await supabase
        .from('staff_profiles')
        .insert({
          username: formData.username,
          full_name: formData.full_name,
          designation: formData.designation,
          monthly_salary: salary,
          hourly_rate: hourlyRate,
          phone: formData.phone,
          email: formData.email,
          default_shift_hours: parseFloat(formData.default_shift_hours),
          is_active: true,
          role: 'staff'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${formData.full_name} has been added to the team!`
      });

      // Reset form
      setFormData({
        username: '',
        full_name: '',
        designation: '',
        monthly_salary: '',
        phone: '',
        email: '',
        default_shift_hours: '8'
      });

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
      <DialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl gradient-text">Add New Staff Member</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter the details of the new staff member. All fields are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="bg-cuephoria-darker border-cuephoria-purple/20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                className="bg-cuephoria-darker border-cuephoria-purple/20"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="designation">Designation *</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => setFormData({...formData, designation: e.target.value})}
                placeholder="e.g., Cashier, Floor Manager"
                className="bg-cuephoria-darker border-cuephoria-purple/20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_salary">Monthly Salary (₹) *</Label>
              <Input
                id="monthly_salary"
                type="number"
                step="0.01"
                value={formData.monthly_salary}
                onChange={(e) => setFormData({...formData, monthly_salary: e.target.value})}
                className="bg-cuephoria-darker border-cuephoria-purple/20"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="bg-cuephoria-darker border-cuephoria-purple/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="bg-cuephoria-darker border-cuephoria-purple/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift_hours">Default Shift Hours</Label>
            <Input
              id="shift_hours"
              type="number"
              step="0.5"
              value={formData.default_shift_hours}
              onChange={(e) => setFormData({...formData, default_shift_hours: e.target.value})}
              className="bg-cuephoria-darker border-cuephoria-purple/20"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-cuephoria-purple/20"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-cuephoria-purple hover:bg-cuephoria-lightpurple"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Staff Member'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStaffDialog;
