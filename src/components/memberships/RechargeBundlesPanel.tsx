import React, { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CurrencyDisplay } from '@/components/ui/currency';
import { emptyRechargeForm } from '@/components/memberships/membershipHubConstants';
import type { MembershipRechargeTier } from '@/types/membership.types';

type RechargeBundlesPanelProps = {
  rechargeTiers: MembershipRechargeTier[];
  canEdit: boolean;
  onSave: (
    form: Partial<MembershipRechargeTier> & { payAmount: number; creditAmount: number },
    editingId: string | null,
  ) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
};

export default function RechargeBundlesPanel({
  rechargeTiers,
  canEdit,
  onSave,
  onDelete,
}: RechargeBundlesPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyRechargeForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyRechargeForm());
    setDialogOpen(true);
  };

  const openEdit = (tier: MembershipRechargeTier) => {
    setEditingId(tier.id);
    setForm({ ...tier });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form, editingId);
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await onDelete(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="glass-card border-white/10 p-4 sm:p-5 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Recharge bundles</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Preset pay/credit amounts staff can apply at the member desk.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add bundle
          </Button>
        )}
      </div>

      {rechargeTiers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-white/10 rounded-xl">
          No recharge bundles configured yet.
        </p>
      ) : (
        <div className="space-y-2">
          {rechargeTiers.map((tier) => (
            <div
              key={tier.id}
              className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2"
            >
              <span className="text-sm">
                Pay <CurrencyDisplay amount={tier.payAmount} /> → credit{' '}
                <CurrencyDisplay amount={tier.creditAmount} />
                {!tier.isActive && (
                  <span className="text-muted-foreground ml-2">(inactive)</span>
                )}
              </span>
              {canEdit && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(tier)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400"
                    onClick={() => setDeleteId(tier.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-card border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit recharge bundle' : 'New recharge bundle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pay amount</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.payAmount}
                  onChange={(e) => setForm((f) => ({ ...f, payAmount: Number(e.target.value) }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Credit amount</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.creditAmount}
                  onChange={(e) => setForm((f) => ({ ...f, creditAmount: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="btn-gradient" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recharge bundle?</AlertDialogTitle>
            <AlertDialogDescription>
              Staff will no longer see this preset at the member desk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
