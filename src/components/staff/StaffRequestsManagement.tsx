// src/components/staff/StaffRequestsManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { 
  format, differenceInDays, differenceInHours, startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears
} from 'date-fns';
import { 
  Calendar, FileText, TrendingUp, User, Clock, DollarSign, AlertCircle, 
  CheckCircle, XCircle, Check, X, Filter, RefreshCw, TrendingDown, 
  BarChart3, Zap, Timer, Activity, Trash2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
type DateFilter = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'last_year' | 'all_time';

interface UnifiedRequest {
  id: string;
  type: RequestType;
  staffId: string;
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
  const isAdmin = user?.isAdmin || false;
  const [allRequests, setAllRequests] = useState<UnifiedRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<UnifiedRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<UnifiedRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminComments, setAdminComments] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('this_month');
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  
  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
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
    if (staffProfiles.length > 0) {
      fetchAllRequests();
    }
  }, [dateFilter, staffProfiles]);

  useEffect(() => {
    filterRequests();
  }, [filterType, filterStatus, dateFilter, allRequests]);

  const getDateRange = (filter: DateFilter): { start: Date; end: Date } => {
    const now = new Date();
    switch (filter) {
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'last_3_months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case 'this_year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'last_year':
        const lastYear = subYears(now, 1);
        return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
      case 'all_time':
        return { start: new Date(0), end: now };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchAllRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const unifiedRequests: UnifiedRequest[] = [];
      const dateRange = getDateRange(dateFilter);
      const startDateStr = format(dateRange.start, 'yyyy-MM-dd');
      const endDateStr = format(dateRange.end, 'yyyy-MM-dd');
      
      console.log('Fetching requests for date range:', startDateStr, 'to', endDateStr);

      // Fetch all leaves (pending, approved, rejected)
      const { data: leaves, error: leavesError } = await supabase
        .from('staff_leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (leavesError) {
        console.error('Error fetching leaves:', leavesError);
        toast({
          title: 'Error',
          description: `Failed to fetch leave requests: ${leavesError.message}`,
          variant: 'destructive'
        });
      }

      console.log('Fetched leaves:', leaves?.length || 0, leaves);
      console.log('Staff profiles count:', staffProfiles.length);
      console.log('Date filter:', dateFilter, 'Range:', startDateStr, 'to', endDateStr);

      if (leaves && leaves.length > 0) {
        leaves.forEach((leave: any) => {
          const createdAt = new Date(leave.created_at);
          const createdDateStr = format(createdAt, 'yyyy-MM-dd');
          
          // Filter by date range (or show all pending regardless of date)
          // Always show pending requests, filter others by date
          const isInDateRange = dateFilter === 'all_time' || 
            leave.status === 'pending' || // Always show pending requests
            (createdDateStr >= startDateStr && createdDateStr <= endDateStr);
          
          if (isInDateRange) {
            const daysOld = differenceInDays(new Date(), createdAt);
            // Find staff profile - try both user_id and id fields
            const profile = staffProfiles.find(sp => 
              (sp.user_id && sp.user_id === leave.staff_id) || 
              (sp.id && sp.id === leave.staff_id)
            );
            
            console.log('Processing leave:', {
              id: leave.id,
              staff_id: leave.staff_id,
              status: leave.status,
              created_at: createdDateStr,
              profile_found: !!profile,
              profile_username: profile?.username
            });
            
            unifiedRequests.push({
              id: leave.id,
              type: 'leave',
              staffId: leave.staff_id,
              staffName: profile?.full_name || profile?.username || `Staff ${leave.staff_id?.substring(0, 8) || 'Unknown'}`,
              designation: profile?.designation || 'N/A',
              date: new Date(leave.start_date),
              createdAt,
              status: (leave.status || 'pending') as RequestStatus,
              data: { 
                ...leave, 
                staff_name: profile?.full_name || profile?.username || `Staff ${leave.staff_id?.substring(0, 8) || 'Unknown'}`,
                leave_type: leave.leave_type,
                total_days: leave.total_days,
                start_date: leave.start_date,
                end_date: leave.end_date,
                reason: leave.reason,
                reviewed_by: leave.reviewed_by,
                reviewed_at: leave.reviewed_at,
                requested_at: leave.created_at
              },
              priority: daysOld > 3 ? 'high' : daysOld > 1 ? 'medium' : 'low'
            });
          } else {
            console.log('Leave filtered out:', leave.id, 'Status:', leave.status, 'Created:', createdDateStr);
          }
        });
      } else {
        console.log('No leaves found in database');
      }
      
      console.log('Total unified requests after leaves:', unifiedRequests.length);

      // Fetch all regularizations
      const { data: regularizations, error: regError } = await supabase
        .from('staff_attendance_regularization')
        .select('*')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr)
        .order('created_at', { ascending: false });

      if (regError) {
        console.error('Error fetching regularizations:', regError);
      }

      if (regularizations) {
        regularizations.forEach((reg: any) => {
          const createdAt = new Date(reg.created_at);
          const daysOld = differenceInDays(new Date(), createdAt);
          // Find staff profile
          const profile = staffProfiles.find(sp => sp.user_id === reg.staff_id);
          unifiedRequests.push({
            id: reg.id,
            type: 'regularization',
            staffId: reg.staff_id,
            staffName: profile?.full_name || profile?.username || 'Unknown',
            designation: profile?.designation || 'N/A',
            date: new Date(reg.date),
            createdAt,
            status: reg.status as RequestStatus,
            data: { ...reg, username: profile?.username, full_name: profile?.full_name },
            priority: daysOld > 3 ? 'high' : daysOld > 1 ? 'medium' : 'low'
          });
        });
      }

      // Fetch all OT requests
      const { data: otRequests, error: otError } = await supabase
        .from('staff_overtime_requests')
        .select('*')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr)
        .order('created_at', { ascending: false });

      if (otError) {
        console.error('Error fetching OT requests:', otError);
      }

      if (otRequests) {
        otRequests.forEach((ot: any) => {
          const createdAt = new Date(ot.created_at);
          const daysOld = differenceInDays(new Date(), createdAt);
          // Find staff profile
          const profile = staffProfiles.find(sp => sp.user_id === ot.staff_id);
          unifiedRequests.push({
            id: ot.id,
            type: 'overtime',
            staffId: ot.staff_id,
            staffName: profile?.full_name || profile?.username || 'Unknown',
            designation: profile?.designation || 'N/A',
            date: new Date(ot.date),
            createdAt,
            status: ot.status as RequestStatus,
            data: { ...ot, username: profile?.username, full_name: profile?.full_name },
            priority: daysOld > 3 ? 'high' : daysOld > 1 ? 'medium' : 'low'
          });
        });
      }

      // Fetch all double shift requests
      const { data: doubleShiftRequests, error: dsError } = await supabase
        .from('staff_double_shift_requests')
        .select('*')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr)
        .order('created_at', { ascending: false });

      if (dsError) {
        console.error('Error fetching double shift requests:', dsError);
      }

      if (doubleShiftRequests) {
        doubleShiftRequests.forEach((ds: any) => {
          const createdAt = new Date(ds.created_at || ds.requested_at);
          const daysOld = differenceInDays(new Date(), createdAt);
          // Find staff profile
          const profile = staffProfiles.find(sp => sp.user_id === ds.staff_id);
          unifiedRequests.push({
            id: ds.id,
            type: 'double-shift',
            staffId: ds.staff_id,
            staffName: profile?.full_name || profile?.username || 'Unknown',
            designation: profile?.designation || 'N/A',
            date: new Date(ds.date),
            createdAt,
            status: ds.status as RequestStatus,
            data: { ...ds, staff_name: profile?.full_name || profile?.username },
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
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    const typeDistribution = {
      leave: 0,
      regularization: 0,
      overtime: 0,
      'double-shift': 0
    };

    requests.forEach((req) => {
      if (req.status === 'pending') {
        typeDistribution[req.type]++;
        pendingCount++;
        
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
      } else if (req.status === 'approved') {
        approvedCount++;
      } else if (req.status === 'rejected') {
        rejectedCount++;
      }
    });

    setAnalytics({
      totalPending: pendingCount,
      totalApproved: approvedCount,
      totalRejected: rejectedCount,
      totalFinancialImpact: totalFinancial,
      averageAge: pendingCount > 0 ? Math.round(totalAge / pendingCount / 24 * 10) / 10 : 0,
      urgentCount,
      thisWeekCount,
      lastWeekCount,
      typeDistribution
    });
  };

  const filterRequests = () => {
    let filtered = [...allRequests];

    // Filter by type
    if (filterType !== 'all' && filterType !== 'urgent') {
      filtered = filtered.filter(r => r.type === filterType);
    } else if (filterType === 'urgent') {
      filtered = filtered.filter(r => r.priority === 'high');
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }

    setFilteredRequests(filtered);
  };

  const handleRequestAction = async (request: UnifiedRequest, action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      if (request.type === 'leave') {
        if (action === 'approve') {
          console.log('Approving leave request:', request.id, 'for staff:', request.staffId);
          
          // Use the new function to process leave approval
          const { data: rpcData, error: rpcError } = await supabase.rpc('process_leave_approval', {
            p_leave_id: request.id,
            p_action: 'approve'
          });
          
          if (rpcError) {
            console.error('Error in process_leave_approval RPC:', rpcError);
            throw rpcError;
          }
          
          console.log('Leave approval RPC completed successfully:', rpcData);
          
          // Update with admin comments and reviewed_by
          const { error } = await supabase
            .from('staff_leave_requests')
            .update({
              reviewed_by: user?.username || 'admin',
              remarks: adminComments || null
            })
            .eq('id', request.id);
          if (error) {
            console.error('Error updating leave request:', error);
            throw error;
          }
          
          // Verify attendance records were created
          const { data: attendanceCheck, error: checkError } = await supabase
            .from('staff_attendance')
            .select('*')
            .eq('staff_id', request.staffId)
            .gte('date', request.data.start_date)
            .lte('date', request.data.end_date)
            .eq('status', 'leave');
          
          console.log('Attendance records created for leave:', attendanceCheck?.length || 0, attendanceCheck);
          
          if (checkError) {
            console.error('Error checking attendance records:', checkError);
          }
        } else {
          const { error } = await supabase
            .from('staff_leave_requests')
            .update({
              status: 'rejected',
              reviewed_at: new Date().toISOString(),
              reviewed_by: user?.username || 'admin',
              remarks: adminComments
            })
            .eq('id', request.id);
          if (error) throw error;
        }
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
      
      // Wait a moment for database to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh requests list
      await fetchAllRequests();
      
      // Refresh parent data (which will refresh calendar if user switches tabs)
      onRefresh();
      
      // If it's a leave approval, show a message about calendar refresh
      if (request.type === 'leave' && action === 'approve') {
        setTimeout(() => {
          toast({
            title: 'Leave Approved',
            description: 'Leave has been marked in attendance. Please refresh the calendar view to see the update.',
            duration: 5000
          });
        }, 1000);
      }
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

  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    try {
      let tableName = '';
      switch (selectedRequest.type) {
        case 'leave':
          tableName = 'staff_leave_requests';
          break;
        case 'regularization':
          tableName = 'staff_attendance_regularization';
          break;
        case 'overtime':
          tableName = 'staff_overtime_requests';
          break;
        case 'double-shift':
          tableName = 'staff_double_shift_requests';
          break;
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Request deleted successfully'
      });

      setShowDeleteDialog(false);
      setSelectedRequest(null);
      await fetchAllRequests();
      onRefresh();
    } catch (error: any) {
      console.error('Error deleting request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete request',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const canDeleteRequest = (request: UnifiedRequest): boolean => {
    // Admin can delete any request
    if (isAdmin) return true;
    
    // Staff can only delete their own pending requests
    // Match by username (staff name in request vs current user username)
    if (request.status === 'pending' && user?.username) {
      const requestUsername = request.data.username || request.data.staff_name || request.staffName;
      if (requestUsername?.toLowerCase() === user.username.toLowerCase()) {
        return true;
      }
    }
    
    return false;
  };

  const openActionDialog = (request: UnifiedRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setShowDialog(true);
  };

  const openDeleteDialog = (request: UnifiedRequest) => {
    setSelectedRequest(request);
    setShowDeleteDialog(true);
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

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-500 border-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-500 border-red-500">Rejected</Badge>;
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

      {/* Status Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.totalApproved}</div>
          </CardContent>
        </Card>
        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.totalRejected}</div>
          </CardContent>
        </Card>
        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Requests</CardTitle>
            <BarChart3 className="h-4 w-4 text-cuephoria-lightpurple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{allRequests.length}</div>
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
              <CardDescription>Review and manage all requests</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger className="w-[180px] bg-cuephoria-darker border-cuephoria-purple/20">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                  <SelectItem value="all_time">All Time</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px] bg-cuephoria-darker border-cuephoria-purple/20">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
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
              <p>No requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card
                  key={`${request.type}-${request.id}`}
                  className={`bg-cuephoria-darker border-cuephoria-purple/10 hover:border-cuephoria-purple/40 transition-all ${
                    request.priority === 'high' && request.status === 'pending' ? 'border-red-500/50 bg-red-500/5' : ''
                  } ${request.status === 'approved' ? 'border-green-500/20' : request.status === 'rejected' ? 'border-red-500/20' : ''}`}
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
                            {getStatusBadge(request.status)}
                            {request.priority === 'high' && request.status === 'pending' && (
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

                          {request.status !== 'pending' && request.data.reviewed_by && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {request.status === 'approved' ? 'Approved' : 'Rejected'} by {request.data.reviewed_by} on{' '}
                              {request.data.reviewed_at ? format(new Date(request.data.reviewed_at), 'MMM dd, yyyy hh:mm a') : ''}
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
                        {request.status === 'pending' && (
                          <>
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
                          </>
                        )}
                        {canDeleteRequest(request) && (
                          <Button
                            onClick={() => openDeleteDialog(request)}
                            variant="outline"
                            size="sm"
                            className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        )}
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
                  {actionType === 'approve' && selectedRequest.type === 'leave' && (
                    <span className="block mt-2 text-green-400">
                      Leave will be marked in attendance calendar and reflected in payslips.
                    </span>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {selectedRequest && (
                <>
                  Are you sure you want to delete this {getRequestTypeLabel(selectedRequest.type).toLowerCase()} request for{' '}
                  <span className="font-semibold text-white">{selectedRequest.staffName}</span>?
                  {selectedRequest.status !== 'pending' && (
                    <span className="block mt-2 text-yellow-400">
                      This request has been {selectedRequest.status}. Only admins can delete processed requests.
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-cuephoria-purple/20">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRequest}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StaffRequestsManagement;
