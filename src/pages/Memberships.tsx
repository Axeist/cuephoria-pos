import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Gift,
  IdCard,
  Layers,
  Loader2,
  Plus,
  Settings2,
  Trash2,
  Wallet,
} from 'lucide-react';
import { MobilePageShell } from '@/components/mobile/MobilePageShell';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { MobileTabSelect } from '@/components/mobile/MobileTabSelect';
import { MobileTabBar } from '@/components/mobile/MobileTabBar';
import MembershipHubStats from '@/components/memberships/MembershipHubStats';
import MemberLookupPanel from '@/components/memberships/MemberLookupPanel';
import AddMemberCardDialog from '@/components/memberships/AddMemberCardDialog';
import AssignMemberCardPanel from '@/components/memberships/AssignMemberCardPanel';
import MemberCardRegistry from '@/components/memberships/MemberCardRegistry';
import MembershipPanelShell from '@/components/memberships/MembershipPanelShell';
import MembershipTierCard from '@/components/memberships/MembershipTierCard';
import NfcCardLookupPanel from '@/components/memberships/NfcCardLookupPanel';
import { TIER_ACCENT_OPTIONS } from '@/components/memberships/membershipTierTheme';
import type { MembershipTierAccent } from '@/components/memberships/membershipTierTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/context/PermissionsContext';
import { useLocation } from '@/context/LocationContext';
import { usePOS } from '@/context/POSContext';
import { useMembershipFeatures } from '@/hooks/useMembershipFeatures';
import { useViewMode } from '@/context/ViewModeContext';
import {
  deleteMembershipCoupon,
  deleteMembershipTier,
  deleteRechargeTier,
  fetchMembershipCards,
  fetchMembershipCoupons,
  fetchMembershipTiers,
  fetchRechargeTiers,
  rechargeMembershipCard,
  updateMembershipSettings,
  upsertMembershipCoupon,
  upsertMembershipTier,
  upsertRechargeTier,
} from '@/services/membershipService';
import type {
  MembershipCardLookupResult,
  MembershipCardWithMember,
  MembershipCoupon,
  MembershipFeatureFlagKey,
  MembershipRechargeTier,
  MembershipTier,
} from '@/types/membership.types';
import { DEFAULT_MEMBERSHIP_FEATURE_FLAGS } from '@/types/membership.types';
import { CurrencyDisplay } from '@/components/ui/currency';

type TabId = 'settings' | 'tiers' | 'recharge' | 'cards' | 'coupons';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'settings', label: 'Settings', icon: Settings2 },
  { id: 'tiers', label: 'Tiers', icon: Layers },
  { id: 'recharge', label: 'Recharge', icon: Wallet },
  { id: 'cards', label: 'Cards', icon: CreditCard },
  { id: 'coupons', label: 'Coupons', icon: Gift },
];

const FEATURE_FLAG_META: Record<
  MembershipFeatureFlagKey,
  { label: string; description: string; group: 'core' | 'cards' | 'booking' }
> = {
  module_enabled: {
    label: 'Memberships module',
    description: 'Master switch for all membership features at this branch.',
    group: 'core',
  },
  tier_plans_enabled: {
    label: 'Tier plans',
    description: 'Named tiers with playtime and F&B discounts.',
    group: 'core',
  },
  nfc_cards_enabled: {
    label: 'NFC cards',
    description: 'Assign physical cards and look up members by tap.',
    group: 'cards',
  },
  card_balance_enabled: {
    label: 'Card balance',
    description: 'Prepaid wallet balance on member cards.',
    group: 'cards',
  },
  card_balance_payments_enabled: {
    label: 'Pay with balance',
    description: 'Allow checkout redemption from card balance.',
    group: 'cards',
  },
  recharge_tiers_enabled: {
    label: 'Recharge tiers',
    description: 'Preset pay/credit bundles for top-ups.',
    group: 'cards',
  },
  physical_cards_inventory_enabled: {
    label: 'Card inventory',
    description: 'Track unassigned NFC cards in stock.',
    group: 'cards',
  },
  registration_deposit_enabled: {
    label: 'Registration deposit',
    description: 'Collect a deposit when enrolling new members.',
    group: 'core',
  },
  member_coupons_enabled: {
    label: 'Member coupons',
    description: 'Exclusive promo codes for members.',
    group: 'core',
  },
  public_member_venue_booking_enabled: {
    label: 'Member venue booking',
    description: 'Members book courts/stations on the public portal.',
    group: 'booking',
  },
  booking_pay_at_venue_enabled: {
    label: 'Pay at venue',
    description: 'Members can pay at the venue for online bookings.',
    group: 'booking',
  },
};

const emptyTierForm = (): Partial<MembershipTier> & { name: string } => ({
  name: '',
  slug: '',
  sortOrder: 0,
  isActive: true,
  playtimeDiscountPct: 0,
  fnbDiscountPct: 0,
  cardPaymentFnbEnabled: false,
  bookingPayAtVenueEnabled: false,
  retailPrice: 0,
  walletCreditOnPurchase: 0,
  defaultDuration: 'monthly',
  defaultMembershipHours: null,
  description: '',
  tagline: '',
  accentColor: 'violet',
  compareAtPrice: null,
});

const emptyRechargeForm = (): Partial<MembershipRechargeTier> & {
  payAmount: number;
  creditAmount: number;
} => ({
  payAmount: 0,
  creditAmount: 0,
  isActive: true,
  sortOrder: 0,
});

const emptyCouponForm = (): Partial<MembershipCoupon> & { code: string } => ({
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: 0,
  enabled: true,
  memberOnly: true,
  allowsVenuePayment: false,
  usesCount: 0,
});

export default function MembershipsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { activeLocationId, activeLocation } = useLocation();
  const { isMobile } = useViewMode();
  const { loading: featuresLoading, flags, canUse, isEnabled } = useMembershipFeatures();
  const { customers = [] } = usePOS();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: TabId =
    tabParam === 'tiers' ||
    tabParam === 'recharge' ||
    tabParam === 'cards' ||
    tabParam === 'coupons'
      ? tabParam
      : 'settings';

  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [rechargeTiers, setRechargeTiers] = useState<MembershipRechargeTier[]>([]);
  const [coupons, setCoupons] = useState<MembershipCoupon[]>([]);
  const [cards, setCards] = useState<MembershipCardWithMember[]>([]);
  const [localFlags, setLocalFlags] = useState({ ...DEFAULT_MEMBERSHIP_FEATURE_FLAGS });
  const [savingSettings, setSavingSettings] = useState(false);

  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [tierForm, setTierForm] = useState(emptyTierForm());
  const [editingTierId, setEditingTierId] = useState<string | null>(null);

  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const [rechargeForm, setRechargeForm] = useState(emptyRechargeForm());
  const [editingRechargeId, setEditingRechargeId] = useState<string | null>(null);

  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [couponForm, setCouponForm] = useState(emptyCouponForm());
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  const [resolvedMember, setResolvedMember] = useState<MembershipCardLookupResult | null>(null);
  const [addCardDialogOpen, setAddCardDialogOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [recharging, setRecharging] = useState(false);

  const canEditSettings = can('memberships.settings.edit');
  const canEditTiers = can('memberships.tiers.edit');
  const canEditRecharge = can('memberships.recharge.edit');
  const canExecuteRecharge = can('memberships.recharge.execute');
  const canManageCards = can('memberships.cards.manage');
  const canEditCoupons = can('memberships.coupons.edit');

  const activeMembersCount = useMemo(
    () => customers.filter((c) => c.membershipTierId || c.isMember).length,
    [customers],
  );

  const setActiveTab = (tab: TabId) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === 'settings') next.delete('tab');
        else next.set('tab', tab);
        return next;
      },
      { replace: true },
    );
  };

  const loadHubData = useCallback(async () => {
    if (!activeLocationId) return;
    setLoading(true);
    try {
      const [tiersRes, rechargeRes, couponsRes, cardsRes] = await Promise.all([
        fetchMembershipTiers(activeLocationId).catch(() => ({ tiers: [] as MembershipTier[] })),
        flags.recharge_tiers_enabled
          ? fetchRechargeTiers(activeLocationId).catch(() => ({
              rechargeTiers: [] as MembershipRechargeTier[],
            }))
          : Promise.resolve({ rechargeTiers: [] as MembershipRechargeTier[] }),
        flags.member_coupons_enabled
          ? fetchMembershipCoupons(activeLocationId).catch(() => ({
              coupons: [] as MembershipCoupon[],
            }))
          : Promise.resolve({ coupons: [] as MembershipCoupon[] }),
        flags.nfc_cards_enabled
          ? fetchMembershipCards(activeLocationId).catch(() => ({
              cards: [] as MembershipCardWithMember[],
            }))
          : Promise.resolve({ cards: [] as MembershipCardWithMember[] }),
      ]);
      setTiers(tiersRes.tiers);
      setRechargeTiers(rechargeRes.rechargeTiers);
      setCoupons(couponsRes.coupons);
      setCards(cardsRes.cards);
    } catch (err) {
      toast({
        title: 'Failed to load memberships',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [activeLocationId, flags, toast]);

  useEffect(() => {
    setLocalFlags(flags);
  }, [flags]);

  useEffect(() => {
    void loadHubData();
  }, [loadHubData]);

  const saveSettings = async () => {
    if (!canEditSettings || !activeLocationId) return;
    setSavingSettings(true);
    try {
      await updateMembershipSettings(
        {
          locationId: activeLocationId,
          featureFlags: localFlags,
        },
        activeLocationId,
      );
      await queryClient.invalidateQueries({ queryKey: ['membership-features', activeLocationId] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await loadHubData();
      toast({ title: 'Settings saved' });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditTiers || !tierForm.name.trim()) return;
    try {
      const slug =
        tierForm.slug?.trim() ||
        tierForm.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      const res = await upsertMembershipTier(
        {
          ...tierForm,
          id: editingTierId ?? undefined,
          slug,
          name: tierForm.name.trim(),
        },
        activeLocationId,
      );
      setTiers((prev) => {
        const idx = prev.findIndex((t) => t.id === res.tier.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = res.tier;
          return next;
        }
        return [...prev, res.tier].sort((a, b) => a.sortOrder - b.sortOrder);
      });
      setTierDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: editingTierId ? 'Tier updated' : 'Tier created',
        description: 'Membership product synced to POS catalog.',
      });
    } catch (err) {
      toast({
        title: 'Tier save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!canEditTiers) return;
    try {
      await deleteMembershipTier(tierId, activeLocationId);
      setTiers((prev) => prev.filter((t) => t.id !== tierId));
      toast({ title: 'Tier deleted' });
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleSaveRechargeTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditRecharge) return;
    try {
      const res = await upsertRechargeTier(
        {
          ...rechargeForm,
          id: editingRechargeId ?? undefined,
          payAmount: Number(rechargeForm.payAmount),
          creditAmount: Number(rechargeForm.creditAmount),
        },
        activeLocationId,
      );
      setRechargeTiers((prev) => {
        const idx = prev.findIndex((t) => t.id === res.rechargeTier.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = res.rechargeTier;
          return next;
        }
        return [...prev, res.rechargeTier];
      });
      setRechargeDialogOpen(false);
      toast({ title: editingRechargeId ? 'Recharge tier updated' : 'Recharge tier created' });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRechargeTier = async (id: string) => {
    if (!canEditRecharge) return;
    try {
      await deleteRechargeTier(id, activeLocationId);
      setRechargeTiers((prev) => prev.filter((t) => t.id !== id));
      toast({ title: 'Recharge tier deleted' });
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleMemberRecharge = async (creditAmount: number) => {
    if (!canExecuteRecharge || !resolvedMember) return;
    setRecharging(true);
    try {
      const res = await rechargeMembershipCard(
        {
          customerId: resolvedMember.customer.id,
          creditAmount,
          note: 'Staff recharge',
        },
        activeLocationId,
      );
      setResolvedMember({
        ...resolvedMember,
        customer: {
          ...resolvedMember.customer,
          cardBalance: res.balanceAfter,
        },
      });
      toast({
        title: 'Recharge successful',
        description: `New balance: ₹${res.balanceAfter}`,
      });
    } catch (err) {
      toast({
        title: 'Recharge failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRecharging(false);
    }
  };

  const handleCardAssigned = useCallback(() => {
    void loadHubData();
  }, [loadHubData]);

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditCoupons || !couponForm.code.trim()) return;
    try {
      const res = await upsertMembershipCoupon({
        ...couponForm,
        id: editingCouponId ?? undefined,
        code: couponForm.code.trim().toUpperCase(),
      });
      setCoupons((prev) => {
        const idx = prev.findIndex((c) => c.id === res.coupon.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = res.coupon;
          return next;
        }
        return [...prev, res.coupon];
      });
      setCouponDialogOpen(false);
      toast({ title: editingCouponId ? 'Coupon updated' : 'Coupon created' });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!canEditCoupons) return;
    try {
      await deleteMembershipCoupon(id);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      toast({ title: 'Coupon deleted' });
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  if (!can('memberships.view')) {
    return <Navigate to="/dashboard" replace />;
  }

  const tabItems = TABS.map((t) => ({ id: t.id, label: t.label }));

  return (
    <MobilePageShell className="space-y-4 sm:space-y-6">
      <MobilePageHeader
        title="Memberships"
        subtitle={
          activeLocation
            ? `Tier plans, NFC cards, and member perks for ${activeLocation.name}.`
            : 'Tier plans, NFC cards, and member perks.'
        }
        badge={
          !isEnabled ? (
            <Badge variant="outline" className="border-amber-500/40 text-amber-300">
              Module off
            </Badge>
          ) : null
        }
      />

      <MembershipHubStats
        activeMembersCount={activeMembersCount}
        tiers={tiers}
        cards={cards}
        coupons={coupons}
      />

      {isMobile ? (
        <MobileTabSelect tabs={tabItems} activeId={activeTab} onChange={(id) => setActiveTab(id as TabId)} />
      ) : (
        <MobileTabBar tabs={tabItems} activeId={activeTab} onChange={(id) => setActiveTab(id as TabId)} />
      )}

      {loading || featuresLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'settings' && (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-4 sm:p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Module settings</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enable features for this branch. Requires Growth plan.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="font-medium">{FEATURE_FLAG_META.module_enabled.label}</p>
                  <p className="text-xs text-muted-foreground">{FEATURE_FLAG_META.module_enabled.description}</p>
                </div>
                <Switch
                  checked={localFlags.module_enabled}
                  disabled={!canEditSettings}
                  onCheckedChange={(checked) =>
                    setLocalFlags((prev) => ({ ...prev, module_enabled: checked }))
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
                            setLocalFlags((prev) => ({ ...prev, [key]: checked }))
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
                  onClick={() => void saveSettings()}
                >
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save settings
                </Button>
              )}
            </div>
          )}

          {activeTab === 'tiers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Membership tiers</h2>
                {canEditTiers && (
                  <Button
                    size="sm"
                    className="btn-gradient gap-1.5"
                    onClick={() => {
                      setEditingTierId(null);
                      setTierForm(emptyTierForm());
                      setTierDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add tier
                  </Button>
                )}
              </div>
              {tiers.length === 0 ? (
                <div className="glass-card border-white/10 p-8 text-center text-muted-foreground">
                  <IdCard className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  No tiers yet. Create your first membership plan.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {tiers.map((tier) => (
                    <div key={tier.id} className="space-y-2">
                      <MembershipTierCard tier={tier} />
                      {canEditTiers && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTierId(tier.id);
                              setTierForm({ ...tier, name: tier.name });
                              setTierDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => void handleDeleteTier(tier.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'recharge' && (
            <div className="space-y-5">
              <MemberLookupPanel
                members={customers}
                step={1}
                title="Find member to recharge"
                onMemberResolved={(result) => {
                  setResolvedMember(result);
                  setRechargeAmount('');
                }}
              />

              {canUse('nfc_cards_enabled') && (
                <NfcCardLookupPanel
                  compact
                  onMemberResolved={(result) => {
                    setResolvedMember(result);
                    setRechargeAmount('');
                  }}
                />
              )}

              {resolvedMember && canUse('card_balance_enabled') && (
                <MembershipPanelShell
                  accent="cyan"
                  title={`Recharge ${resolvedMember.customer.name}`}
                  description="Add prepaid credit to the member wallet."
                  icon={<Wallet className="h-5 w-5" />}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {resolvedMember.customer.customerId && (
                      <span className="rounded-md bg-black/30 px-2.5 py-1 font-mono text-xs text-cyan-200/90 border border-cyan-500/20">
                        {resolvedMember.customer.customerId}
                      </span>
                    )}
                    <div className="text-right ml-auto">
                      <p className="text-xs text-muted-foreground">Current balance</p>
                      <p className="text-2xl font-bold text-cyan-100 tabular-nums">
                        <CurrencyDisplay amount={resolvedMember.customer.cardBalance ?? 0} />
                      </p>
                    </div>
                  </div>

                  {canUse('recharge_tiers_enabled') && rechargeTiers.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {rechargeTiers
                        .filter((t) => t.isActive)
                        .map((tier) => (
                          <Button
                            key={tier.id}
                            type="button"
                            variant="outline"
                            className="h-auto py-3 flex flex-col gap-0.5 border-cyan-500/20 hover:bg-cyan-500/10 hover:border-cyan-400/40"
                            disabled={!canExecuteRecharge || recharging}
                            onClick={() => void handleMemberRecharge(tier.creditAmount)}
                          >
                            <span className="text-xs text-muted-foreground">
                              Pay <CurrencyDisplay amount={tier.payAmount} />
                            </span>
                            <span className="font-semibold text-cyan-100">
                              +<CurrencyDisplay amount={tier.creditAmount} />
                            </span>
                          </Button>
                        ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Custom credit amount"
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                      disabled={!canExecuteRecharge || recharging}
                      className="bg-black/30 border-white/10 h-11"
                    />
                    <Button
                      type="button"
                      className="btn-gradient shrink-0 h-11 min-w-[130px]"
                      disabled={!canExecuteRecharge || recharging || !rechargeAmount}
                      onClick={() => void handleMemberRecharge(Number(rechargeAmount))}
                    >
                      {recharging ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Recharge'}
                    </Button>
                  </div>
                </MembershipPanelShell>
              )}

              {canEditRecharge && canUse('recharge_tiers_enabled') && (
                <div className="glass-card border-white/10 p-4 sm:p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Recharge tiers</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        setEditingRechargeId(null);
                        setRechargeForm(emptyRechargeForm());
                        setRechargeDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  {rechargeTiers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recharge bundles configured.</p>
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
                          </span>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingRechargeId(tier.id);
                                setRechargeForm({ ...tier });
                                setRechargeDialogOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400"
                              onClick={() => void handleDeleteRechargeTier(tier.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'cards' && (
            <div className="space-y-5">
              {canUse('nfc_cards_enabled') && canManageCards && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="btn-gradient gap-1.5"
                    onClick={() => setAddCardDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add card
                  </Button>
                </div>
              )}
              {!canUse('nfc_cards_enabled') ? (
                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-6 text-center">
                  <CreditCard className="h-10 w-10 mx-auto mb-3 text-amber-300/60" />
                  <p className="font-medium text-amber-100">NFC cards are disabled</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Turn on &quot;NFC cards&quot; in Settings to link tags to members.
                  </p>
                </div>
              ) : (
                <>
                  <MemberLookupPanel
                    members={customers}
                    step={1}
                    title="Select member"
                    description="Every NFC card must belong to a customer. Start by finding the member you want to link."
                    onMemberResolved={setResolvedMember}
                  />

                  {canManageCards && (
                    <AssignMemberCardPanel
                      member={resolvedMember}
                      disabled={!canManageCards}
                      onAssigned={() => handleCardAssigned()}
                    />
                  )}

                  <NfcCardLookupPanel
                    compact
                    onMemberResolved={setResolvedMember}
                  />

                  <MemberCardRegistry cards={cards} />

                  <AddMemberCardDialog
                    open={addCardDialogOpen}
                    onOpenChange={setAddCardDialogOpen}
                    customers={customers}
                    initialMember={resolvedMember}
                    onAdded={() => handleCardAssigned()}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'coupons' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Member coupons</h2>
                {canEditCoupons && (
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
              {coupons.length === 0 ? (
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
                            onClick={() => void handleDeleteCoupon(coupon.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent className="glass-card border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTierId ? 'Edit membership tier' : 'New membership tier'}</DialogTitle>
            <DialogDescription>
              Design your membership type — saved tiers sync as POS products automatically.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTier} className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Tier name</Label>
                  <Input
                    value={tierForm.name}
                    onChange={(e) => setTierForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Gold Elite"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tagline</Label>
                  <Input
                    value={tierForm.tagline ?? ''}
                    onChange={(e) => setTierForm((f) => ({ ...f, tagline: e.target.value }))}
                    placeholder="Short subtitle for cards"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description & benefits</Label>
                  <Textarea
                    value={tierForm.description ?? ''}
                    onChange={(e) => setTierForm((f) => ({ ...f, description: e.target.value }))}
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
                        onClick={() =>
                          setTierForm((f) => ({ ...f, accentColor: opt.id as MembershipTierAccent }))
                        }
                      />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Playtime discount %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={tierForm.playtimeDiscountPct}
                      onChange={(e) =>
                        setTierForm((f) => ({ ...f, playtimeDiscountPct: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>F&B discount %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={tierForm.fnbDiscountPct}
                      onChange={(e) =>
                        setTierForm((f) => ({ ...f, fnbDiscountPct: Number(e.target.value) }))
                      }
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
                      onChange={(e) =>
                        setTierForm((f) => ({ ...f, retailPrice: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Compare-at price (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={tierForm.compareAtPrice ?? ''}
                      onChange={(e) =>
                        setTierForm((f) => ({
                          ...f,
                          compareAtPrice: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                      placeholder="Strikethrough on POS"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Wallet credit on purchase (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={tierForm.walletCreditOnPurchase ?? 0}
                    onChange={(e) =>
                      setTierForm((f) => ({ ...f, walletCreditOnPurchase: Number(e.target.value) }))
                    }
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
                        setTierForm((f) => ({
                          ...f,
                          defaultMembershipHours: checked ? (f.defaultMembershipHours ?? 4) : null,
                        }))
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
                          setTierForm((f) => ({
                            ...f,
                            defaultMembershipHours: Number(e.target.value) || null,
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Default duration</Label>
                  <Select
                    value={tierForm.defaultDuration ?? 'monthly'}
                    onValueChange={(v: 'weekly' | 'monthly') =>
                      setTierForm((f) => ({ ...f, defaultDuration: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active in POS</Label>
                  <Switch
                    checked={tierForm.isActive ?? true}
                    onCheckedChange={(checked) => setTierForm((f) => ({ ...f, isActive: checked }))}
                  />
                </div>
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
                    cardPaymentFnbEnabled: tierForm.cardPaymentFnbEnabled ?? false,
                    bookingPayAtVenueEnabled: tierForm.bookingPayAtVenueEnabled ?? false,
                    retailPrice: tierForm.retailPrice ?? 0,
                    walletCreditOnPurchase: tierForm.walletCreditOnPurchase ?? 0,
                    defaultDuration: tierForm.defaultDuration ?? 'monthly',
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
              <Button type="button" variant="outline" onClick={() => setTierDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="btn-gradient">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen}>
        <DialogContent className="glass-card border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRechargeId ? 'Edit recharge tier' : 'New recharge tier'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveRechargeTier} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pay amount</Label>
                <Input
                  type="number"
                  min={0}
                  value={rechargeForm.payAmount}
                  onChange={(e) =>
                    setRechargeForm((f) => ({ ...f, payAmount: Number(e.target.value) }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Credit amount</Label>
                <Input
                  type="number"
                  min={0}
                  value={rechargeForm.creditAmount}
                  onChange={(e) =>
                    setRechargeForm((f) => ({ ...f, creditAmount: Number(e.target.value) }))
                  }
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRechargeDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="btn-gradient">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
        <DialogContent className="glass-card border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCouponId ? 'Edit coupon' : 'New coupon'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCoupon} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input
                value={couponForm.code}
                onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                className="font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={couponForm.description}
                onChange={(e) => setCouponForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={couponForm.discountType}
                  onValueChange={(v: 'percentage' | 'fixed') =>
                    setCouponForm((f) => ({ ...f, discountType: v }))
                  }
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
                  onChange={(e) =>
                    setCouponForm((f) => ({ ...f, discountValue: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Enabled</Label>
              <Switch
                checked={couponForm.enabled ?? true}
                onCheckedChange={(checked) => setCouponForm((f) => ({ ...f, enabled: checked }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCouponDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="btn-gradient">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MobilePageShell>
  );
}
