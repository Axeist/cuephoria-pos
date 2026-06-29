import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  deleteLeavePolicy,
  fetchLeavePolicies,
  seedLeaveBalancesForStaff,
  upsertLeavePolicy,
} from '@/services/staff/staffApi';
import type { StaffLeavePolicy } from '@/types/staff.types';
import { BookOpen, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import EmployeePinProtectionCard from '@/components/staff/policies/EmployeePinProtectionCard';

const LEAVE_TYPES = [
  'casual_leave',
  'sick_leave',
  'earned_leave',
  'unpaid_leave',
];

const emptyForm = (): Omit<StaffLeavePolicy, 'id' | 'created_at' | 'updated_at'> => ({
  organization_id: '',
  location_id: null,
  leave_type: 'casual_leave',
  annual_quota: 12,
  accrual_mode: 'annual',
  carry_forward_max: 0,
  requires_approval: true,
});

const LeavePolicyPanel: React.FC = () => {
  const { toast } = useToast();
  const { staffScope, profiles, isLoading, refresh } = useStaffHR();
  const [policies, setPolicies] = useState<StaffLeavePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!staffScope) return;
    setLoading(true);
    try {
      setPolicies(await fetchLeavePolicies(staffScope));
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load leave policies', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [staffScope, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm(), organization_id: staffScope?.organizationId ?? '' });
    setDialogOpen(true);
  };

  const openEdit = (p: StaffLeavePolicy) => {
    setEditId(p.id);
    setForm({
      organization_id: p.organization_id,
      location_id: p.location_id,
      leave_type: p.leave_type,
      annual_quota: p.annual_quota,
      accrual_mode: p.accrual_mode,
      carry_forward_max: p.carry_forward_max,
      requires_approval: p.requires_approval,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!staffScope) return;
    try {
      await upsertLeavePolicy(staffScope, { ...form, id: editId ?? undefined });
      toast({ title: 'Saved', description: 'Leave policy updated' });
      setDialogOpen(false);
      await load();
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to save policy',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!staffScope || !deleteId) return;
    try {
      await deleteLeavePolicy(deleteId, staffScope);
      toast({ title: 'Deleted', description: 'Policy removed' });
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

  const handleSeedBalances = async () => {
    if (!staffScope || !policies.length) return;
    setSeeding(true);
    const year = new Date().getFullYear();
    try {
      for (const p of profiles.filter((s) => s.is_active)) {
        await seedLeaveBalancesForStaff(p.user_id, staffScope.organizationId, year, policies);
      }
      toast({ title: 'Done', description: `Balances seeded for ${year}` });
      await refresh();
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to seed balances',
        variant: 'destructive',
      });
    } finally {
      setSeeding(false);
    }
  };

  if (isLoading || loading) return <StaffEmptyState loading />;

  return (
    <div className="space-y-6">
      <EmployeePinProtectionCard compact />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Leave Policies
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure annual quotas and approval rules per leave type
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-border/50" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            className="border-border/50"
            disabled={seeding || policies.length === 0}
            onClick={() => void handleSeedBalances()}
          >
            Seed balances
          </Button>
          <Button className="btn-gradient border-0" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add policy
          </Button>
        </div>
      </div>

      {policies.length === 0 ? (
        <StaffEmptyState
          title="No policies yet"
          description="Add leave policies, then seed balances for active staff."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {policies.map((p) => (
            <Card key={p.id} className="glass-card border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base capitalize text-white">
                      {p.leave_type.replace(/_/g, ' ')}
                    </CardTitle>
                    <CardDescription>
                      {p.annual_quota} days / year · {p.accrual_mode}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-red-400" onClick={() => setDeleteId(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <p>Carry forward max: {p.carry_forward_max}</p>
                <p>Requires approval: {p.requires_approval ? 'Yes' : 'No'}</p>
                {p.location_id && <p className="text-xs">Branch-specific policy</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-card border-border/50 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit policy' : 'New leave policy'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Leave type</Label>
              <select
                className="w-full h-10 rounded-md bg-card/40 border border-border/50 px-3 text-sm"
                value={form.leave_type}
                onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Annual quota (days)</Label>
              <Input
                type="number"
                value={form.annual_quota}
                onChange={(e) => setForm({ ...form, annual_quota: Number(e.target.value) })}
                className="bg-card/40 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Carry forward max</Label>
              <Input
                type="number"
                value={form.carry_forward_max}
                onChange={(e) => setForm({ ...form, carry_forward_max: Number(e.target.value) })}
                className="bg-card/40 border-border/50"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Requires approval</Label>
              <Switch
                checked={form.requires_approval}
                onCheckedChange={(v) => setForm({ ...form, requires_approval: v })}
              />
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
            <AlertDialogTitle>Delete this policy?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Existing balances are not removed automatically.
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

export default LeavePolicyPanel;
