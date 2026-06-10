import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useStaffHR } from '@/context/StaffHRContext';
import StaffEmptyState from '@/components/staff/shared/StaffEmptyState';
import { fetchAuditLog } from '@/services/staff/staffApi';
import type { StaffAuditEntry } from '@/types/staff.types';
import { History, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const StaffAuditPanel: React.FC = () => {
  const { toast } = useToast();
  const { staffScope, isLoading } = useStaffHR();
  const [entries, setEntries] = useState<StaffAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!staffScope) return;
    setLoading(true);
    try {
      setEntries(await fetchAuditLog(staffScope, 200));
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load audit log', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [staffScope, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading || loading) return <StaffEmptyState loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            HR audit trail
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Payroll locks, policy changes, and sensitive HR actions
          </p>
        </div>
        <Button variant="outline" className="border-border/50" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {entries.length === 0 ? (
        <StaffEmptyState
          title="No audit entries"
          description="HR actions will appear here once logged."
        />
      ) : (
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base text-white">{entries.length} recent events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.map((e) => (
              <div
                key={e.id}
                className="rounded-xl border border-border/40 bg-card/20 p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-primary/40 text-primary capitalize">
                      {e.action.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{e.entity_type}</span>
                    {e.entity_id && (
                      <span className="text-xs text-muted-foreground font-mono truncate max-w-[140px]">
                        {e.entity_id}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(e.created_at), 'MMM d, yyyy · h:mm a')}
                  </span>
                </div>
                {Object.keys(e.payload ?? {}).length > 0 && (
                  <pre className="text-xs text-muted-foreground overflow-x-auto rounded-lg bg-black/20 p-2 max-h-24">
                    {JSON.stringify(e.payload, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StaffAuditPanel;
