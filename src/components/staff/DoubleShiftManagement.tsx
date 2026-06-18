// src/components/staff/DoubleShiftManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, User, DollarSign } from 'lucide-react';
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface DoubleShiftManagementProps {
  staffProfiles: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

const DoubleShiftManagement: React.FC<DoubleShiftManagementProps> = ({
  staffProfiles,
  isLoading,
  onRefresh
}) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('pending_double_shift_requests_view')
        .select('*')
        .order('date', { ascending: false })
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching double shift requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load double shift requests',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      const { error } = await supabase.rpc('process_double_shift_request', {
        p_request_id: selectedRequest.id,
        p_action: 'approve'
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Double shift request approved. Allowance has been added to payroll.'
      });

      setShowApproveDialog(false);
      setSelectedRequest(null);
      setRemarks('');
      fetchRequests();
      onRefresh();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request',
        variant: 'destructive'
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !remarks.trim()) return;

    try {
      const { error } = await supabase.rpc('process_double_shift_request', {
        p_request_id: selectedRequest.id,
        p_action: 'reject',
        p_remarks: remarks
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Double shift request rejected'
      });

      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRemarks('');
      fetchRequests();
      onRefresh();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request',
        variant: 'destructive'
      });
    }
  };

  if (isLoading || isLoadingRequests) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
        <CardHeader>
          <CardTitle className="text-white">Double Shift Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending double shift requests
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 rounded-lg bg-cuephoria-darker border border-cuephoria-purple/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                          PENDING
                        </Badge>
                        <Badge variant="outline" className="text-cuephoria-lightpurple border-cuephoria-lightpurple">
                          {format(new Date(request.date), 'MMM dd, yyyy')}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-cuephoria-lightpurple" />
                          <span className="text-white font-semibold">{request.staff_name}</span>
                          <span className="text-muted-foreground">will cover for</span>
                          <span className="text-white font-semibold">{request.covered_staff_name}</span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Covered Shift:</span>
                            <span className="text-white ml-1">
                              {request.covered_shift_start?.substring(0, 5)} - {request.covered_shift_end?.substring(0, 5)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Total Hours:</span>
                            <span className="text-white font-semibold ml-1">{request.total_hours} hrs</span>
                          </div>
                        </div>

                        {request.reason && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold">Reason:</span> {request.reason}
                          </p>
                        )}

                        <div className="flex items-center gap-1 text-sm">
                          <DollarSign className="h-3 w-3 text-green-400" />
                          <span className="text-muted-foreground">Estimated Allowance:</span>
                          <span className="text-green-400 font-semibold ml-1">
                            ₹{(request.allowance_amount && Number(request.allowance_amount) > 0 ? Number(request.allowance_amount) : 200).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowApproveDialog(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRejectDialog(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Double Shift Request?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will approve the request and add an allowance of ₹{(selectedRequest?.allowance_amount && Number(selectedRequest.allowance_amount) > 0 ? Number(selectedRequest.allowance_amount) : 200).toFixed(2)} to {selectedRequest?.staff_name}'s payroll.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Remarks (Optional)</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any remarks..."
              className="bg-cuephoria-darker border-cuephoria-purple/20 text-white"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-cuephoria-purple/20">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Double Shift Request?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will reject the double shift request. Please provide a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Reason for Rejection *</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Explain why this request is being rejected..."
              className="bg-cuephoria-darker border-cuephoria-purple/20 text-white"
              required
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-cuephoria-purple/20">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700"
              disabled={!remarks.trim()}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DoubleShiftManagement;

