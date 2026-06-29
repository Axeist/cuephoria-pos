import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import MembershipTierCard from '@/components/memberships/MembershipTierCard';
import { TIER_ACCENT_OPTIONS } from '@/components/memberships/membershipTierTheme';
import type { MembershipTierAccent } from '@/components/memberships/membershipTierTheme';
import type { MembershipTier } from '@/types/membership.types';

type MembershipTierFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tierForm: Partial<MembershipTier> & { name: string };
  onTierFormChange: (updater: (prev: Partial<MembershipTier> & { name: string }) => Partial<MembershipTier> & { name: string }) => void;
  editingTierId: string | null;
  onSubmit: (e: React.FormEvent) => void;
  saving?: boolean;
  simplified?: boolean;
};

export default function MembershipTierFormDialog({
  open,
  onOpenChange,
  tierForm,
  onTierFormChange,
  editingTierId,
  onSubmit,
  saving = false,
  simplified = false,
}: MembershipTierFormDialogProps) {
  const set = (patch: Partial<MembershipTier> & { name?: string }) =>
    onTierFormChange((f) => ({ ...f, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTierId ? 'Edit membership tier' : 'New membership tier'}</DialogTitle>
          <DialogDescription>
            Design your membership type — saved tiers sync as POS products automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className={cn('grid gap-5', simplified ? '' : 'lg:grid-cols-2')}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tier name</Label>
                <Input
                  value={tierForm.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="e.g. Gold Elite"
                  required
                />
              </div>
              {!simplified && (
                <>
                  <div className="space-y-1.5">
                    <Label>Tagline</Label>
                    <Input
                      value={tierForm.tagline ?? ''}
                      onChange={(e) => set({ tagline: e.target.value })}
                      placeholder="Short subtitle for cards"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description & benefits</Label>
                    <Textarea
                      value={tierForm.description ?? ''}
                      onChange={(e) => set({ description: e.target.value })}
                      placeholder="Unlimited weekday play, 15% F&B, priority booking…"
                      rows={3}
                      className="resize-none bg-black/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Accent theme</Label>
                    <div className="flex flex-wrap gap-2">
                      {TIER_ACCENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className={cn(
                            'h-8 w-8 rounded-full border-2 transition ring-offset-2 ring-offset-background',
                            tierForm.accentColor === opt.id
                              ? 'border-white ring-2 ring-white/50 scale-110'
                              : 'border-transparent hover:scale-105',
                          )}
                          style={{ backgroundColor: opt.hex }}
                          title={opt.label}
                          onClick={() => set({ accentColor: opt.id as MembershipTierAccent })}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Playtime discount %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={tierForm.playtimeDiscountPct}
                    onChange={(e) => set({ playtimeDiscountPct: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>F&B discount %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={tierForm.fnbDiscountPct}
                    onChange={(e) => set({ fnbDiscountPct: Number(e.target.value) })}
                    disabled={tierForm.fnbBenefitsEnabled === false}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>POS price (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={tierForm.retailPrice ?? 0}
                    onChange={(e) => set({ retailPrice: Number(e.target.value) })}
                  />
                </div>
                {!simplified && (
                  <div className="space-y-1.5">
                    <Label>Compare-at price (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={tierForm.compareAtPrice ?? ''}
                      onChange={(e) =>
                        set({
                          compareAtPrice: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      placeholder="Strikethrough on POS"
                    />
                  </div>
                )}
              </div>
              {!simplified && (
                <>
                  <div className="space-y-1.5">
                    <Label>Wallet credit on purchase (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={tierForm.walletCreditOnPurchase ?? 0}
                      onChange={(e) => set({ walletCreditOnPurchase: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label>Included playtime hours</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Optional — only enable for tiers that grant free playtime.
                        </p>
                      </div>
                      <Switch
                        checked={tierForm.defaultMembershipHours != null}
                        onCheckedChange={(checked) =>
                          set({
                            defaultMembershipHours: checked
                              ? (tierForm.defaultMembershipHours ?? 4)
                              : null,
                          })
                        }
                      />
                    </div>
                    {tierForm.defaultMembershipHours != null && (
                      <div className="space-y-1.5">
                        <Label htmlFor="tier-membership-hours">Hours on purchase</Label>
                        <Input
                          id="tier-membership-hours"
                          type="number"
                          min={1}
                          value={tierForm.defaultMembershipHours}
                          onChange={(e) =>
                            set({
                              defaultMembershipHours: Number(e.target.value) || null,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Default validity</Label>
                    <Select
                      value={tierForm.defaultDuration ?? 'monthly'}
                      onValueChange={(v: MembershipTier['defaultDuration']) =>
                        set({ defaultDuration: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lifetime">Lifetime</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="custom_days">Custom (days)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {tierForm.defaultDuration === 'custom_days' && (
                    <div className="space-y-1.5">
                      <Label>Validity period (days)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={tierForm.defaultValidityDays ?? 30}
                        onChange={(e) =>
                          set({ defaultValidityDays: Number(e.target.value) || 30 })
                        }
                      />
                    </div>
                  )}
                  <div className="space-y-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label>F&B benefits</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Apply tier F&B discounts on food and drinks for members.
                        </p>
                      </div>
                      <Switch
                        checked={tierForm.fnbBenefitsEnabled !== false}
                        onCheckedChange={(checked) => set({ fnbBenefitsEnabled: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label>Wallet covers F&B bills</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          When off, wallet balance only pays gaming and non-F&B items.
                        </p>
                      </div>
                      <Switch
                        checked={tierForm.cardPaymentFnbEnabled ?? false}
                        onCheckedChange={(checked) => set({ cardPaymentFnbEnabled: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label>Pay at venue (bookings)</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Allow this tier to pay at venue on public bookings.
                        </p>
                      </div>
                      <Switch
                        checked={tierForm.bookingPayAtVenueEnabled ?? false}
                        onCheckedChange={(checked) => set({ bookingPayAtVenueEnabled: checked })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Active in POS</Label>
                    <Switch
                      checked={tierForm.isActive ?? true}
                      onCheckedChange={(checked) => set({ isActive: checked })}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Live preview</Label>
              <MembershipTierCard
                tier={{
                  id: editingTierId ?? 'preview',
                  organizationId: '',
                  name: tierForm.name || 'Tier name',
                  slug: tierForm.slug || 'tier',
                  sortOrder: tierForm.sortOrder ?? 0,
                  isActive: tierForm.isActive ?? true,
                  playtimeDiscountPct: tierForm.playtimeDiscountPct ?? 0,
                  fnbDiscountPct: tierForm.fnbDiscountPct ?? 0,
                  fnbBenefitsEnabled: tierForm.fnbBenefitsEnabled !== false,
                  cardPaymentFnbEnabled: tierForm.cardPaymentFnbEnabled ?? false,
                  bookingPayAtVenueEnabled: tierForm.bookingPayAtVenueEnabled ?? false,
                  retailPrice: tierForm.retailPrice ?? 0,
                  walletCreditOnPurchase: tierForm.walletCreditOnPurchase ?? 0,
                  defaultDuration: tierForm.defaultDuration ?? 'monthly',
                  defaultValidityDays: tierForm.defaultValidityDays ?? null,
                  defaultMembershipHours: tierForm.defaultMembershipHours ?? null,
                  description: tierForm.description ?? '',
                  tagline: tierForm.tagline ?? '',
                  accentColor: tierForm.accentColor ?? 'violet',
                  compareAtPrice: tierForm.compareAtPrice ?? null,
                }}
              />
              <p className="text-xs text-muted-foreground">
                Saving creates or updates a matching product in your POS catalog.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="btn-gradient" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
