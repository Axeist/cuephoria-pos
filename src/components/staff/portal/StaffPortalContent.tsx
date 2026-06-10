import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Clock, LogIn, LogOut, Coffee, Calendar as CalendarIcon, FileText, DollarSign,
  TrendingUp, Plus, Trash2, AlertCircle, Filter, CheckCircle, XCircle, User,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import StaffPortalPinGate from '@/components/staff/StaffPortalPinGate';
import LeaveRequestDialog from '@/components/staff/LeaveRequestDialog';
import RegularizationRequestDialog from '@/components/staff/RegularizationRequestDialog';
import OvertimeRequestDialog from '@/components/staff/OvertimeRequestDialog';
import DoubleShiftRequestDialog from '@/components/staff/DoubleShiftRequestDialog';
import RealTimeTimer from '@/components/staff/RealTimeTimer';
import PortalShell from '@/components/staff/portal/PortalShell';
import PortalTabNav from '@/components/staff/portal/PortalTabNav';
import { useStaffPortal } from '@/hooks/staff/useStaffPortal';
import { staffDisplayName, staffSecondaryUsername } from '@/services/staff/staffMappers';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { resolveStaffHourlyRate, resolveStaffShiftHours, isStaffSalaryConfigured } from '@/utils/staffEarnings';
import { clearStaffPortalUnlock } from '@/utils/staffPortalSession';

const StaffPortalContent: React.FC = () => {
  const p = useStaffPortal();
  const {
    selectedStaff, setSelectedStaff, portalGate, setPortalGate, portalDisplayName,
    showLeaveRequest, setShowLeaveRequest, showRegularizationRequest, setShowRegularizationRequest,
    showOTRequest, setShowOTRequest, showDoubleShiftRequest, setShowDoubleShiftRequest,
    currentShift, activePortalTab, setActivePortalTab, filteredAttendance, monthlyStats,
    leaveRequests, regularizationRequests, otRequests, doubleShiftRequests, allStaffProfiles,
    leaveBalance,
    payslips, breakViolations, isLoading, deleteLeaveId, setDeleteLeaveId,
    attendanceFilters, setAttendanceFilters,
    fetchStaffData, handleClockIn, handleClockOut, handleStartBreak, handleEndBreak,
    handleDeleteLeave, handleDownloadPayslip, handleCloseDialog, handlePinVerified, isOnBreak,
  } = p;

  if (portalGate === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading staff portal…
      </div>
    );
  }

  if (portalGate === 'no_profile') {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="max-w-md glass-card border-border/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-white">Portal not set up</CardTitle>
            <CardDescription>
              Your login is not linked to a staff profile yet. Ask your manager to add you in
              Settings → User Management, or to link your HR profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleCloseDialog}>Back to dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (portalGate === 'pin' || !selectedStaff) {
    return (
      <StaffPortalPinGate
        displayName={portalDisplayName}
        onVerified={handlePinVerified}
        onCancel={handleCloseDialog}
      />
    );
  }

  return (
    <PortalShell
      displayName={staffDisplayName(selectedStaff)}
      username={staffSecondaryUsername(selectedStaff) ?? selectedStaff.username}
      designation={selectedStaff.designation}
      onLock={() => {
        clearStaffPortalUnlock();
        setSelectedStaff(null);
        setPortalGate('pin');
      }}
    >
      {/* Clock In/Out Card with Real-Time Timer */}
      <Card className="glass-card border-border/50 border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Current Shift</h3>
              {currentShift ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Clocked in at {format(new Date(currentShift.clock_in), 'hh:mm a')}
                  </div>
                  {currentShift.break_duration_minutes > 0 && (
                    <div className={`flex items-center gap-2 ${currentShift.break_duration_minutes > 60 ? 'text-red-500' : 'text-yellow-500'}`}>
                      <Coffee className="h-4 w-4" />
                      Break time: {currentShift.break_duration_minutes} min
                      {currentShift.break_duration_minutes > 60 && ' (EXCEEDED!)'}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Not clocked in yet</p>
              )}
            </div>
            <div className="flex gap-3">
              {!currentShift ? (
                <Button
                  onClick={handleClockIn}
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Clock In
                </Button>
              ) : (
                <>
                  {isOnBreak ? (
                    <Button
                      onClick={handleEndBreak}
                      variant="outline"
                      className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white"
                      size="lg"
                    >
                      <Coffee className="mr-2 h-5 w-5" />
                      End Break
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStartBreak}
                      variant="outline"
                      className="border-border/50"
                      size="lg"
                    >
                      <Coffee className="mr-2 h-5 w-5" />
                      Start Break
                    </Button>
                  )}
                  <Button
                    onClick={handleClockOut}
                    variant="destructive"
                    size="lg"
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    Clock Out
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Real-Time Timer */}
          {currentShift && (
            <>
              {!isStaffSalaryConfigured(selectedStaff ?? {}) && (
                <p className="text-sm text-amber-400/90 mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  Monthly salary is not set on your profile, so earnings stay at ₹0. Ask your manager to
                  set it in Staff → Directory → Edit.
                </p>
              )}
              <RealTimeTimer
                clockInTime={currentShift.clock_in}
                breakStartTime={currentShift.break_start_time}
                breakDuration={currentShift.break_duration_minutes || 0}
                hourlyRate={resolveStaffHourlyRate(selectedStaff ?? {})}
                maxPaidHours={resolveStaffShiftHours(selectedStaff ?? {})}
                isOnBreak={isOnBreak}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card border-border/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">This Month</CardTitle>
            <CalendarIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {monthlyStats?.days_worked || 0} days
            </div>
            <p className="text-xs text-muted-foreground">
              {monthlyStats?.total_hours?.toFixed(1) || 0} hours worked
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ₹{monthlyStats?.total_earnings?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              This month's earnings
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Paid Leave</CardTitle>
            <CalendarIcon className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {leaveBalance.paid}
            </div>
            <p className="text-xs text-muted-foreground">
              Day remaining
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Unpaid Leave</CardTitle>
            <CalendarIcon className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {leaveBalance.unpaid}
            </div>
            <p className="text-xs text-muted-foreground">
              Days remaining
            </p>
          </CardContent>
        </Card>
      </div>

      <PortalTabNav active={activePortalTab} onChange={setActivePortalTab} />

      <div className="w-full">
        {activePortalTab === 'attendance' && (
          <div className="space-y-4">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">All Attendance Records</CardTitle>
                  <CardDescription>Your complete attendance history</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="mb-4 p-4 glass-card border-border/50 rounded-lg border border-border/40 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-white">Filters</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select
                      value={attendanceFilters.status}
                      onValueChange={(value) => setAttendanceFilters({ ...attendanceFilters, status: value })}
                    >
                      <SelectTrigger className="glass-card border-border/50 border-border/50 text-white h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-card border-border/50 border-border/50">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="regularized">Admin Regularized</SelectItem>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="half_day">Half Day</SelectItem>
                        <SelectItem value="leave">Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">From Date</Label>
                    <Input
                      type="date"
                      value={attendanceFilters.dateFrom}
                      onChange={(e) => setAttendanceFilters({ ...attendanceFilters, dateFrom: e.target.value })}
                      className="glass-card border-border/50 border-border/50 text-white h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">To Date</Label>
                    <Input
                      type="date"
                      value={attendanceFilters.dateTo}
                      onChange={(e) => setAttendanceFilters({ ...attendanceFilters, dateTo: e.target.value })}
                      className="glass-card border-border/50 border-border/50 text-white h-9"
                    />
                  </div>
                </div>
              </div>
              {/* Break Violations Warning */}
              {breakViolations.length > 0 && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-red-500 font-semibold">Break Time Violations</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You have {breakViolations.length} break time violation(s). 
                        Maximum allowed break time is 1 hour per day. Penalties may be applied.
                      </p>
                      <div className="mt-2 space-y-1">
                        {breakViolations.slice(0, 3).map((v) => (
                          <p key={v.id} className="text-xs text-red-400">
                            {format(new Date(v.date), 'MMM dd, yyyy')}: 
                            {' '}{v.break_duration_minutes} minutes (excess: {v.excess_minutes} min)
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {filteredAttendance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance records found
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAttendance.map((record) => {
                    const isAdminRegularized = record.status === 'regularized' && record.notes?.includes('Admin regularization');
                    const isAbsent = record.status === 'absent' || record.status === 'absent_lop';
                    
                    return (
                    <div
                      key={record.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border",
                        isAdminRegularized 
                          ? "bg-purple-500/10 border-purple-500/30" 
                          : isAbsent
                          ? "bg-red-500/10 border-red-500/30"
                          : "glass-card border-border/50 border-border/40"
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-primary border-primary/40">
                            {format(new Date(record.date), 'MMM dd, yyyy')}
                          </Badge>
                          {isAdminRegularized && (
                            <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Admin Regularized
                            </Badge>
                          )}
                          {isAbsent && (
                            <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50">
                              <XCircle className="h-3 w-3 mr-1" />
                              Absent
                            </Badge>
                          )}
                          {record.break_duration_minutes > 60 && (
                            <Badge variant="outline" className="text-red-500 border-red-500 animate-pulse">
                              Break Violation
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Clock In</p>
                            <p className="text-white">
                              {record.clock_in ? format(new Date(record.clock_in), 'hh:mm a') : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Clock Out</p>
                            <p className="text-white">
                              {record.clock_out ? format(new Date(record.clock_out), 'hh:mm a') : record.clock_in ? 'In Progress' : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Break Time</p>
                            <p className={`font-semibold ${record.break_duration_minutes > 60 ? 'text-red-500' : 'text-white'}`}>
                              {record.break_duration_minutes || 0} min
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Hours</p>
                            <p className="text-white">{record.total_working_hours?.toFixed(2) || '0.00'} hrs</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Earnings</p>
                            <p className="text-blue-400 font-semibold">
                              ₹{record.daily_earnings?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {activePortalTab === 'requests' && (
          <div className="space-y-4 mt-6">
          {/* Action Buttons */}
          <div className="flex gap-2 justify-end flex-wrap">
            <Button
              onClick={() => setShowRegularizationRequest(true)}
              variant="outline"
              className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white"
              size="sm"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Regularize
            </Button>
            <Button
              onClick={() => setShowOTRequest(true)}
              variant="outline"
              className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
              size="sm"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Request OT
            </Button>
            <Button
              onClick={() => setShowDoubleShiftRequest(true)}
              variant="outline"
              className="border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white"
              size="sm"
            >
              <User className="h-4 w-4 mr-2" />
              Request Double Shift
            </Button>
            <Button
              onClick={() => setShowLeaveRequest(true)}
              className="btn-gradient border-0"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Request Leave
            </Button>
          </div>

          {/* Leave Requests */}
          <Card className="glass-card border-border/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-white">Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {leaveRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No leave requests
                </div>
              ) : (
                <div className="space-y-3">
                  {leaveRequests.map((leave) => (
                    <div
                      key={leave.id}
                      className="flex items-center justify-between p-4 rounded-lg glass-card border border-border/40"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={
                              leave.status === 'approved'
                                ? 'text-green-500 border-green-500'
                                : leave.status === 'rejected'
                                ? 'text-red-500 border-red-500'
                                : 'text-yellow-500 border-yellow-500'
                            }
                          >
                            {leave.status?.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-primary border-primary/40">
                            LEAVE
                          </Badge>
                        </div>
                        <p className="text-white">
                          {format(new Date(leave.start_date), 'MMM dd')} - {format(new Date(leave.end_date), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {leave.total_days} day{leave.total_days > 1 ? 's' : ''}
                        </p>
                        {leave.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Reason: {leave.reason}
                          </p>
                        )}
                        {leave.remarks && leave.status === 'rejected' && (
                          <p className="text-sm text-red-400 mt-1">
                            Admin note: {leave.remarks}
                          </p>
                        )}
                      </div>
                      {leave.status === 'rejected' && (
                        <Button
                          onClick={() => setDeleteLeaveId(leave.id)}
                          variant="outline"
                          size="sm"
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white ml-4"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Regularization Requests */}
          <Card className="glass-card border-border/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-white">Regularization Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {regularizationRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No regularization requests
                </div>
              ) : (
                <div className="space-y-3">
                  {regularizationRequests.map((reg) => (
                    <div
                      key={reg.id}
                      className="flex items-center justify-between p-4 rounded-lg glass-card border border-border/40"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={
                              reg.status === 'approved'
                                ? 'text-green-500 border-green-500'
                                : reg.status === 'rejected'
                                ? 'text-red-500 border-red-500'
                                : 'text-yellow-500 border-yellow-500'
                            }
                          >
                            {reg.status?.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-yellow-400 border-yellow-500">
                            REGULARIZATION
                          </Badge>
                        </div>
                        <p className="text-white">
                          {format(new Date(reg.date), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Type: {reg.regularization_type?.replace('_', ' ').toUpperCase()}
                        </p>
                        {reg.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Reason: {reg.reason}
                          </p>
                        )}
                        {reg.remarks && reg.status === 'rejected' && (
                          <p className="text-sm text-red-400 mt-1">
                            Admin note: {reg.remarks}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* OT Requests */}
          <Card className="glass-card border-border/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-white">Overtime Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {otRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No overtime requests
                </div>
              ) : (
                <div className="space-y-3">
                  {otRequests.map((ot) => (
                    <div
                      key={ot.id}
                      className="flex items-center justify-between p-4 rounded-lg glass-card border border-border/40"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={
                              ot.status === 'approved'
                                ? 'text-green-500 border-green-500'
                                : ot.status === 'rejected'
                                ? 'text-red-500 border-red-500'
                                : 'text-yellow-500 border-yellow-500'
                            }
                          >
                            {ot.status?.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-blue-400 border-blue-500">
                            OVERTIME
                          </Badge>
                        </div>
                        <p className="text-white">
                          {format(new Date(ot.date), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {ot.overtime_hours} hours • ₹{ot.overtime_amount || 100}
                        </p>
                        {ot.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Reason: {ot.reason}
                          </p>
                        )}
                        {ot.remarks && ot.status === 'rejected' && (
                          <p className="text-sm text-red-400 mt-1">
                            Admin note: {ot.remarks}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Double Shift Requests */}
          <Card className="glass-card border-border/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-white">Double Shift Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {doubleShiftRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No double shift requests
                </div>
              ) : (
                <div className="space-y-3">
                  {doubleShiftRequests.map((ds) => {
                    const coveredStaff = allStaffProfiles.find(s => s.user_id === ds.covered_staff_id);
                    return (
                      <div
                        key={ds.id}
                        className="flex items-center justify-between p-4 rounded-lg glass-card border border-border/40"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant="outline"
                              className={
                                ds.status === 'approved'
                                  ? 'text-green-500 border-green-500'
                                  : ds.status === 'rejected'
                                  ? 'text-red-500 border-red-500'
                                  : 'text-yellow-500 border-yellow-500'
                              }
                            >
                              {ds.status?.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-purple-400 border-purple-500">
                              DOUBLE SHIFT
                            </Badge>
                          </div>
                          <p className="text-white">
                            {format(new Date(ds.date), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Covering for:{' '}
                            <span className="text-white">{coveredStaff ? staffDisplayName(coveredStaff) : 'Unknown'}</span>
                            {coveredStaff && staffSecondaryUsername(coveredStaff) && (
                              <span className="block text-xs">{staffSecondaryUsername(coveredStaff)}</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {ds.total_hours} hours • ₹{ds.allowance_amount?.toFixed(2) || '0.00'}
                          </p>
                          {ds.reason && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Reason: {ds.reason}
                            </p>
                          )}
                          {ds.remarks && ds.status === 'rejected' && (
                            <p className="text-sm text-red-400 mt-1">
                              Admin note: {ds.remarks}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {activePortalTab === 'payslips' && (
          <div className="space-y-4 mt-6">
          <Card className="glass-card border-border/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-white">Payslips</CardTitle>
            </CardHeader>
            <CardContent>
              {payslips.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payslips available
                </div>
              ) : (
                <div className="space-y-3">
                  {payslips.map((payslip) => (
                    <div
                      key={payslip.payroll_id}
                      className="flex items-center justify-between p-4 rounded-lg glass-card border border-border/40"
                    >
                      <div>
                        <p className="text-white font-semibold">
                          {format(new Date(payslip.year, payslip.month - 1), 'MMMM yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payslip.total_working_days} days • {payslip.total_working_hours?.toFixed(1)} hours
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold text-white">
                            ₹{payslip.net_salary?.toFixed(2)}
                          </p>
                          <Badge
                            variant={String(payslip.payment_status || '').toLowerCase() === 'paid' ? 'default' : 'secondary'}
                            className={String(payslip.payment_status || '').toLowerCase() === 'paid' ? 'bg-green-500' : ''}
                          >
                            {payslip.payment_status?.toUpperCase()}
                          </Badge>
                        </div>
                        <Button
                          onClick={() => handleDownloadPayslip(payslip)}
                          variant="outline"
                          size="sm"
                          className="border-border/50"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}
      </div>

      {/* Leave Request Dialog */}
      <LeaveRequestDialog
        open={showLeaveRequest}
        onOpenChange={setShowLeaveRequest}
        staffId={selectedStaff?.user_id}
        leaveBalance={leaveBalance}
        onSuccess={fetchStaffData}
      />

      {/* Regularization Request Dialog */}
      <RegularizationRequestDialog
        open={showRegularizationRequest}
        onOpenChange={setShowRegularizationRequest}
        staffId={selectedStaff?.user_id}
        onSuccess={fetchStaffData}
      />

      {/* Overtime Request Dialog */}
      <OvertimeRequestDialog
        open={showOTRequest}
        onOpenChange={setShowOTRequest}
        staffId={selectedStaff?.user_id}
        onSuccess={fetchStaffData}
      />

      {/* Double Shift Request Dialog */}
      <DoubleShiftRequestDialog
        open={showDoubleShiftRequest}
        onOpenChange={setShowDoubleShiftRequest}
        staffId={selectedStaff?.user_id}
        staffProfiles={allStaffProfiles}
        onSuccess={fetchStaffData}
      />

      {/* Delete Leave Confirmation */}
      <AlertDialog open={!!deleteLeaveId} onOpenChange={() => setDeleteLeaveId(null)}>
        <AlertDialogContent className="glass-card border-border/50 border-border/50 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leave Request?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete this rejected leave request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/50">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLeave}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalShell>
  );
};

export default StaffPortalContent;
