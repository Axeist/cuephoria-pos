// src/components/staff/OvertimeManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { Check, X, Clock, User, AlertCircle, TrendingUp } from 'lucide-react';
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

interface OvertimeManagementProps {
  staffProfiles: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

const OvertimeManagement: React.FC<OvertimeManagementProps> = ({
  staffProfiles,
  isLoading,
  onRefresh
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [otRequests, setOtRequests] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminComments, setAdminComments] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  useEffect(() => {
    fetchOTRequests();
  }, []);

  const fetchOTRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('pending_ot_requests_view')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOtRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching OT requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load OT requests',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleOTAction = async (requestId: string, action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      const { error: rpcError } = await supabase.rpc('process_ot_request', {
        p_ot_request_id: requestId,
        p_action: action,
        p_remarks: adminComments || null
      });

      if (rpcError) throw rpcError;

      toast({
        title: 'Success',
        description: `OT request ${action === 'approve' ? 'approved' : 'rejected'} successfully. ${action === 'approve' ? '₹100 will be added to payroll.' : ''}`
      });

      setShowDialog(false);
      setAdminComments('');
      setSelectedRequest(null);
      fetchOTRequests();
      onRefresh();
    } catch (error: any) {
      console.error('Error processing OT request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process OT request',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openActionDialog = (request: any, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
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
              <CardTitle className="text-white">Overtime Requests</CardTitle>
              <CardDescription>Review and approve overtime allowance requests (₹100 per OT day)</CardDescription>
            </div>
            <Button
              onClick={fetchOTRequests}
              variant="outline"
              size="sm"
              className="border-cuephoria-purple/20"
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingRequests ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
            </div>
          ) : otRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending overtime requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {otRequests.map((request) => (
                <Card
                  key={request.id}
                  className="bg-cuephoria-darker border-cuephoria-purple/10 hover:border-cuephoria-purple/40 transition-all"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="h-12 w-12 rounded-full bg-cuephoria-purple/20 flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="h-6 w-6 text-cuephoria-lightpurple" />
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div>
                            <p className="font-semibold text-white text-lg">{request.username || request.full_name}</p>
                            <p className="text-sm text-muted-foreground">{request.designation}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Date</p>
                              <p className="text-sm text-white">
                                {format(new Date(request.date), 'MMM dd, yyyy')}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Overtime Hours</p>
                              <Badge variant="outline" className="text-blue-500 border-blue-500">
                                <Clock className="h-3 w-3 mr-1" />
                                {request.overtime_hours} hrs
                              </Badge>
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">OT Allowance</p>
                              <Badge variant="outline" className="text-green-500 border-green-500">
                                ₹{request.overtime_amount || 100}.00
                              </Badge>
                            </div>
                          </div>

                          {request.reason && (
                            <div className="mt-3 p-3 bg-cuephoria-dark rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Reason</p>
                              <p className="text-sm text-white">{request.reason}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                            <Clock className="h-3 w-3" />
                            Requested on {format(new Date(request.created_at), 'MMM dd, yyyy hh:mm a')}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          onClick={() => openActionDialog(request, 'approve')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => openActionDialog(request, 'reject')}
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
              {actionType === 'approve' ? 'Approve' : 'Reject'} Overtime Request
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedRequest && (
                <>
                  {actionType === 'approve' ? 'Approve' : 'Reject'} OT request for{' '}
                  <span className="font-semibold text-white">{selectedRequest.username}</span>
                  {' '}for {format(new Date(selectedRequest.date), 'MMM dd, yyyy')}
                  {actionType === 'approve' && (
                    <span className="block mt-2 text-green-400">
                      ₹{selectedRequest.overtime_amount || 100} will be added to payroll.
                    </span>
                  )}
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
                setSelectedRequest(null);
              }}
              className="border-cuephoria-purple/20"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedRequest && handleOTAction(selectedRequest.id, actionType)}
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

export default OvertimeManagement;

