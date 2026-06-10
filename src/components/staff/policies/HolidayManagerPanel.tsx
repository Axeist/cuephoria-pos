import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useStaffHR } from '@/context/StaffHRContext';
import StaffEmptyState from '@/components/staff/shared/StaffEmptyState';
import { deleteHoliday, fetchHolidays, upsertHoliday } from '@/services/staff/staffApi';
import type { StaffHoliday } from '@/types/staff.types';
import { CalendarDays, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const HolidayManagerPanel: React.FC = () => {
  const { toast } = useToast();
  const { staffScope, isLoading } = useStaffHR();
  const year = new Date().getFullYear();
  const [holidays, setHolidays] = useState<StaffHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ date: '', name: '', is_paid: true });

  const load = useCallback(async () => {
    if (!staffScope) return;
    setLoading(true);
    try {
      setHolidays(await fetchHolidays(staffScope, year));
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load holidays', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [staffScope, year, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm({ date: '', name: '', is_paid: true });
    setDialogOpen(true);
  };

  const openEdit = (h: StaffHoliday) => {
    setEditId(h.id);
    setForm({ date: h.date, name: h.name, is_paid: h.is_paid });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!staffScope || !form.date || !form.name.trim()) {
      toast({ title: 'Validation', description: 'Date and name are required', variant: 'destructive' });
      return;
    }
    try {
      await upsertHoliday(staffScope, {
        id: editId ?? undefined,
        organization_id: staffScope.organizationId,
        location_id: staffScope.locationId,
        date: form.date,
        name: form.name.trim(),
        is_paid: form.is_paid,
      });
      toast({ title: 'Saved', description: 'Holiday saved' });
      setDialogOpen(false);
      await load();
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to save holiday',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!staffScope || !deleteId) return;
    try {
      await deleteHoliday(deleteId, staffScope);
      toast({ title: 'Deleted', description: 'Holiday removed' });
      setDeleteId(null);
      await load();
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to delete',
        variant: 'destructive',
      });
    }
  };

  if (isLoading || loading) return <StaffEmptyState loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Holiday calendar {year}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Org-wide or branch-specific paid / unpaid holidays
          </p>
        </div>
        <Button className="btn-gradient border-0" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add holiday
        </Button>
      </div>

      {holidays.length === 0 ? (
        <StaffEmptyState title="No holidays" description={`Add holidays for ${year}.`} />
      ) : (
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base text-white">{holidays.length} holidays</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            {holidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between py-3 gap-3">
                <div>
                  <p className="font-medium text-white">{h.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(h.date), 'EEE, MMM d, yyyy')}
                    {h.is_paid ? ' · Paid' : ' · Unpaid'}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(h)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-red-400" onClick={() => setDeleteId(h.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-card border-border/50 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit holiday' : 'New holiday'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="bg-card/40 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-card/40 border-border/50"
                placeholder="e.g. Diwali"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Paid holiday</Label>
              <Switch checked={form.is_paid} onCheckedChange={(v) => setForm({ ...form, is_paid: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border/50" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="btn-gradient border-0" onClick={() => void handleSave()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="glass-card border-border/50 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete holiday?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/50">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => void handleDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HolidayManagerPanel;
