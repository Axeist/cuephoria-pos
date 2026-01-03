// src/components/staff/StaffRequestsManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format, differenceInDays, differenceInHours, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { 
  Calendar, FileText, TrendingUp, User, Clock, DollarSign, AlertCircle, 
  CheckCircle, XCircle, Check, X, Filter, RefreshCw, TrendingDown, 
  BarChart3, Zap, Timer, Activity
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StaffRequestsManagementProps {
  staffProfiles: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

type RequestType = 'leave' | 'regularization' | 'overtime' | 'double-shift';
type RequestStatus = 'pending' | 'approved' | 'rejected';

interface UnifiedRequest {
  id: string;
  type: RequestType;
  staffName: string;
  designation: string;
  date: Date;
  createdAt: Date;
  status: RequestStatus;
  data: any;
  priority: 'high' | 'medium' | 'low';
}

const StaffRequestsManagement: React.FC<StaffRequestsManagementProps> = ({
  staffProfiles,
  isLoading,
  onRefresh
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [allRequests, setAllRequests] = useState<UnifiedRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<UnifiedRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<UnifiedRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminComments, setAdminComments] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  
  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalPending: 0,
    totalFinancialImpact: 0,
    averageAge: 0,
    urgentCount: 0,
    thisWeekCount: 0,
    lastWeekCount: 0,
    typeDistribution: {
      leave: 0,
      regularization: 0,
      overtime: 0,
      'double-shift': 0
    }
  });

  useEffect(() => {
    fetchAllRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [filterType, allRequests]);

  const fetchAllRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const unifiedRequests: UnifiedRequest[] = [];

      // Fetch leaves
      const { data: leaves } = await supabase
        .from('pending_leaves_view')
        .select('*')
        .order('requested_at', { ascending: false });

      if (leaves) {
        leaves.forEach((leave: any) => {
          const createdAt = new Date(leave.requested_at);
          const daysOld = differenceInDays(new Date(), createdAt);
          unifiedRequests.push({
            id: leave.id,
            type: 'leave',
            staffName: leave.staff_name,
            designation: leave.designation,
            date: new Date(leave.start_date),
            createdAt,
            status: 'pending',
            data: leave,
            priority: daysOld > 3 ? 'high' : daysOld > 1 ? 'medium' : 'low'
          });
        });
      }

      // Fetch regularizations
      const { data: regularizations } = await supabase
        .from('pending_regularization_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (regularizations) {
        regularizations.forEach((reg: any) => {
          const createdAt = new Date(reg.created_at);
          const daysOld = differenceInDays(new Date(), createdAt);
          unifiedRequests.push({
            id: reg.id,
            type: 'regularization',
            staffName: reg.username || reg.full_name,
            designation: reg.designation,
            date: new Date(reg.date),
            createdAt,
            status: 'pending',
            data: reg,
            priority: daysOld > 3 ? 'high' : daysOld > 1 ? 'medium' : 'low'
          });
        });
      }

      // Fetch OT requests
      const { data: otRequests } = await supabase
        .from('pending_ot_requests_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (otRequests) {
        otRequests.forEach((ot: any) => {
          const createdAt = new Date(ot.created_at);
          const daysOld = differenceInDays(new Date(), createdAt);
          unifiedRequests.push({
            id: ot.id,
            type: 'overtime',
            staffName: ot.username || ot.full_name,
            designation: ot.designation,
            date: new Date(ot.date),
            createdAt,
            status: 'pending',
            data: ot,
            priority: daysOld > 3 ? 'high' : daysOld > 1 ? 'medium' : 'low'
          });
        });
      }

      // Fetch double shift requests
      const { data: doubleShiftRequests } = await supabase
        .from('pending_double_shift_requests_view')
        .select('*')
        .order('requested_at', { ascending: false });

      if (doubleShiftRequests) {
        doubleShiftRequests.forEach((ds: any) => {
          const createdAt = new Date(ds.requested_at || ds.created_at);
          const daysOld = differenceInDays(new Date(), createdAt);
          unifiedRequests.push({
            id: ds.id,
            type: 'double-shift',
            staffName: ds.staff_name,
            designation: ds.designation,
            date: new Date(ds.date),
            createdAt,
            status: 'pending',
            data: ds,
            priority: daysOld > 3 ? 'high' : daysOld > 1 ? 'medium' : 'low'
          });
        });
      }

      // Sort by priority and date
      unifiedRequests.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      setAllRequests(unifiedRequests);
      calculateAnalytics(unifiedRequests);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load requests',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const calculateAnalytics = (requests: UnifiedRequest[]) => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    const thisWeekEnd = endOfWeek(now);
    const lastWeekStart = startOfWeek(subWeeks(now, 1));
    const lastWeekEnd = endOfWeek(subWeeks(now, 1));

    let totalFinancial = 0;
    let totalAge = 0;
    let urgentCount = 0;
    let thisWeekCount = 0;
    let lastWeekCount = 0;
    const typeDistribution = {
      leave: 0,
      regularization: 0,
      overtime: 0,
      'double-shift': 0
    };

    requests.forEach((req) => {
      typeDistribution[req.type]++;
      
      const age = differenceInHours(now, req.createdAt);
      totalAge += age;
      
      if (req.priority === 'high') urgentCount++;
      
      if (req.createdAt >= thisWeekStart && req.createdAt <= thisWeekEnd) {
        thisWeekCount++;
      } else if (req.createdAt >= lastWeekStart && req.createdAt <= lastWeekEnd) {
        lastWeekCount++;
      }

      // Calculate financial impact
      if (req.type === 'overtime') {
        totalFinancial += req.data.overtime_amount || 100;
      } else if (req.type === 'double-shift') {
        totalFinancial += req.data.allowance_amount || 0;
      }
    });

    setAnalytics({
      totalPending: requests.length,
      totalFinancialImpact: totalFinancial,
      averageAge: requests.length > 0 ? Math.round(totalAge / requests.length / 24 * 10) / 10 : 0,
      urgentCount,
      thisWeekCount,
      lastWeekCount,
      typeDistribution
    });
  };

  const filterRequests = () => {
    if (filterType === 'all') {
      setFilteredRequests(allRequests);
    } else if (filterType === 'urgent') {
      setFilteredRequests(allRequests.filter(r => r.priority === 'high'));
    } else {
      setFilteredRequests(allRequests.filter(r => r.type === filterType));
    }
  };

  const handleRequestAction = async (request: UnifiedRequest, action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      if (request.type === 'leave') {
        const { error } = await supabase
          .from('staff_leave_requests')
          .update({
            status: action === 'approve' ? 'approved' : 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user?.username || 'admin',
            remarks: adminComments
          })
          .eq('id', request.id);
        if (error) throw error;
      } else if (request.type === 'regularization') {
        if (action === 'approve') {
          const { error: rpcError } = await supabase.rpc('process_regularization', {
            p_regularization_id: request.id,
            p_action: 'approve'
          });
          if (rpcError) throw rpcError;
        } else {
          const { error } = await supabase
            .from('staff_attendance_regularization')
            .update({
              status: 'rejected',
              reviewed_at: new Date().toISOString(),
              reviewed_by: user?.username || 'admin',
              remarks: adminComments
            })
            .eq('id', request.id);
          if (error) throw error;
        }
      } else if (request.type === 'overtime') {
        const { error: rpcError } = await supabase.rpc('process_ot_request', {
          p_ot_request_id: request.id,
          p_action: action,
          p_remarks: adminComments || null
        });
        if (rpcError) throw rpcError;
      } else if (request.type === 'double-shift') {
        const { error } = await supabase.rpc('process_double_shift_request', {
          p_request_id: request.id,
          p_action: action,
          p_remarks: action === 'reject' ? adminComments : null
        });
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });

      setShowDialog(false);
      setAdminComments('');
      setSelectedRequest(null);
      await fetchAllRequests();
      onRefresh();
    } catch (error: any) {
      console.error('Error processing request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process request',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openActionDialog = (request: UnifiedRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setShowDialog(true);
  };

  const getRequestTypeIcon = (type: RequestType) => {
    switch (type) {
      case 'leave': return <Calendar className="h-4 w-4" />;
      case 'regularization': return <FileText className="h-4 w-4" />;
      case 'overtime': return <TrendingUp className="h-4 w-4" />;
      case 'double-shift': return <User className="h-4 w-4" />;
    }
  };

  const getRequestTypeLabel = (type: RequestType) => {
    switch (type) {
      case 'leave': return 'Leave';
      case 'regularization': return 'Regularization';
      case 'overtime': return 'Overtime';
      case 'double-shift': return 'Double Shift';
    }
  };

  const getRequestTypeColor = (type: RequestType) => {
    switch (type) {
      case 'leave': return 'text-yellow-500 border-yellow-500';
      case 'regularization': return 'text-orange-500 border-orange-500';
      case 'overtime': return 'text-blue-500 border-blue-500';
      case 'double-shift': return 'text-purple-500 border-purple-500';
    }
  };

  const renderRequestDetails = (request: UnifiedRequest) => {
    const { data, type } = request;
    
    if (type === 'leave') {
      return (
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Leave Type</p>
            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
              {data.leave_type?.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="text-sm text-white">{data.total_days} day{data.total_days > 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">From</p>
            <p className="text-sm text-white">{format(new Date(data.start_date), 'MMM dd, yyyy')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">To</p>
            <p className="text-sm text-white">{format(new Date(data.end_date), 'MMM dd, yyyy')}</p>
          </div>
        </div>
      );
    } else if (type === 'regularization') {
      return (
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Type</p>
            <Badge variant="outline" className="text-orange-500 border-orange-500">
              {data.regularization_type?.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="text-sm text-white">{format(new Date(data.date), 'MMM dd, yyyy')}</p>
          </div>
          {data.requested_clock_in && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Requested Clock In</p>
              <p className="text-sm text-white flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(data.requested_clock_in), 'hh:mm a')}
              </p>
            </div>
          )}
          {data.requested_clock_out && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Requested Clock Out</p>
              <p className="text-sm text-white flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(data.requested_clock_out), 'hh:mm a')}
              </p>
            </div>
          )}
        </div>
      );
    } else if (type === 'overtime') {
      return (
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="text-sm text-white">{format(new Date(data.date), 'MMM dd, yyyy')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Overtime Hours</p>
            <Badge variant="outline" className="text-blue-500 border-blue-500">
              <Clock className="h-3 w-3 mr-1" />
              {data.overtime_hours} hrs
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">OT Allowance</p>
            <Badge variant="outline" className="text-green-500 border-green-500">
              ₹{data.overtime_amount || 100}.00
            </Badge>
          </div>
        </div>
      );
    } else if (type === 'double-shift') {
      return (
        <div className="space-y-2 mt-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Covering for:</span>
            <span className="text-white font-semibold">{data.covered_staff_name}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm text-white">{format(new Date(data.date), 'MMM dd, yyyy')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Hours</p>
              <p className="text-sm text-white">{data.total_hours} hrs</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Allowance</p>
              <Badge variant="outline" className="text-green-500 border-green-500">
                <DollarSign className="h-3 w-3 mr-1" />
                ₹{data.allowance_amount?.toFixed(2) || '0.00'}
              </Badge>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const trendChange = analytics.lastWeekCount > 0 
    ? ((analytics.thisWeekCount - analytics.lastWeekCount) / analytics.lastWeekCount * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Insightful Analytics Widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.totalPending}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.urgentCount} urgent request{analytics.urgentCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Financial Impact</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">₹{analytics.totalFinancialImpact.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Pending OT & Double Shift allowances
            </p>
          </CardContent>
        </Card>

        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Avg. Age</CardTitle>
            <Timer className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.averageAge}</div>
            <p className="text-xs text-muted-foreground">
              Days since request
            </p>
          </CardContent>
        </Card>

        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">This Week</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.thisWeekCount}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {parseFloat(trendChange) > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : parseFloat(trendChange) < 0 ? (
                <TrendingDown className="h-3 w-3 text-red-500" />
              ) : null}
              {trendChange !== '0' && `${Math.abs(parseFloat(trendChange))}% vs last week`}
              {trendChange === '0' && 'Same as last week'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Request Type Distribution */}
      <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
        <CardHeader>
          <CardTitle className="text-white">Request Distribution</CardTitle>
          <CardDescription>Breakdown by request type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-cuephoria-darker rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{analytics.typeDistribution.leave}</div>
              <p className="text-xs text-muted-foreground">Leaves</p>
            </div>
            <div className="text-center p-4 bg-cuephoria-darker rounded-lg">
              <FileText className="h-6 w-6 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{analytics.typeDistribution.regularization}</div>
              <p className="text-xs text-muted-foreground">Regularizations</p>
            </div>
            <div className="text-center p-4 bg-cuephoria-darker rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{analytics.typeDistribution.overtime}</div>
              <p className="text-xs text-muted-foreground">Overtime</p>
            </div>
            <div className="text-center p-4 bg-cuephoria-darker rounded-lg">
              <User className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{analytics.typeDistribution['double-shift']}</div>
              <p className="text-xs text-muted-foreground">Double Shift</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Request List */}
      <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">All Staff Requests</CardTitle>
              <CardDescription>Review and manage all pending requests</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px] bg-cuephoria-darker border-cuephoria-purple/20">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Requests</SelectItem>
                  <SelectItem value="urgent">Urgent (3+ days)</SelectItem>
                  <SelectItem value="leave">Leaves</SelectItem>
                  <SelectItem value="regularization">Regularizations</SelectItem>
                  <SelectItem value="overtime">Overtime</SelectItem>
                  <SelectItem value="double-shift">Double Shift</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={fetchAllRequests}
                variant="outline"
                size="sm"
                className="border-cuephoria-purple/20"
                disabled={isLoadingRequests}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingRequests ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingRequests ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card
                  key={`${request.type}-${request.id}`}
                  className={`bg-cuephoria-darker border-cuephoria-purple/10 hover:border-cuephoria-purple/40 transition-all ${
                    request.priority === 'high' ? 'border-red-500/50 bg-red-500/5' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`h-12 w-12 rounded-full bg-cuephoria-purple/20 flex items-center justify-center flex-shrink-0 ${getRequestTypeColor(request.type).split(' ')[0]}`}>
                          {getRequestTypeIcon(request.type)}
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white text-lg">{request.staffName}</p>
                            <Badge variant="outline" className={getRequestTypeColor(request.type)}>
                              {getRequestTypeIcon(request.type)}
                              <span className="ml-1">{getRequestTypeLabel(request.type)}</span>
                            </Badge>
                            {request.priority === 'high' && (
                              <Badge variant="outline" className="text-red-500 border-red-500">
                                <Zap className="h-3 w-3 mr-1" />
                                Urgent
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{request.designation}</p>

                          {renderRequestDetails(request)}

                          {request.data.reason && (
                            <div className="mt-3 p-3 bg-cuephoria-dark rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Reason</p>
                              <p className="text-sm text-white">{request.data.reason}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                            <Clock className="h-3 w-3" />
                            Requested {format(request.createdAt, 'MMM dd, yyyy hh:mm a')} 
                            {' '}({differenceInDays(new Date(), request.createdAt)} day{differenceInDays(new Date(), request.createdAt) !== 1 ? 's' : ''} ago)
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
              {actionType === 'approve' ? 'Approve' : 'Reject'} {selectedRequest && getRequestTypeLabel(selectedRequest.type)} Request
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedRequest && (
                <>
                  {actionType === 'approve' ? 'Approve' : 'Reject'} {getRequestTypeLabel(selectedRequest.type).toLowerCase()} request for{' '}
                  <span className="font-semibold text-white">{selectedRequest.staffName}</span>
                  {selectedRequest.type === 'leave' && (
                    <> from {format(new Date(selectedRequest.data.start_date), 'MMM dd')} to {format(new Date(selectedRequest.data.end_date), 'MMM dd, yyyy')}</>
                  )}
                  {selectedRequest.type !== 'leave' && (
                    <> for {format(selectedRequest.date, 'MMM dd, yyyy')}</>
                  )}
                  {actionType === 'approve' && (selectedRequest.type === 'overtime' || selectedRequest.type === 'double-shift') && (
                    <span className="block mt-2 text-green-400">
                      {selectedRequest.type === 'overtime' && `₹${selectedRequest.data.overtime_amount || 100} will be added to payroll.`}
                      {selectedRequest.type === 'double-shift' && `₹${selectedRequest.data.allowance_amount?.toFixed(2) || '0.00'} will be added to payroll.`}
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
              onClick={() => selectedRequest && handleRequestAction(selectedRequest, actionType)}
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
    </div>
  );
};

export default StaffRequestsManagement;
