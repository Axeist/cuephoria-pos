// src/components/staff/LateLoginOTWidgets.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, TrendingUp, Clock } from 'lucide-react';

interface LateLoginOTWidgetsProps {
  staffProfiles: any[];
}

const LateLoginOTWidgets: React.FC<LateLoginOTWidgetsProps> = ({
  staffProfiles
}) => {
  const { toast } = useToast();
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSummaryData();
  }, [staffProfiles]);

  const fetchSummaryData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_attendance_summary')
        .select('*')
        .order('late_logins_this_month', { ascending: false });

      if (error) throw error;
      setSummaryData(data || []);
    } catch (error: any) {
      console.error('Error fetching summary:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attendance summary',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin h-6 w-6 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Late Logins Widget */}
      <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Late Logins This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {summaryData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No late logins recorded</p>
            ) : (
              summaryData
                .filter(s => s.late_logins_this_month > 0)
                .map((staff) => (
                  <div
                    key={staff.user_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-cuephoria-darker border border-cuephoria-purple/10"
                  >
                    <div>
                      <p className="text-white font-medium">{staff.username}</p>
                      <p className="text-xs text-muted-foreground">{staff.designation}</p>
                    </div>
                    <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {staff.late_logins_this_month} times
                    </Badge>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overtime Widget */}
      <Card className="bg-cuephoria-dark border-cuephoria-purple/20">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Overtime Summary This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {summaryData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No overtime recorded</p>
            ) : (
              summaryData
                .filter(s => s.approved_ot_hours_this_month > 0 || s.pending_ot_hours_this_month > 0)
                .map((staff) => (
                  <div
                    key={staff.user_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-cuephoria-darker border border-cuephoria-purple/10"
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">{staff.username}</p>
                      <p className="text-xs text-muted-foreground">{staff.designation}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {staff.approved_ot_hours_this_month > 0 && (
                          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                            <Clock className="h-2.5 w-2.5 mr-1" />
                            {staff.approved_ot_hours_this_month.toFixed(1)}h approved
                          </Badge>
                        )}
                        {staff.pending_ot_hours_this_month > 0 && (
                          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs">
                            <Clock className="h-2.5 w-2.5 mr-1" />
                            {staff.pending_ot_hours_this_month.toFixed(1)}h pending
                          </Badge>
                        )}
                      </div>
                    </div>
                    {staff.approved_ot_amount_this_month > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-400">
                          ₹{staff.approved_ot_amount_this_month.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">OT Allowance</p>
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LateLoginOTWidgets;

