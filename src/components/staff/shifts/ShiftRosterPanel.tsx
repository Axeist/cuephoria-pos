import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useStaffHR } from '@/context/StaffHRContext';
import StaffEmptyState from '@/components/staff/shared/StaffEmptyState';
import { forceSyncRostersFromProfiles, syncMissingRostersFromProfiles, syncStalePlaceholderRosters } from '@/services/staff/staffApi';
import {
  DEFAULT_SHIFT_END,
  ROSTER_WEEK_DAYS,
  buildWeeklyScheduleFromProfile,
  formatShiftRangeCompact,
  mapStoredScheduleRow,
  mergeSchedulesWithProfileDefaults,
  normalizeShiftTime,
  toDbShiftTime,
  type RosterScheduleRow,
} from '@/utils/staffRoster';
import { CalendarDays, Clock, RefreshCw, Save } from 'lucide-react';
import StaffProfileLabel from '@/components/staff/shared/StaffProfileLabel';
import { staffDisplayName } from '@/services/staff/staffMappers';
import { cn } from '@/lib/utils';
import type { StaffProfile } from '@/types/staff.types';

type DayShiftCellProps = {
  label: string;
  staffName: string;
  start: string;
  end: string;
  customized: boolean;
  onChange: (start: string, end: string) => void;
};

const DayShiftCell: React.FC<DayShiftCellProps> = ({
  label,
  staffName,
  start,
  end,
  customized,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);

  useEffect(() => {
    if (open) {
      setDraftStart(start);
      setDraftEnd(end);
    }
  }, [open, start, end]);

  const apply = () => {
    onChange(draftStart, draftEnd);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${staffName} ${label} shift`}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-2 min-h-[52px] w-full transition-colors',
            'hover:border-primary/40 hover:bg-primary/5',
            customized
              ? 'border-primary/30 bg-primary/10'
              : 'border-border/40 bg-muted/20',
          )}
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className="text-[11px] font-medium leading-tight text-foreground text-center">
            {formatShiftRangeCompact(start, end)}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="center">
        <p className="text-xs font-medium text-foreground mb-3">{label} shift</p>
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-[11px] text-muted-foreground">Start</span>
            <Input
              type="time"
              value={draftStart}
              onChange={(e) => setDraftStart(e.target.value)}
              className="h-9 glass-card border-border/50"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-muted-foreground">End</span>
            <Input
              type="time"
              value={draftEnd}
              onChange={(e) => setDraftEnd(e.target.value)}
              className="h-9 glass-card border-border/50"
            />
          </label>
        </div>
        <Button size="sm" className="w-full mt-3 h-8" onClick={apply}>
          Apply
        </Button>
      </PopoverContent>
    </Popover>
  );
};

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
      const stored = (data ?? []).map((row) =>
        mapStoredScheduleRow(row as Record<string, unknown>),
      );
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
      const fixed = await syncStalePlaceholderRosters(activeProfiles, staffScope.locationId);
      if (added > 0 || fixed > 0) {
        await loadSchedules();
        if (fixed > 0) {
          toast({
            title: 'Roster updated',
            description: 'Placeholder shifts were replaced with profile shift times.',
          });
        } else if (added > 0) {
          toast({
            title: 'Roster applied',
            description: `Default shifts from staff profiles applied (${added} day slots).`,
          });
        }
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

  const profileShift = (staff: StaffProfile) => ({
    start: normalizeShiftTime(staff.shift_start_time),
    end: normalizeShiftTime(staff.shift_end_time, DEFAULT_SHIFT_END),
  });

  const upsertLocalRow = (
    staffId: string,
    day: number,
    shift_start: string,
    shift_end: string,
  ) => {
    setSchedules((prev) => {
      const existing = prev.find((s) => s.staff_id === staffId && s.day_of_week === day);
      if (existing) {
        return prev.map((s) =>
          s.staff_id === staffId && s.day_of_week === day
            ? { ...s, shift_start, shift_end }
            : s,
        );
      }
      return [
        ...prev,
        { staff_id: staffId, day_of_week: day, shift_start, shift_end, is_active: true },
      ];
    });
  };

  const updateDay = (staffId: string, day: number, start: string, end: string) => {
    upsertLocalRow(staffId, day, start, end);
  };

  const applyToAllDays = (staffId: string, start: string, end: string) => {
    setSchedules((prev) => {
      const rest = prev.filter((s) => s.staff_id !== staffId);
      const existingByDay = new Map(
        prev.filter((s) => s.staff_id === staffId).map((s) => [s.day_of_week, s]),
      );
      const rows = ROSTER_WEEK_DAYS.map((_, day) => {
        const existing = existingByDay.get(day);
        return {
          id: existing?.id,
          staff_id: staffId,
          day_of_week: day,
          shift_start: start,
          shift_end: end,
          is_active: true,
        };
      });
      return [...rest, ...rows];
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

  const handleApplyProfileShifts = async () => {
    if (!staffScope?.locationId) return;
    setSyncing(true);
    try {
      const written = await forceSyncRostersFromProfiles(activeProfiles, staffScope.locationId);
      await loadSchedules();
      toast({
        title: 'Profile shifts applied',
        description:
          written > 0
            ? `Updated weekly roster for ${activeProfiles.length} staff member(s).`
            : 'All rosters already match profile shift times.',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Sync failed';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
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
          Set each staff member&apos;s default weekly shift. Tap a day to customize it, or use
          &ldquo;Apply profile shifts&rdquo; to reset all days from Directory → Edit.
        </p>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="border-border/50"
            onClick={() => void handleApplyProfileShifts()}
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
            {activeProfiles.length} staff · highlighted days differ from the default shift
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeProfiles.map((staff) => {
            const { start: profileStart, end: profileEnd } = profileShift(staff);

            const dayShifts = ROSTER_WEEK_DAYS.map((_, day) => {
              const row = getSchedule(staff.user_id, day);
              return {
                start: normalizeShiftTime(row?.shift_start ?? profileStart),
                end: normalizeShiftTime(row?.shift_end ?? profileEnd, DEFAULT_SHIFT_END),
              };
            });
            const allSame = dayShifts.every(
              (d) => d.start === dayShifts[0].start && d.end === dayShifts[0].end,
            );
            const weekStart = allSame ? dayShifts[0].start : profileStart;
            const weekEnd = allSame ? dayShifts[0].end : profileEnd;

            return (
              <div
                key={staff.user_id}
                className="rounded-xl border border-border/40 bg-background/40 p-4 space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <StaffProfileLabel
                      staff={staff}
                      nameClassName="text-sm font-medium text-foreground"
                      subClassName="text-xs text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Profile default: {formatShiftRangeCompact(profileStart, profileEnd)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                      <Input
                        type="time"
                        aria-label={`${staffDisplayName(staff)} default start`}
                        value={weekStart}
                        onChange={(e) => applyToAllDays(staff.user_id, e.target.value, weekEnd)}
                        className="h-9 w-[118px] glass-card border-border/50 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input
                        type="time"
                        aria-label={`${staffDisplayName(staff)} default end`}
                        value={weekEnd}
                        onChange={(e) => applyToAllDays(staff.user_id, weekStart, e.target.value)}
                        className="h-9 w-[118px] glass-card border-border/50 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-9 px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => applyProfileToStaff(staff.user_id)}
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {ROSTER_WEEK_DAYS.map((label, day) => {
                    const { start, end } = dayShifts[day];
                    const customized = start !== profileStart || end !== profileEnd;

                    return (
                      <DayShiftCell
                        key={day}
                        label={label}
                        staffName={staffDisplayName(staff)}
                        start={start}
                        end={end}
                        customized={customized}
                        onChange={(s, e) => updateDay(staff.user_id, day, s, e)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftRosterPanel;
