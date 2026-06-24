import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { MembershipCoupon, MembershipTier } from '@/types/membership.types';

type MembershipCouponFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  couponForm: Partial<MembershipCoupon> & { code: string };
  onCouponFormChange: (
    updater: (prev: Partial<MembershipCoupon> & { code: string }) => Partial<MembershipCoupon> & { code: string },
  ) => void;
  editingCouponId: string | null;
  tiers: MembershipTier[];
  onSubmit: (e: React.FormEvent) => void;
};

export default function MembershipCouponFormDialog({
  open,
  onOpenChange,
  couponForm,
  onCouponFormChange,
  editingCouponId,
  tiers,
  onSubmit,
}: MembershipCouponFormDialogProps) {
  const set = (patch: Partial<MembershipCoupon>) =>
    onCouponFormChange((f) => ({ ...f, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle>{editingCouponId ? 'Edit coupon' : 'New coupon'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input
              value={couponForm.code}
              onChange={(e) => set({ code: e.target.value.toUpperCase() })}
              className="font-mono"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={couponForm.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={couponForm.discountType}
                onValueChange={(v: 'percentage' | 'fixed') => set({ discountType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input
                type="number"
                min={0}
                value={couponForm.discountValue}
                onChange={(e) => set({ discountValue: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Restrict to tier (optional)</Label>
            <Select
              value={couponForm.membershipTierId ?? 'all'}
              onValueChange={(v) => set({ membershipTierId: v === 'all' ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                {tiers
                  .filter((t) => t.isActive)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow pay at venue</Label>
              <p className="text-xs text-muted-foreground">Public booking pay-at-venue coupons</p>
            </div>
            <Switch
              checked={couponForm.allowsVenuePayment ?? false}
              onCheckedChange={(checked) => set({ allowsVenuePayment: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Enabled</Label>
            <Switch
              checked={couponForm.enabled ?? true}
              onCheckedChange={(checked) => set({ enabled: checked })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="btn-gradient">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
