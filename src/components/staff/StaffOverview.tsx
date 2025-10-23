// src/components/staff/StaffOverview.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';

interface StaffOverviewProps {
  staffProfiles: any[];
  activeShifts: any[];
  pendingLeaves: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

const StaffOverview: React.FC<StaffOverviewProps> = ({
  staffProfiles,
  activeShifts,
  pendingLeaves,
  isLoading,
  onRefresh
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Shifts Today */}
      <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-500" />
                Active Shifts Today
              </CardTitle>
              <CardDescription>Currently clocked in staff members</CardDescription>
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
          {activeShifts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active shifts at the moment
            </div>
          ) : (
            <div className="space-y-3">
              {activeShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-cuephoria-darker border border-cuephoria-purple/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-cuephoria-purple/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-cuephoria-lightpurple">
                        {shift.staff_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white">{shift.staff_name}</p>
                      <p className="text-sm text-muted-foreground">{shift.designation}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white">
                      Clocked in: {format(new Date(shift.clock_in), 'hh:mm a')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {shift.hours_so_far?.toFixed(1)} hours so far
                    </p>
                    {shift.break_start_time && !shift.break_end_time && (
                      <Badge variant="outline" className="mt-1 text-yellow-500 border-yellow-500">
                        On Break
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Leave Requests */}
      <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-yellow-500" />
            Pending Leave Requests
          </CardTitle>
          <CardDescription>Requests awaiting approval</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingLeaves.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending leave requests
            </div>
          ) : (
            <div className="space-y-3">
              {pendingLeaves.map((leave) => (
                <div
                  key={leave.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-cuephoria-darker border border-cuephoria-purple/10"
                >
                  <div>
                    <p className="font-medium text-white">{leave.staff_name}</p>
                    <p className="text-sm text-muted-foreground">{leave.designation}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(leave.start_date), 'MMM dd')} - {format(new Date(leave.end_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                      {leave.leave_type?.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {leave.total_days} day{leave.total_days > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staff Performance Summary */}
      <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cuephoria-blue" />
            Staff Summary
          </CardTitle>
          <CardDescription>Active staff members overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {staffProfiles
              .filter(s => s.is_active)
              .slice(0, 6)
              .map((staff) => (
                <div
                  key={staff.user_id}
                  className="p-4 rounded-lg bg-cuephoria-darker border border-cuephoria-purple/10"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-cuephoria-purple/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-cuephoria-lightpurple">
                        {staff.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white">{staff.username}</p>
                      <p className="text-xs text-muted-foreground">{staff.designation}</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Salary: ₹{staff.monthly_salary?.toLocaleString()}/mo</p>
                    <p>Joined: {format(new Date(staff.created_at), 'MMM yyyy')}</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffOverview;
