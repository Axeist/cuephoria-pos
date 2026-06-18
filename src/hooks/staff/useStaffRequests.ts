import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  format, differenceInDays, differenceInHours, startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears,
} from 'date-fns';
import type { StaffProfile } from '@/types/staff.types';
import { staffProfileIds, staffDisplayName, staffSecondaryUsername } from '@/services/staff/staffMappers';
import { fetchAllRequests as fetchAllRequestsApi } from '@/services/staff/staffApi';
import {
  processLeaveApproval,
  finalizeLeaveApproval,
  rejectLeave,
  processRegularization,
  rejectRegularization,
  processOtRequest,
  processDoubleShiftRequest,
  deleteStaffRequest,
} from '@/services/staff/staffRpc';

function staffRequestNames(profile: StaffProfile | undefined, fallbackId?: string) {
  if (!profile) {
    const fallback = fallbackId ? `Staff ${fallbackId.substring(0, 8)}` : 'Unknown';
    return { staffName: fallback, staffLogin: null as string | null };
  }
  return {
    staffName: staffDisplayName(profile),
    staffLogin: staffSecondaryUsername(profile),
  };
}

type RequestType = 'leave' | 'regularization' | 'overtime' | 'double-shift';
type RequestStatus = 'pending' | 'approved' | 'rejected';
type DateFilter = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'last_year' | 'all_time';

interface UnifiedRequest {
  id: string;
  type: RequestType;
  staffId: string;
  staffName: string;
  staffLogin?: string | null;
  designation: string;
  date: Date;
  createdAt: Date;
  status: RequestStatus;
  data: any;
  priority: 'high' | 'medium' | 'low';
}

const FIXED_DOUBLE_SHIFT_ALLOWANCE = 200;

const getDoubleShiftAllowanceAmount = (data: Record<string, unknown>): number => {
  const raw = Number(data?.allowance_amount);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return FIXED_DOUBLE_SHIFT_ALLOWANCE;
};

type Options = { staffProfiles: StaffProfile[]; onRefresh: () => void };

export function useStaffRequests({ staffProfiles, onRefresh }: Options) {
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
      
      const profileIds = staffProfileIds(staffProfiles);
      const {
        leaves,
        regularizations,
        overtime: otRequests,
        doubleShifts: doubleShiftRequests,
      } = await fetchAllRequestsApi(profileIds);

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
            
            const { staffName, staffLogin } = staffRequestNames(profile, leave.staff_id);
                        unifiedRequests.push({
              id: leave.id,
              type: 'leave',
              staffId: leave.staff_id,
              staffName,
              staffLogin,
              designation: profile?.designation || 'N/A',
              date: new Date(leave.start_date),
              createdAt,
              status: (leave.status || 'pending') as RequestStatus,
              data: { 
                ...leave, 
                staff_name: staffName,
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
                      }
        });
      } else {
              }
      
      if (regularizations) {
        regularizations.forEach((reg: any) => {
          const createdAt = new Date(reg.created_at);
          const daysOld = differenceInDays(new Date(), createdAt);
          // Find staff profile
          const profile = staffProfiles.find(sp => sp.user_id === reg.staff_id);
          const { staffName, staffLogin } = staffRequestNames(profile, reg.staff_id);
          unifiedRequests.push({
            id: reg.id,
            type: 'regularization',
            staffId: reg.staff_id,
            staffName,
            staffLogin,
            designation: profile?.designation || 'N/A',
            date: new Date(reg.date),
            createdAt,
            status: reg.status as RequestStatus,
            data: { ...reg, username: profile?.username, full_name: profile?.full_name },
            priority: daysOld > 3 ? 'high' : daysOld > 1 ? 'medium' : 'low'
          });
        });
      }

      if (otRequests) {
        otRequests.forEach((ot: any) => {
          const createdAt = new Date(ot.created_at);
          const daysOld = differenceInDays(new Date(), createdAt);
          // Find staff profile
          const profile = staffProfiles.find(sp => sp.user_id === ot.staff_id);
          const { staffName, staffLogin } = staffRequestNames(profile, ot.staff_id);
          unifiedRequests.push({
            id: ot.id,
            type: 'overtime',
            staffId: ot.staff_id,
            staffName,
            staffLogin,
            designation: profile?.designation || 'N/A',
            date: new Date(ot.date),
            createdAt,
            status: ot.status as RequestStatus,
            data: { ...ot, username: profile?.username, full_name: profile?.full_name },
            priority: daysOld > 3 ? 'high' : daysOld > 1 ? 'medium' : 'low'
          });
        });
      }

      if (doubleShiftRequests) {
        doubleShiftRequests.forEach((ds: any) => {
          const createdAt = new Date(ds.requested_at || ds.created_at);
          const createdDateStr = format(createdAt, 'yyyy-MM-dd');
          const isInDateRange = dateFilter === 'all_time' ||
            ds.status === 'pending' || // Always show pending requests
            (createdDateStr >= startDateStr && createdDateStr <= endDateStr);

          if (!isInDateRange) return;

          const daysOld = differenceInDays(new Date(), createdAt);
          // Find staff profile
          const profile = staffProfiles.find(sp => sp.user_id === ds.staff_id);
          const coveredProfile = staffProfiles.find(sp => sp.user_id === ds.covered_staff_id);
          const { staffName, staffLogin } = staffRequestNames(profile, ds.staff_id);
          unifiedRequests.push({
            id: ds.id,
            type: 'double-shift',
            staffId: ds.staff_id,
            staffName,
            staffLogin,
            designation: profile?.designation || 'N/A',
            date: new Date(ds.date),
            createdAt,
            status: ds.status as RequestStatus,
            data: {
              ...ds,
              staff_name: staffName,
              covered_staff_name: coveredProfile ? staffDisplayName(coveredProfile) : ds.covered_staff_name,
              covered_staff_username: coveredProfile?.username ?? ds.covered_staff_username,
            },
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
          totalFinancial += getDoubleShiftAllowanceAmount(req.data);
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
          await processLeaveApproval(request.id, 'approve');
          await finalizeLeaveApproval(request.id, user?.username || 'admin', adminComments || null);
        } else {
          await rejectLeave(request.id, user?.username || 'admin', adminComments || null);
        }
      } else if (request.type === 'regularization') {
        if (action === 'approve') {
          await processRegularization(request.id, 'approve');
        } else {
          await rejectRegularization(request.id, user?.username || 'admin', adminComments || null);
        }
      } else if (request.type === 'overtime') {
        await processOtRequest(request.id, action, adminComments || null);
      } else if (request.type === 'double-shift') {
        await processDoubleShiftRequest(request.id, action, action === 'reject' ? adminComments : undefined);
      }

      toast({
        title: 'Success',
        description: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });

      setShowDialog(false);
      setAdminComments('');
      setSelectedRequest(null);
      
            // Refresh requests list
      await fetchAllRequests();
      
      // Refresh parent data (which will refresh calendar if user switches tabs)
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

      await deleteStaffRequest(tableName, selectedRequest.id);

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

  return {
    allRequests, filteredRequests, selectedRequest, setSelectedRequest,
    isProcessing, adminComments, setAdminComments, showDialog, setShowDialog,
    showDeleteDialog, setShowDeleteDialog, actionType, setActionType,
    filterType, setFilterType, filterStatus, setFilterStatus, dateFilter, setDateFilter,
    isLoadingRequests, analytics, isAdmin,
    fetchAllRequests, handleRequestAction, handleDeleteRequest,
    canDeleteRequest, openActionDialog, openDeleteDialog,
  };
}

export type { UnifiedRequest, RequestType, RequestStatus, DateFilter };
