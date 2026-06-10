import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  Calendar, FileText, TrendingUp, User, Clock, DollarSign, AlertCircle,
  CheckCircle, XCircle, Check, X, Filter, RefreshCw, TrendingDown,
  BarChart3, Zap, Timer, Activity, Trash2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { StaffProfile } from '@/types/staff.types';
import {
  useStaffRequests,
  type UnifiedRequest,
  type RequestType,
  type RequestStatus,
} from '@/hooks/staff/useStaffRequests';

type Props = { staffProfiles: StaffProfile[]; isLoading: boolean; onRefresh: () => void };

const StaffRequestsPanel: React.FC<Props> = ({ staffProfiles, isLoading, onRefresh }) => {
  const {
    filteredRequests, selectedRequest, isProcessing, adminComments, setAdminComments,
    showDialog, setShowDialog, showDeleteDialog, setShowDeleteDialog, actionType,
    filterType, setFilterType, filterStatus, setFilterStatus, dateFilter, setDateFilter,
    isLoadingRequests, analytics, isAdmin,
    fetchAllRequests, handleRequestAction, handleDeleteRequest,
    canDeleteRequest, openActionDialog, openDeleteDialog,
  } = useStaffRequests({ staffProfiles, onRefresh });

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
      const allowance = getDoubleShiftAllowanceAmount(data);
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
                ₹{allowance.toFixed(2)}
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
        <Card className="bg-card/30 border-border/50 border-border/50">
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

        <Card className="bg-card/30 border-border/50 border-border/50">
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

        <Card className="bg-card/30 border-border/50 border-border/50">
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

        <Card className="bg-card/30 border-border/50 border-border/50">
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
        <Card className="bg-card/30 border-border/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.totalApproved}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/30 border-border/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.totalRejected}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/30 border-border/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Requests</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{allRequests.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Request Type Distribution */}
      <Card className="bg-card/30 border-border/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-white">Request Distribution</CardTitle>
          <CardDescription>Breakdown by request type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-card/30 border-border/50er rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{analytics.typeDistribution.leave}</div>
              <p className="text-xs text-muted-foreground">Leaves</p>
            </div>
            <div className="text-center p-4 bg-card/30 border-border/50er rounded-lg">
              <FileText className="h-6 w-6 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{analytics.typeDistribution.regularization}</div>
              <p className="text-xs text-muted-foreground">Regularizations</p>
            </div>
            <div className="text-center p-4 bg-card/30 border-border/50er rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{analytics.typeDistribution.overtime}</div>
              <p className="text-xs text-muted-foreground">Overtime</p>
            </div>
            <div className="text-center p-4 bg-card/30 border-border/50er rounded-lg">
              <User className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{analytics.typeDistribution['double-shift']}</div>
              <p className="text-xs text-muted-foreground">Double Shift</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Request List */}
      <Card className="bg-card/30 border-border/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">All Staff Requests</CardTitle>
              <CardDescription>Review and manage all requests</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger className="w-[180px] bg-card/30 border-border/50er border-border/50">
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
                <SelectTrigger className="w-[150px] bg-card/30 border-border/50er border-border/50">
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
                <SelectTrigger className="w-[180px] bg-card/30 border-border/50er border-border/50">
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
                className="border-border/50"
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
              <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary/40 border-t-transparent"></div>
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
                  className={`bg-card/30 border-border/50er border-border/40 hover:border-cuephoria-purple/40 transition-all ${
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
                            <div className="mt-3 p-3 bg-card/30 border-border/50 rounded-lg">
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
        <DialogContent className="bg-card/30 border-border/50 border-border/50 text-white">
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
                      {selectedRequest.type === 'double-shift' && `₹${getDoubleShiftAllowanceAmount(selectedRequest.data).toFixed(2)} will be added to payroll.`}
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
                className="bg-card/30 border-border/50er border-border/50"
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
              className="border-border/50"
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
        <AlertDialogContent className="bg-card/30 border-border/50 border-border/50 text-white">
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
            <AlertDialogCancel className="border-border/50">Cancel</AlertDialogCancel>
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

export default StaffRequestsPanel;
