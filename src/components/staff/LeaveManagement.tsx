// src/components/staff/LeaveManagement.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Check, X, Calendar, Clock, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface LeaveManagementProps {
  staffProfiles: any[];
  pendingLeaves: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

const LeaveManagement: React.FC<LeaveManagementProps> = ({
  staffProfiles,
  pendingLeaves,
  isLoading,
  onRefresh
}) => {
  const { toast } = useToast();
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminComments, setAdminComments] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  const handleLeaveAction = async (leaveId: string, action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('staff_leave_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin', // You can get this from auth context
          remarks: adminComments
        })
        .eq('id', leaveId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });

      setShowDialog(false);
      setAdminComments('');
      setSelectedLeave(null);
      onRefresh();
    } catch (error: any) {
      console.error('Error processing leave:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process leave request',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openActionDialog = (leave: any, action: 'approve' | 'reject') => {
    setSelectedLeave(leave);
    setActionType(action);
    setShowDialog(true);
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Leave Management</CardTitle>
              <CardDescription>Review and approve leave requests</CardDescription>
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
          {pendingLeaves.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending leave requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingLeaves.map((leave) => (
                <Card
                  key={leave.id}
                  className="bg-cuephoria-darker border-cuephoria-purple/10 hover:border-cuephoria-purple/40 transition-all"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="h-12 w-12 rounded-full bg-cuephoria-purple/20 flex items-center justify-center flex-shrink-0">
                          <User className="h-6 w-6 text-cuephoria-lightpurple" />
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div>
                            <p className="font-semibold text-white text-lg">{leave.staff_name}</p>
                            <p className="text-sm text-muted-foreground">{leave.designation}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Leave Type</p>
                              <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                                {leave.leave_type?.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Duration</p>
                              <p className="text-sm text-white">
                                {leave.total_days} day{leave.total_days > 1 ? 's' : ''}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">From</p>
                              <p className="text-sm text-white">
                                {format(new Date(leave.start_date), 'MMM dd, yyyy')}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">To</p>
                              <p className="text-sm text-white">
                                {format(new Date(leave.end_date), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>

                          {leave.reason && (
                            <div className="mt-3 p-3 bg-cuephoria-dark rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Reason</p>
                              <p className="text-sm text-white">{leave.reason}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                            <Clock className="h-3 w-3" />
                            Requested on {format(new Date(leave.requested_at), 'MMM dd, yyyy hh:mm a')}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          onClick={() => openActionDialog(leave, 'approve')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => openActionDialog(leave, 'reject')}
                          variant="destructive"
                          size="sm"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Leave Request
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedLeave && (
                <>
                  {actionType === 'approve' ? 'Approve' : 'Reject'} leave request for{' '}
                  <span className="font-semibold text-white">{selectedLeave.staff_name}</span>
                  {' '}from {format(new Date(selectedLeave.start_date), 'MMM dd')} to{' '}
                  {format(new Date(selectedLeave.end_date), 'MMM dd, yyyy')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                placeholder="Add any comments or notes..."
                value={adminComments}
                onChange={(e) => setAdminComments(e.target.value)}
                className="bg-cuephoria-darker border-cuephoria-purple/20"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setAdminComments('');
                setSelectedLeave(null);
              }}
              className="border-cuephoria-purple/20"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedLeave && handleLeaveAction(selectedLeave.id, actionType)}
              disabled={isProcessing}
              className={
                actionType === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  {actionType === 'approve' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Approve Request
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Reject Request
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeaveManagement;
