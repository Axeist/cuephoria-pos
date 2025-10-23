// src/components/staff/StaffDirectory.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Phone, Calendar, Edit, Trash2, UserX, UserCheck } from 'lucide-react';
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
import { format } from 'date-fns';

interface StaffDirectoryProps {
  staffProfiles: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

const StaffDirectory: React.FC<StaffDirectoryProps> = ({
  staffProfiles,
  isLoading,
  onRefresh
}) => {
  const { toast } = useToast();
  const [deleteStaffId, setDeleteStaffId] = useState<string | null>(null);
  const [deactivateStaffId, setDeactivateStaffId] = useState<string | null>(null);

  const handleDeleteStaff = async () => {
    if (!deleteStaffId) return;

    try {
      const { error } = await supabase
        .from('staff_profiles')
        .delete()
        .eq('user_id', deleteStaffId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Staff member deleted successfully'
      });

      setDeleteStaffId(null);
      onRefresh();
    } catch (error: any) {
      console.error('Error deleting staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete staff member',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (staffId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('staff_profiles')
        .update({ is_active: !currentStatus })
        .eq('user_id', staffId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Staff member ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      });

      onRefresh();
    } catch (error: any) {
      console.error('Error updating staff status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update staff status',
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
      <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
        <CardHeader>
          <CardTitle className="text-white">Staff Directory</CardTitle>
          <CardDescription>Complete list of all staff members</CardDescription>
        </CardHeader>
        <CardContent>
          {staffProfiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No staff members found
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {staffProfiles.map((staff) => (
                <Card
                  key={staff.user_id}
                  className={`bg-cuephoria-darker border-cuephoria-purple/10 ${
                    !staff.is_active && 'opacity-60'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-cuephoria-purple/20 flex items-center justify-center">
                          <span className="text-xl font-bold text-cuephoria-lightpurple">
                            {staff.username?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-white">{staff.username}</p>
                          <p className="text-sm text-muted-foreground">{staff.designation}</p>
                        </div>
                      </div>
                      <Badge
                        variant={staff.is_active ? 'default' : 'secondary'}
                        className={staff.is_active ? 'bg-green-500' : 'bg-gray-500'}
                      >
                        {staff.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      {staff.full_name && staff.full_name !== staff.username && (
                        <p className="text-muted-foreground">
                          Full Name: <span className="text-white">{staff.full_name}</span>
                        </p>
                      )}
                      {staff.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="text-white">{staff.email}</span>
                        </div>
                      )}
                      {staff.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span className="text-white">{staff.phone}</span>
                        </div>
                      )}
                      {staff.joining_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="text-white">
                            Joined {format(new Date(staff.joining_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-3 border-t border-cuephoria-purple/10">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Monthly Salary:</span>
                        <span className="text-white font-semibold">₹{staff.monthly_salary?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Hourly Rate:</span>
                        <span className="text-cuephoria-blue font-semibold">₹{staff.hourly_rate?.toFixed(2)}/hr</span>
                      </div>
                      {staff.shift_start_time && staff.shift_end_time && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Shift Hours:</span>
                          <span className="text-white">
                            {staff.shift_start_time.substring(0, 5)} - {staff.shift_end_time.substring(0, 5)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleToggleActive(staff.user_id, staff.is_active)}
                        variant="outline"
                        size="sm"
                        className={`flex-1 ${
                          staff.is_active
                            ? 'border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white'
                            : 'border-green-500 text-green-500 hover:bg-green-500 hover:text-white'
                        }`}
                      >
                        {staff.is_active ? (
                          <>
                            <UserX className="h-3 w-3 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => setDeleteStaffId(staff.user_id)}
                        variant="outline"
                        size="sm"
                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteStaffId} onOpenChange={() => setDeleteStaffId(null)}>
        <AlertDialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete this staff member and all their associated records including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Attendance records</li>
                <li>Leave requests</li>
                <li>Payroll history</li>
                <li>All deductions and allowances</li>
              </ul>
              <p className="mt-3 text-yellow-500">
                ⚠️ Consider deactivating instead if you want to preserve records.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-cuephoria-purple/20">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStaff}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StaffDirectory;
