import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useStaffHR } from '@/context/StaffHRContext';
import StaffEmptyState from '@/components/staff/shared/StaffEmptyState';
import { CalendarDays, Save } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type ScheduleRow = {
  id?: string;
  staff_id: string;
  day_of_week: number;
  shift_start: string;
  shift_end: string;
  is_active: boolean;
};

const ShiftRosterPanel: React.FC = () => {
  const { toast } = useToast();
  const { profiles, isLoading, staffScope, refresh } = useStaffHR();
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [saving, setSaving] = useState(false);

  const staffIds = profiles.filter((p) => p.is_active).map((p) => p.user_id);

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
      setSchedules((data ?? []) as ScheduleRow[]);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load schedules', variant: 'destructive' });
    } finally {
      setLoadingSchedules(false);
    }
  }, [staffIds.join(','), toast]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

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
      const staff = profiles.find((p) => p.user_id === staffId);
      return [
        ...prev,
        {
          staff_id: staffId,
          day_of_week: day,
          shift_start: field === 'shift_start' ? value : staff?.shift_start_time?.substring(0, 5) ?? '11:00',
          shift_end: field === 'shift_end' ? value : staff?.shift_end_time?.substring(0, 5) ?? '23:00',
          is_active: true,
        },
      ];
    });
  };

  const handleSave = async () => {
    if (!staffScope) return;
    setSaving(true);
    try {
      for (const row of schedules) {
        if (!row.shift_start || !row.shift_end) continue;
        const payload = {
          staff_id: row.staff_id,
          day_of_week: row.day_of_week,
          shift_start: row.shift_start.length === 5 ? `${row.shift_start}:00` : row.shift_start,
          shift_end: row.shift_end.length === 5 ? `${row.shift_end}:00` : row.shift_end,
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

  if (isLoading || loadingSchedules) {
    return <StaffEmptyState loading />;
  }

  const activeProfiles = profiles.filter((p) => p.is_active);

  if (!activeProfiles.length) {
    return (
      <StaffEmptyState
        title="No active staff"
        description="Add staff in Settings → Team, then configure their shifts here."
      />
    );
  }

  return (
    <Card className="glass-card border-white/10">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-white flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Weekly Shift Roster
          </CardTitle>
          <CardDescription>Set per-day shift windows for each team member.</CardDescription>
        </div>
        <Button onClick={handleSave} disabled={saving} className="btn-gradient border-0 shrink-0">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving…' : 'Save roster'}
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-border/50 text-muted-foreground text-left">
              <th className="py-2 pr-4 font-medium">Staff</th>
              {DAYS.map((d, i) => (
                <th key={d} className="py-2 px-1 font-medium text-center w-[100px]">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeProfiles.map((staff) => (
              <tr key={staff.user_id} className="border-b border-border/30">
                <td className="py-3 pr-4 text-white font-medium">{staff.full_name || staff.username}</td>
                {DAYS.map((_, day) => {
                  const row = getSchedule(staff.user_id, day);
                  return (
                    <td key={day} className="py-2 px-1">
                      <div className="flex flex-col gap-1">
                        <input
                          type="time"
                          className="theme-menu-trigger w-full text-[10px] px-1 py-1 rounded"
                          value={(row?.shift_start ?? staff.shift_start_time ?? '11:00').substring(0, 5)}
                          onChange={(e) => updateLocal(staff.user_id, day, 'shift_start', e.target.value)}
                        />
                        <input
                          type="time"
                          className="theme-menu-trigger w-full text-[10px] px-1 py-1 rounded"
                          value={(row?.shift_end ?? staff.shift_end_time ?? '23:00').substring(0, 5)}
                          onChange={(e) => updateLocal(staff.user_id, day, 'shift_end', e.target.value)}
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default ShiftRosterPanel;
