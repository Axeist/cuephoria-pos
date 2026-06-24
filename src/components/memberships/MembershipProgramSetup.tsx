import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, Layers, Loader2, Plus, Settings2, Trash2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import MembershipTierCard from '@/components/memberships/MembershipTierCard';
import MembershipTierFormDialog from '@/components/memberships/MembershipTierFormDialog';
import MembershipCouponFormDialog from '@/components/memberships/MembershipCouponFormDialog';
import RechargeBundlesPanel from '@/components/memberships/RechargeBundlesPanel';
import { FEATURE_FLAG_META } from '@/components/memberships/membershipHubConstants';
import type { SetupSection } from '@/components/memberships/membershipHubConstants';
import type {
  MembershipCoupon,
  MembershipFeatureFlagKey,
  MembershipRechargeTier,
  MembershipTier,
} from '@/types/membership.types';
import { cn } from '@/lib/utils';
import { fadeSlideUp, membershipSpring } from '@/components/memberships/membershipMotion';

const SECTIONS: { id: SetupSection; label: string; icon: React.ElementType }[] = [
  { id: 'tiers', label: 'Tiers', icon: Layers },
  { id: 'bundles', label: 'Bundles', icon: Wallet },
  { id: 'coupons', label: 'Coupons', icon: Gift },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

type MembershipProgramSetupProps = {
  activeSection: SetupSection;
  onSectionChange: (section: SetupSection) => void;
  tiers: MembershipTier[];
  rechargeTiers: MembershipRechargeTier[];
  coupons: MembershipCoupon[];
  localFlags: Record<MembershipFeatureFlagKey, boolean>;
  onFlagsChange: (flags: Record<MembershipFeatureFlagKey, boolean>) => void;
  canEditTiers: boolean;
  canEditRecharge: boolean;
  canEditCoupons: boolean;
  canEditSettings: boolean;
  canUse: (key: MembershipFeatureFlagKey) => boolean;
  savingSettings: boolean;
  onSaveSettings: () => Promise<void>;
  onSaveTier: (
    form: Partial<MembershipTier> & { name: string },
    editingId: string | null,
  ) => Promise<MembershipTier | undefined>;
  onDeleteTier: (id: string) => Promise<void>;
  onSaveCoupon: (
    form: Partial<MembershipCoupon> & { code: string },
    editingId: string | null,
  ) => Promise<MembershipCoupon | undefined>;
  onDeleteCoupon: (id: string) => Promise<void>;
  onSaveRechargeTier: (
    form: Partial<MembershipRechargeTier> & { payAmount: number; creditAmount: number },
    editingId: string | null,
  ) => Promise<unknown>;
  onDeleteRechargeTier: (id: string) => Promise<void>;
  emptyTierForm: () => Partial<MembershipTier> & { name: string };
  emptyCouponForm: () => Partial<MembershipCoupon> & { code: string };
};

export default function MembershipProgramSetup({
  activeSection,
  onSectionChange,
  tiers,
  rechargeTiers,
  coupons,
  localFlags,
  onFlagsChange,
  canEditTiers,
  canEditRecharge,
  canEditCoupons,
  canEditSettings,
  canUse,
  savingSettings,
  onSaveSettings,
  onSaveTier,
  onDeleteTier,
  onSaveCoupon,
  onDeleteCoupon,
  onSaveRechargeTier,
  onDeleteRechargeTier,
  emptyTierForm,
  emptyCouponForm,
}: MembershipProgramSetupProps) {
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [tierForm, setTierForm] = useState(emptyTierForm());
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [savingTier, setSavingTier] = useState(false);
  const [deleteTierId, setDeleteTierId] = useState<string | null>(null);

  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [couponForm, setCouponForm] = useState(emptyCouponForm());
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [deleteCouponId, setDeleteCouponId] = useState<string | null>(null);

  const openTierCreate = () => {
    setEditingTierId(null);
    setTierForm(emptyTierForm());
    setTierDialogOpen(true);
  };

  const openTierEdit = (tier: MembershipTier) => {
    setEditingTierId(tier.id);
    setTierForm({ ...tier, name: tier.name });
    setTierDialogOpen(true);
  };

  const handleTierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTier(true);
    try {
      await onSaveTier(tierForm, editingTierId);
      setTierDialogOpen(false);
    } finally {
      setSavingTier(false);
    }
  };

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveCoupon(couponForm, editingCouponId);
    setCouponDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="relative flex flex-wrap gap-1 rounded-xl border border-white/10 bg-black/25 p-1 backdrop-blur-sm">
        {SECTIONS.map((s) => {
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSectionChange(s.id)}
              className={cn(
                'relative z-10 flex flex-1 min-w-[80px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'text-white' : 'text-muted-foreground hover:text-white/80',
              )}
            >
              {active && (
                <motion.div
                  layoutId="setup-section-pill"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-600/90 to-indigo-600/80 shadow-md shadow-violet-900/30"
                  transition={membershipSpring}
                />
              )}
              <s.icon className="relative h-4 w-4" />
              <span className="relative hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeSection === 'tiers' && (
          <motion.div
            key="tiers"
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4"
          >
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Membership tiers</h2>
              <p className="text-sm text-muted-foreground">Synced automatically to POS products.</p>
            </div>
            {canEditTiers && (
              <Button size="sm" className="btn-gradient gap-1.5" onClick={openTierCreate}>
                <Plus className="h-4 w-4" />
                Add tier
              </Button>
            )}
          </div>
          {tiers.length === 0 ? (
            <div className="glass-card border-white/10 p-8 text-center text-muted-foreground">
              <Layers className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No tiers yet.</p>
              {canEditTiers && (
                <Button size="sm" className="mt-4 btn-gradient" onClick={openTierCreate}>
                  Create first tier
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {tiers.map((tier, i) => (
                <div key={tier.id} className="space-y-2">
                  <MembershipTierCard tier={tier} index={i} />
                  {canEditTiers && (
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => openTierEdit(tier)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => setDeleteTierId(tier.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </motion.div>
        )}

        {activeSection === 'bundles' && (
          <motion.div
            key="bundles"
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
          {!canUse('recharge_tiers_enabled') ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-6 text-center text-sm">
              <p className="font-medium text-amber-100">Recharge bundles are disabled</p>
              <p className="text-muted-foreground mt-1">Enable in Settings to configure presets.</p>
            </div>
          ) : (
            <RechargeBundlesPanel
              rechargeTiers={rechargeTiers}
              canEdit={canEditRecharge}
              onSave={onSaveRechargeTier}
              onDelete={onDeleteRechargeTier}
            />
          )}
          </motion.div>
        )}

        {activeSection === 'coupons' && (
          <motion.div
            key="coupons"
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4"
          >
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Member coupons</h2>
            {canEditCoupons && canUse('member_coupons_enabled') && (
              <Button
                size="sm"
                className="btn-gradient gap-1.5"
                onClick={() => {
                  setEditingCouponId(null);
                  setCouponForm(emptyCouponForm());
                  setCouponDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add coupon
              </Button>
            )}
          </div>
          {!canUse('member_coupons_enabled') ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-6 text-center text-sm">
              <p className="font-medium text-amber-100">Member coupons are disabled</p>
            </div>
          ) : coupons.length === 0 ? (
            <div className="glass-card border-white/10 p-8 text-center text-muted-foreground">
              <Gift className="h-10 w-10 mx-auto mb-3 opacity-40" />
              No member coupons yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="glass-card border-white/10 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold">{coupon.code}</span>
                    <Badge variant={coupon.enabled ? 'default' : 'secondary'}>
                      {coupon.enabled ? 'Active' : 'Off'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{coupon.description || '—'}</p>
                  <p className="text-sm">
                    {coupon.discountType === 'percentage'
                      ? `${coupon.discountValue}% off`
                      : `₹${coupon.discountValue} off`}
                    {coupon.memberOnly ? ' · members only' : ''}
                    {coupon.allowsVenuePayment ? ' · pay at venue' : ''}
                  </p>
                  {canEditCoupons && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingCouponId(coupon.id);
                          setCouponForm({ ...coupon, code: coupon.code });
                          setCouponDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-400"
                        onClick={() => setDeleteCouponId(coupon.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </motion.div>
        )}

        {activeSection === 'settings' && (
          <motion.div
            key="settings"
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-4 sm:p-6 space-y-6"
          >
          <div>
            <h2 className="text-lg font-semibold">Module settings</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enable features for this branch. Requires Growth plan.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <div>
              <p className="font-medium">{FEATURE_FLAG_META.module_enabled.label}</p>
              <p className="text-xs text-muted-foreground">
                {FEATURE_FLAG_META.module_enabled.description}
              </p>
            </div>
            <Switch
              checked={localFlags.module_enabled}
              disabled={!canEditSettings}
              onCheckedChange={(checked) =>
                onFlagsChange({ ...localFlags, module_enabled: checked })
              }
            />
          </div>

          {(['core', 'cards', 'booking'] as const).map((group) => {
            const items = (
              Object.entries(FEATURE_FLAG_META) as [
                MembershipFeatureFlagKey,
                (typeof FEATURE_FLAG_META)[MembershipFeatureFlagKey],
              ][]
            ).filter(([key, meta]) => meta.group === group && key !== 'module_enabled');

            return (
              <div key={group} className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {group === 'core' ? 'Core' : group === 'cards' ? 'NFC & balance' : 'Booking'}
                </h3>
                {items.map(([key, meta]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                    <Switch
                      checked={localFlags[key]}
                      disabled={!canEditSettings || !localFlags.module_enabled}
                      onCheckedChange={(checked) =>
                        onFlagsChange({ ...localFlags, [key]: checked })
                      }
                    />
                  </div>
                ))}
              </div>
            );
          })}

          {canEditSettings && (
            <Button
              type="button"
              className="btn-gradient"
              disabled={savingSettings}
              onClick={() => void onSaveSettings()}
            >
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save settings
            </Button>
          )}
          </motion.div>
        )}
      </AnimatePresence>

      <MembershipTierFormDialog
        open={tierDialogOpen}
        onOpenChange={setTierDialogOpen}
        tierForm={tierForm}
        onTierFormChange={setTierForm}
        editingTierId={editingTierId}
        onSubmit={handleTierSubmit}
        saving={savingTier}
      />

      <MembershipCouponFormDialog
        open={couponDialogOpen}
        onOpenChange={setCouponDialogOpen}
        couponForm={couponForm}
        onCouponFormChange={setCouponForm}
        editingCouponId={editingCouponId}
        tiers={tiers}
        onSubmit={handleCouponSubmit}
      />

      <AlertDialog open={!!deleteTierId} onOpenChange={(open) => !open && setDeleteTierId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tier?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the tier and its linked POS product. Existing member assignments are not
              automatically cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTierId) void onDeleteTier(deleteTierId);
                setDeleteTierId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCouponId} onOpenChange={(open) => !open && setDeleteCouponId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              Members will no longer be able to use this code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteCouponId) void onDeleteCoupon(deleteCouponId);
                setDeleteCouponId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
