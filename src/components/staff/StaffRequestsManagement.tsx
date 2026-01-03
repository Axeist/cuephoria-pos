// src/components/staff/StaffRequestsManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Calendar, FileText, TrendingUp, User, Clock, DollarSign, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeaveManagement from '@/components/staff/LeaveManagement';
import RegularizationManagement from '@/components/staff/RegularizationManagement';
import OvertimeManagement from '@/components/staff/OvertimeManagement';
import DoubleShiftManagement from '@/components/staff/DoubleShiftManagement';

interface StaffRequestsManagementProps {
  staffProfiles: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

const StaffRequestsManagement: React.FC<StaffRequestsManagementProps> = ({
  staffProfiles,
  isLoading,
  onRefresh
}) => {
  const { toast } = useToast();
  const [summaryStats, setSummaryStats] = useState({
    pendingLeaves: 0,
    pendingRegularizations: 0,
    pendingOT: 0,
    pendingDoubleShift: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);

  useEffect(() => {
    fetchSummaryStats();
  }, []);

  useEffect(() => {
    // Refresh stats when component refreshes
    fetchSummaryStats();
  }, [staffProfiles]);

  const fetchSummaryStats = async () => {
    setIsLoadingStats(true);
    try {
      // Fetch pending leaves (both count and data)
      const { data: leavesData, count: leavesCount } = await supabase
        .from('pending_leaves_view')
        .select('*', { count: 'exact' });

      // Fetch pending regularizations count
      const { count: regCount } = await supabase
        .from('pending_regularization_view')
        .select('*', { count: 'exact', head: true });

      // Fetch pending OT requests count
      const { count: otCount } = await supabase
        .from('pending_ot_requests_view')
        .select('*', { count: 'exact', head: true });

      // Fetch pending double shift requests count
      const { count: dsCount } = await supabase
        .from('pending_double_shift_requests_view')
        .select('*', { count: 'exact', head: true });

      setPendingLeaves(leavesData || []);
      setSummaryStats({
        pendingLeaves: leavesCount || 0,
        pendingRegularizations: regCount || 0,
        pendingOT: otCount || 0,
        pendingDoubleShift: dsCount || 0
      });
    } catch (error: any) {
      console.error('Error fetching summary stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const totalPending = summaryStats.pendingLeaves + summaryStats.pendingRegularizations + 
                       summaryStats.pendingOT + summaryStats.pendingDoubleShift;

  return (
    <div className="space-y-4">
      {/* Summary Widgets */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Pending Leaves</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {isLoadingStats ? '...' : summaryStats.pendingLeaves}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Pending Regularizations</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {isLoadingStats ? '...' : summaryStats.pendingRegularizations}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Pending Overtime</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {isLoadingStats ? '...' : summaryStats.pendingOT}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Pending Double Shift</CardTitle>
            <User className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {isLoadingStats ? '...' : summaryStats.pendingDoubleShift}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Total Pending Alert */}
      {totalPending > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <p className="text-yellow-500 font-semibold">
                {totalPending} total request{totalPending > 1 ? 's' : ''} pending approval
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Management Tabs */}
      <Tabs defaultValue="leaves" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-cuephoria-dark border border-cuephoria-purple/20">
          <TabsTrigger value="leaves">
            <Calendar className="h-4 w-4 mr-2" />
            Leaves
          </TabsTrigger>
          <TabsTrigger value="regularization">
            <FileText className="h-4 w-4 mr-2" />
            Regularization
          </TabsTrigger>
          <TabsTrigger value="overtime">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overtime
          </TabsTrigger>
          <TabsTrigger value="double-shift">
            <User className="h-4 w-4 mr-2" />
            Double Shift
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaves" className="space-y-4 mt-6">
          <LeaveManagement
            staffProfiles={staffProfiles}
            pendingLeaves={pendingLeaves}
            isLoading={isLoading}
            onRefresh={async () => {
              await fetchSummaryStats();
              onRefresh();
            }}
          />
        </TabsContent>

        <TabsContent value="regularization" className="space-y-4 mt-6">
          <RegularizationManagement
            staffProfiles={staffProfiles || []}
            isLoading={isLoading}
            onRefresh={() => {
              fetchSummaryStats();
              onRefresh();
            }}
          />
        </TabsContent>

        <TabsContent value="overtime" className="space-y-4 mt-6">
          <OvertimeManagement
            staffProfiles={staffProfiles || []}
            isLoading={isLoading}
            onRefresh={() => {
              fetchSummaryStats();
              onRefresh();
            }}
          />
        </TabsContent>

        <TabsContent value="double-shift" className="space-y-4 mt-6">
          <DoubleShiftManagement
            staffProfiles={staffProfiles || []}
            isLoading={isLoading}
            onRefresh={() => {
              fetchSummaryStats();
              onRefresh();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffRequestsManagement;

