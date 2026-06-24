import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useProducts } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/context/PermissionsContext';
import { useLocation } from '@/context/LocationContext';
import { usePOS } from '@/context/POSContext';
import { useMembershipFeatures } from '@/hooks/useMembershipFeatures';
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
import {
  emptyCouponForm,
  emptyRechargeForm,
  emptyTierForm,
  parseLegacyTab,
  WIZARD_SKIP_KEY,
  type HubZone,
  type SetupSection,
} from '@/components/memberships/membershipHubConstants';

export function useMembershipHub() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { refreshFromDB } = useProducts();
  const { can } = usePermissions();
  const { activeLocationId, activeLocation } = useLocation();
  const { loading: featuresLoading, flags, canUse, isEnabled } = useMembershipFeatures();
  const { customers = [] } = usePOS();

  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [rechargeTiers, setRechargeTiers] = useState<MembershipRechargeTier[]>([]);
  const [coupons, setCoupons] = useState<MembershipCoupon[]>([]);
  const [cards, setCards] = useState<MembershipCardWithMember[]>([]);
  const [localFlags, setLocalFlags] = useState({ ...DEFAULT_MEMBERSHIP_FEATURE_FLAGS });
  const [savingSettings, setSavingSettings] = useState(false);
  const [wizardDismissed, setWizardDismissed] = useState(
    () => sessionStorage.getItem(WIZARD_SKIP_KEY) === '1',
  );

  const [resolvedMember, setResolvedMember] = useState<MembershipCardLookupResult | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [recharging, setRecharging] = useState(false);

  const canEditSettings = can('memberships.settings.edit');
  const canEditTiers = can('memberships.tiers.edit');
  const canEditRecharge = can('memberships.recharge.edit');
  const canExecuteRecharge = can('memberships.recharge.execute');
  const canManageCards = can('memberships.cards.manage');
  const canEditCoupons = can('memberships.coupons.edit');
  const canEditCustomers = can('memberships.customers.edit');

  const activeMembersCount = useMemo(
    () => customers.filter((c) => c.membershipTierId || c.isMember).length,
    [customers],
  );

  const inventoryCount = useMemo(
    () => cards.filter((c) => c.status === 'inventory' && !c.customerId).length,
    [cards],
  );

  // URL zone + section (with legacy ?tab= redirect)
  useEffect(() => {
    const legacyTab = searchParams.get('tab');
    if (legacyTab) {
      const mapped = parseLegacyTab(legacyTab);
      if (mapped) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('tab');
            next.set('zone', mapped.zone);
            if (mapped.section) next.set('section', mapped.section);
            return next;
          },
          { replace: true },
        );
      }
    }
  }, [searchParams, setSearchParams]);

  const zoneParam = searchParams.get('zone');
  const activeZone: HubZone = zoneParam === 'setup' ? 'setup' : 'ops';

  const sectionParam = searchParams.get('section');
  const activeSection: SetupSection =
    sectionParam === 'bundles' ||
    sectionParam === 'coupons' ||
    sectionParam === 'settings'
      ? sectionParam
      : 'tiers';

  const setActiveZone = useCallback(
    (zone: HubZone) => {
      if (zone === 'ops') setResolvedMember(null);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (zone === 'ops') {
            next.set('zone', 'ops');
            next.delete('section');
          } else {
            next.set('zone', 'setup');
            if (!next.get('section')) next.set('section', 'tiers');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setActiveSection = useCallback(
    (section: SetupSection) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('zone', 'setup');
          next.set('section', section);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const showWizard = useMemo(() => {
    if (wizardDismissed || featuresLoading || loading) return false;
    if (!isEnabled && canEditSettings) return true;
    if (isEnabled && tiers.length === 0 && canEditTiers) return true;
    return false;
  }, [wizardDismissed, featuresLoading, loading, isEnabled, tiers.length, canEditSettings, canEditTiers]);

  const dismissWizard = useCallback(() => {
    sessionStorage.setItem(WIZARD_SKIP_KEY, '1');
    setWizardDismissed(true);
  }, []);

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

  const saveSettings = async (featureFlags?: Record<MembershipFeatureFlagKey, boolean>) => {
    if (!canEditSettings || !activeLocationId) return;
    setSavingSettings(true);
    try {
      await updateMembershipSettings(
        {
          locationId: activeLocationId,
          featureFlags: featureFlags ?? localFlags,
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
      throw err;
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveTier = async (tierForm: Partial<MembershipTier> & { name: string }, editingTierId: string | null) => {
    if (!canEditTiers || !tierForm.name.trim()) return;
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
    await queryClient.invalidateQueries({ queryKey: ['products'] });
    await refreshFromDB(true);
    toast({
      title: editingTierId ? 'Tier updated' : 'Tier created',
      description: 'Membership product synced to POS catalog.',
    });
    return res.tier;
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!canEditTiers) return;
    await deleteMembershipTier(tierId, activeLocationId);
    setTiers((prev) => prev.filter((t) => t.id !== tierId));
    await queryClient.invalidateQueries({ queryKey: ['products'] });
    await refreshFromDB(true);
    toast({ title: 'Tier deleted' });
  };

  const handleSaveRechargeTier = async (
    rechargeForm: Partial<MembershipRechargeTier> & { payAmount: number; creditAmount: number },
    editingRechargeId: string | null,
  ) => {
    if (!canEditRecharge) return;
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
    toast({ title: editingRechargeId ? 'Recharge tier updated' : 'Recharge tier created' });
    return res.rechargeTier;
  };

  const handleDeleteRechargeTier = async (id: string) => {
    if (!canEditRecharge) return;
    await deleteRechargeTier(id, activeLocationId);
    setRechargeTiers((prev) => prev.filter((t) => t.id !== id));
    toast({ title: 'Recharge tier deleted' });
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

  const handleSaveCoupon = async (
    couponForm: Partial<MembershipCoupon> & { code: string },
    editingCouponId: string | null,
  ) => {
    if (!canEditCoupons || !couponForm.code.trim()) return;
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
    toast({ title: editingCouponId ? 'Coupon updated' : 'Coupon created' });
    return res.coupon;
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!canEditCoupons) return;
    await deleteMembershipCoupon(id);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    toast({ title: 'Coupon deleted' });
  };

  const handleCardAssigned = useCallback(() => {
    void loadHubData();
  }, [loadHubData]);

  const refreshMember = useCallback((result: MembershipCardLookupResult) => {
    setResolvedMember(result);
  }, []);

  return {
    activeLocation,
    activeLocationId,
    activeMembersCount,
    activeSection,
    activeZone,
    canEditCoupons,
    canEditCustomers,
    canEditRecharge,
    canEditSettings,
    canEditTiers,
    canExecuteRecharge,
    canManageCards,
    canUse,
    cards,
    coupons,
    customers,
    dismissWizard,
    emptyCouponForm,
    emptyRechargeForm,
    emptyTierForm,
    featuresLoading,
    flags,
    handleCardAssigned,
    handleDeleteCoupon,
    handleDeleteRechargeTier,
    handleDeleteTier,
    handleMemberRecharge,
    handleSaveCoupon,
    handleSaveRechargeTier,
    handleSaveTier,
    inventoryCount,
    isEnabled,
    loadHubData,
    loading,
    localFlags,
    rechargeAmount,
    rechargeTiers,
    recharging,
    refreshMember,
    resolvedMember,
    saveSettings,
    savingSettings,
    setActiveSection,
    setActiveZone,
    setLocalFlags,
    setRechargeAmount,
    setResolvedMember,
    showWizard,
    tiers,
  };
}
