import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useStaffHR } from '@/context/StaffHRContext';
import StaffEmptyState from '@/components/staff/shared/StaffEmptyState';
import { fetchAuditLog } from '@/services/staff/staffApi';
import type { StaffAuditEntry } from '@/types/staff.types';
import { buildActivitySummary } from '@/constants/staffActivityLabels';
import { History, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { staffDisplayName } from '@/services/staff/staffMappers';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All activity' },
  { value: 'payments', label: 'Payments' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'stock', label: 'Stock' },
  { value: 'bookings', label: 'Bookings' },
  { value: 'members', label: 'Members' },
  { value: 'pin', label: 'PIN checks' },
  { value: 'hr', label: 'HR & payroll' },
] as const;

function entrySummary(entry: StaffAuditEntry): string {
  if (entry.summary?.trim()) return entry.summary.trim();
  const payload = entry.payload ?? {};
  const context = (payload.context as Record<string, unknown>) ?? {};
  const outcome = payload.outcome as 'success' | 'failed' | 'bypass' | undefined;
  return buildActivitySummary(entry.action, context as Record<string, string | number | boolean | null | undefined>, outcome);
}

function categoryLabel(category: string | null | undefined): string {
  const match = CATEGORY_OPTIONS.find((c) => c.value === category);
  return match?.label ?? (category ? category.replace(/_/g, ' ') : 'Activity');
}

const StaffAuditPanel: React.FC = () => {
  const { toast } = useToast();
  const { staffScope, profiles, isLoading } = useStaffHR();
  const [entries, setEntries] = useState<StaffAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    if (!staffScope) return;
    setLoading(true);
    try {
      setEntries(
        await fetchAuditLog(staffScope, {
          limit: 200,
          staffId: staffFilter === 'all' ? null : staffFilter,
          category: categoryFilter === 'all' ? null : categoryFilter,
          dateFrom: dateFrom ? `${dateFrom}T00:00:00.000Z` : null,
          dateTo: dateTo ? `${dateTo}T23:59:59.999Z` : null,
        }),
      );
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load activity log', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [staffScope, staffFilter, categoryFilter, dateFrom, dateTo, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const staffOptions = useMemo(
    () =>
      [...profiles]
        .filter((p) => p.is_active)
        .sort((a, b) => staffDisplayName(a).localeCompare(staffDisplayName(b))),
    [profiles],
  );

  if (isLoading || loading) return <StaffEmptyState loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Staff activity log
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Plain-English record of payments, stock changes, bookings, and PIN checks
          </p>
        </div>
        <Button variant="outline" className="border-border/50" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card className="glass-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Staff member</Label>
            <Select value={staffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                {staffOptions.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {staffDisplayName(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Activity type</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-from">From date</Label>
            <Input
              id="audit-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-to">To date</Label>
            <Input
              id="audit-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {entries.length === 0 ? (
        <StaffEmptyState
          title="No activity yet"
          description="Staff actions will appear here once logged."
        />
      ) : (
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base text-white">{entries.length} events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.map((e) => {
              const outcome = (e.payload?.outcome as string) ?? 'success';
              return (
                <div
                  key={e.id}
                  className="rounded-xl border border-border/40 bg-card/20 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-start gap-2 justify-between">
                    <p className="text-sm text-foreground leading-relaxed flex-1 min-w-0">
                      {entrySummary(e)}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(e.created_at), 'MMM d, yyyy · h:mm a')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-primary/40 text-primary capitalize">
                      {categoryLabel(e.category)}
                    </Badge>
                    {(e.actor_name || e.actor_staff_id) && (
                      <span className="text-xs text-muted-foreground">
                        {e.actor_name ?? 'Staff'}
                      </span>
                    )}
                    {outcome === 'failed' && (
                      <Badge variant="destructive" className="text-[10px]">
                        Failed
                      </Badge>
                    )}
                    {outcome === 'bypass' && (
                      <Badge variant="secondary" className="text-[10px]">
                        Owner bypass
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StaffAuditPanel;
