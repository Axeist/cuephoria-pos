// src/components/staff/RegularizationManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { Check, X, Calendar, Clock, User, AlertCircle } from 'lucide-react';
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

interface RegularizationManagementProps {
  staffProfiles: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

const RegularizationManagement: React.FC<RegularizationManagementProps> = ({
  staffProfiles,
  isLoading,
  onRefresh
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [regularizations, setRegularizations] = useState<any[]>([]);
  const [isLoadingRegularizations, setIsLoadingRegularizations] = useState(false);
  const [selectedRegularization, setSelectedRegularization] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminComments, setAdminComments] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  useEffect(() => {
    fetchRegularizations();
  }, []);

  const fetchRegularizations = async () => {
    setIsLoadingRegularizations(true);
    try {
      const { data, error } = await supabase
        .from('pending_regularization_view')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegularizations(data || []);
    } catch (error: any) {
      console.error('Error fetching regularizations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load regularization requests',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingRegularizations(false);
    }
  };

  const handleRegularizationAction = async (regularizationId: string, action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      if (action === 'approve') {
        const { error: rpcError } = await supabase.rpc('process_regularization', {
          p_regularization_id: regularizationId,
          p_action: 'approve'
        });

        if (rpcError) throw rpcError;
      } else {
        // For reject, just update status
        const { error } = await supabase
          .from('staff_attendance_regularization')
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user?.username || 'admin',
            remarks: adminComments
          })
          .eq('id', regularizationId);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Regularization request ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });

      setShowDialog(false);
      setAdminComments('');
      setSelectedRegularization(null);
      fetchRegularizations();
      onRefresh();
    } catch (error: any) {
      console.error('Error processing regularization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process regularization request',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openActionDialog = (regularization: any, action: 'approve' | 'reject') => {
    setSelectedRegularization(regularization);
    setActionType(action);
    setShowDialog(true);
  };

  const getRegularizationTypeLabel = (type: string) => {
    switch (type) {
      case 'missing_clock_in':
        return 'Missing Clock In';
      case 'missing_clock_out':
        return 'Missing Clock Out';
      case 'apply_leave':
        return 'Apply Leave';
      default:
        return type;
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Attendance Regularization Requests</CardTitle>
              <CardDescription>Review and approve attendance regularization requests</CardDescription>
            </div>
            <Button
              onClick={fetchRegularizations}
              variant="outline"
              size="sm"
              className="border-cuephoria-purple/20"
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingRegularizations ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
            </div>
          ) : regularizations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending regularization requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {regularizations.map((reg) => (
                <Card
                  key={reg.id}
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
                            <p className="font-semibold text-white text-lg">{reg.username || reg.full_name}</p>
                            <p className="text-sm text-muted-foreground">{reg.designation}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Type</p>
                              <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                                {getRegularizationTypeLabel(reg.regularization_type)}
                              </Badge>
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Date</p>
                              <p className="text-sm text-white">
                                {format(new Date(reg.date), 'MMM dd, yyyy')}
                              </p>
                            </div>

                            {reg.requested_clock_in && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Requested Clock In</p>
                                <p className="text-sm text-white flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(reg.requested_clock_in), 'hh:mm a')}
                                </p>
                              </div>
                            )}

                            {reg.requested_clock_out && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Requested Clock Out</p>
                                <p className="text-sm text-white flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(reg.requested_clock_out), 'hh:mm a')}
                                </p>
                              </div>
                            )}

                            {reg.leave_type && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Leave Type</p>
                                <Badge variant="outline" className="text-blue-500 border-blue-500">
                                  {reg.leave_type.replace(/_/g, ' ').toUpperCase()}
                                </Badge>
                              </div>
                            )}
                          </div>

                          {reg.reason && (
                            <div className="mt-3 p-3 bg-cuephoria-dark rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Reason</p>
                              <p className="text-sm text-white">{reg.reason}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                            <Calendar className="h-3 w-3" />
                            Requested on {format(new Date(reg.created_at), 'MMM dd, yyyy hh:mm a')}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          onClick={() => openActionDialog(reg, 'approve')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => openActionDialog(reg, 'reject')}
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
              {actionType === 'approve' ? 'Approve' : 'Reject'} Regularization Request
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedRegularization && (
                <>
                  {actionType === 'approve' ? 'Approve' : 'Reject'} regularization request for{' '}
                  <span className="font-semibold text-white">{selectedRegularization.username}</span>
                  {' '}for {format(new Date(selectedRegularization.date), 'MMM dd, yyyy')}
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
                setSelectedRegularization(null);
              }}
              className="border-cuephoria-purple/20"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedRegularization && handleRegularizationAction(selectedRegularization.id, actionType)}
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

export default RegularizationManagement;

