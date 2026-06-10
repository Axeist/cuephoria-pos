import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useStaffHR } from '@/context/StaffHRContext';
import StaffEmptyState from '@/components/staff/shared/StaffEmptyState';
import { syncMissingRostersFromProfiles } from '@/services/staff/staffApi';
import {
  ROSTER_WEEK_DAYS,
  buildWeeklyScheduleFromProfile,
  formatShiftRange,
  mergeSchedulesWithProfileDefaults,
  normalizeShiftTime,
  toDbShiftTime,
  type RosterScheduleRow,
} from '@/utils/staffRoster';
import { CalendarDays, RefreshCw, Save } from 'lucide-react';

const ShiftRosterPanel: React.FC = () => {
  const { toast } = useToast();
  const { profiles, isLoading, staffScope, refresh } = useStaffHR();
  const [schedules, setSchedules] = useState<RosterScheduleRow[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const activeProfiles = useMemo(
    () => profiles.filter((p) => p.is_active),
    [profiles],
  );
  const staffIds = useMemo(
    () => activeProfiles.map((p) => p.user_id),
    [activeProfiles],
  );

  const loadSchedules = useCallback(async () => {
    if (!staffIds.length) {
      setSchedules([]);
      return;
    }
    setLoadingSchedules(true);
    try {
      const { data, error } = await supabase
        .from('staff_work_schedules')
        .select('*')
        .in('staff_id', staffIds);
      if (error) throw error;
      const stored = (data ?? []) as RosterScheduleRow[];
      setSchedules(mergeSchedulesWithProfileDefaults(stored, activeProfiles));
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load schedules', variant: 'destructive' });
    } finally {
      setLoadingSchedules(false);
    }
  }, [staffIds.join(','), activeProfiles, toast]);

  const autoSyncFromProfiles = useCallback(async () => {
    if (!staffScope?.locationId || !activeProfiles.length) return;
    setSyncing(true);
    try {
      const added = await syncMissingRostersFromProfiles(activeProfiles, staffScope.locationId);
      if (added > 0) {
        await loadSchedules();
        toast({
          title: 'Roster applied',
          description: `Default shifts from staff profiles applied (${added} day slots).`,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  }, [staffScope?.locationId, activeProfiles, loadSchedules, toast]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  useEffect(() => {
    void autoSyncFromProfiles();
  }, [autoSyncFromProfiles]);

  const getSchedule = (staffId: string, day: number) =>
    schedules.find((s) => s.staff_id === staffId && s.day_of_week === day);

  const updateLocal = (staffId: string, day: number, field: 'shift_start' | 'shift_end', value: string) => {
    setSchedules((prev) => {
      const existing = prev.find((s) => s.staff_id === staffId && s.day_of_week === day);
      if (existing) {
        return prev.map((s) =>
          s.staff_id === staffId && s.day_of_week === day ? { ...s, [field]: value } : s,
        );
      }
      const staff = activeProfiles.find((p) => p.user_id === staffId);
      return [
        ...prev,
        {
          staff_id: staffId,
          day_of_week: day,
          shift_start: field === 'shift_start' ? value : normalizeShiftTime(staff?.shift_start_time),
          shift_end: field === 'shift_end' ? value : normalizeShiftTime(staff?.shift_end_time, '23:00'),
          is_active: true,
        },
      ];
    });
  };

  const applyProfileToStaff = (staffId: string) => {
    const staff = activeProfiles.find((p) => p.user_id === staffId);
    if (!staff) return;
    const defaults = buildWeeklyScheduleFromProfile(staff);
    setSchedules((prev) => [
      ...prev.filter((s) => s.staff_id !== staffId),
      ...defaults,
    ]);
  };

  const handleSave = async () => {
    if (!staffScope?.locationId) return;
    setSaving(true);
    try {
      for (const staff of activeProfiles) {
        for (let day = 0; day < 7; day++) {
          const row = getSchedule(staff.user_id, day);
          if (!row?.shift_start || !row?.shift_end) continue;
          const payload = {
            staff_id: row.staff_id,
            day_of_week: row.day_of_week,
            shift_start: toDbShiftTime(row.shift_start),
            shift_end: toDbShiftTime(row.shift_end),
            is_active: row.is_active !== false,
            location_id: staffScope.locationId,
          };
          if (row.id) {
            const { error } = await supabase.from('staff_work_schedules').update(payload).eq('id', row.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('staff_work_schedules').insert(payload);
            if (error) throw error;
          }
        }
      }
      toast({ title: 'Saved', description: 'Shift roster updated.' });
      await loadSchedules();
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loadingSchedules || syncing) {
    return <StaffEmptyState loading />;
  }

  if (!activeProfiles.length) {
    return (
      <StaffEmptyState
        title="No active staff"
        description="Add staff in Settings → Team, then configure their shifts here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-xl">
          Weekly shifts are seeded from each staff member&apos;s profile shift times (set at creation or in
          Directory → Edit). Adjust individual days below if needed.
        </p>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="border-border/50"
            onClick={() => void autoSyncFromProfiles()}
            disabled={syncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Apply profile shifts
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm" className="btn-gradient border-0">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving…' : 'Save roster'}
          </Button>
        </div>
      </div>

      <Card className="glass-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Weekly roster
          </CardTitle>
          <CardDescription className="text-sm">
            {activeProfiles.length} staff · tap Reset to restore profile default for one person
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-sm min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground text-left">
                <th className="py-2 pr-3 font-medium text-xs sticky left-0 bg-card/80 backdrop-blur-sm min-w-[140px]">
                  Staff
                </th>
                {ROSTER_WEEK_DAYS.map((d) => (
                  <th key={d} className="py-2 px-1 font-medium text-xs text-center w-[88px]">
                    {d}
                  </th>
                ))}
                <th className="py-2 pl-2 font-medium text-xs w-[72px]" />
              </tr>
            </thead>
            <tbody>
              {activeProfiles.map((staff) => (
                <tr key={staff.user_id} className="border-b border-border/30">
                  <td className="py-2 pr-3 sticky left-0 bg-card/80 backdrop-blur-sm">
                    <p className="text-sm font-medium text-foreground truncate max-w-[130px]">
                      {staff.full_name || staff.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatShiftRange(staff.shift_start_time, staff.shift_end_time)}
                    </p>
                  </td>
                  {ROSTER_WEEK_DAYS.map((_, day) => {
                    const row = getSchedule(staff.user_id, day);
                    const start = normalizeShiftTime(row?.shift_start ?? staff.shift_start_time);
                    const end = normalizeShiftTime(row?.shift_end ?? staff.shift_end_time, '23:00');
                    return (
                      <td key={day} className="py-1.5 px-0.5 align-top">
                        <div className="flex flex-col gap-0.5">
                          <input
                            type="time"
                            aria-label={`${staff.username} ${ROSTER_WEEK_DAYS[day]} start`}
                            className="theme-menu-trigger w-full text-xs px-1.5 py-1 rounded-md h-8"
                            value={start}
                            onChange={(e) => updateLocal(staff.user_id, day, 'shift_start', e.target.value)}
                          />
                          <input
                            type="time"
                            aria-label={`${staff.username} ${ROSTER_WEEK_DAYS[day]} end`}
                            className="theme-menu-trigger w-full text-xs px-1.5 py-1 rounded-md h-8"
                            value={end}
                            onChange={(e) => updateLocal(staff.user_id, day, 'shift_end', e.target.value)}
                          />
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-2 pl-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => applyProfileToStaff(staff.user_id)}
                    >
                      Reset
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftRosterPanel;
