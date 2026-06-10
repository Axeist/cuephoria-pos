// src/pages/StaffManagement.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { StaffHRProvider, useStaffHR } from '@/context/StaffHRContext';
import { useOrganizationOptional } from '@/context/OrganizationContext';
import { useLocation } from '@/context/LocationContext';
import StaffLocationBanner from '@/components/staff/layout/StaffLocationBanner';
import StaffBranchScopeToggle from '@/components/staff/layout/StaffBranchScopeToggle';
import StaffStatGrid from '@/components/staff/layout/StaffStatGrid';
import StaffTabNav from '@/components/staff/layout/StaffTabNav';
import StaffOverview from '@/components/staff/StaffOverview';
import StaffDirectory from '@/components/staff/StaffDirectory';
import AttendanceManagement from '@/components/staff/AttendanceManagement';
import AttendanceCalendarView from '@/components/staff/AttendanceCalendarView';
import StaffRequestsManagement from '@/components/staff/StaffRequestsManagement';
import PayrollManagement from '@/components/staff/PayrollManagement';
import ShiftRosterPanel from '@/components/staff/shifts/ShiftRosterPanel';
import StaffReportsPanel from '@/components/staff/reports/StaffReportsPanel';
import AdminRegularizationDialog from '@/components/staff/AdminRegularizationDialog';
import StaffEmptyState from '@/components/staff/shared/StaffEmptyState';

const StaffManagementContent: React.FC = () => {
  const orgCtx = useOrganizationOptional();
  const { activeLocation } = useLocation();
  const {
    profiles,
    activeShifts,
    pendingLeaves,
    stats,
    isLoading,
    locationResolved,
    reportScope,
    setReportScope,
    activeTab,
    setActiveTab,
    refresh,
  } = useStaffHR();

  const [showAdminRegularizationDialog, setShowAdminRegularizationDialog] = useState(false);

  if (!locationResolved) {
    return (
      <div className="flex-1 p-6">
        <StaffEmptyState loading={true} />
      </div>
    );
  }

  if (!activeLocation) {
    return (
      <div className="flex-1 p-6">
        <StaffEmptyState
          title="No branch selected"
          description="Assign at least one branch to this workspace, then return here."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6 md:p-8 pt-6">
      <StaffLocationBanner
        location={activeLocation}
        organizationName={orgCtx?.organization?.name}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text font-heading">
            Staff Management
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your team, track attendance, and process payroll
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setShowAdminRegularizationDialog(true)}
            variant="outline"
            className="border-amber-400/50 text-amber-200 hover:bg-amber-500/15 hover:text-white"
          >
            Regularize Attendance
          </Button>
          <Button asChild variant="default" className="btn-gradient border-0">
            <Link to="/settings?tab=team">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Staff Member
            </Link>
          </Button>
        </div>
      </div>

      <StaffBranchScopeToggle
        scope={reportScope}
        onChange={setReportScope}
        locationName={activeLocation.name}
      />

      <StaffStatGrid stats={stats} />

      <StaffTabNav
        activeTab={activeTab}
        onChange={setActiveTab}
        pendingBadge={stats.pendingRequests}
      />

      <div className="rounded-2xl border border-border/50 bg-card/20 p-4 sm:p-6">
        {activeTab === 'overview' && (
          <StaffOverview
            staffProfiles={profiles}
            activeShifts={activeShifts}
            pendingLeaves={pendingLeaves}
            isLoading={isLoading}
            onRefresh={refresh}
          />
        )}
        {activeTab === 'directory' && (
          <StaffDirectory
            staffProfiles={profiles}
            isLoading={isLoading}
            onRefresh={refresh}
          />
        )}
        {activeTab === 'attendance' && (
          <AttendanceManagement
            staffProfiles={profiles}
            activeShifts={activeShifts}
            isLoading={isLoading}
            onRefresh={refresh}
          />
        )}
        {activeTab === 'calendar' && (
          <AttendanceCalendarView
            staffProfiles={profiles}
            isLoading={isLoading}
            onRefresh={refresh}
          />
        )}
        {activeTab === 'shifts' && <ShiftRosterPanel />}
        {activeTab === 'requests' && (
          <StaffRequestsManagement
            staffProfiles={profiles}
            isLoading={isLoading}
            onRefresh={refresh}
          />
        )}
        {activeTab === 'payroll' && (
          <PayrollManagement
            staffProfiles={profiles}
            isLoading={isLoading}
            onRefresh={refresh}
          />
        )}
        {activeTab === 'reports' && <StaffReportsPanel />}
      </div>

      <AdminRegularizationDialog
        open={showAdminRegularizationDialog}
        onOpenChange={setShowAdminRegularizationDialog}
        staffProfiles={profiles}
        onSuccess={refresh}
      />
    </div>
  );
};

const StaffManagement: React.FC = () => (
  <StaffHRProvider>
    <StaffManagementContent />
  </StaffHRProvider>
);

export default StaffManagement;
