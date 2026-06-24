import React from 'react';
import { Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MobilePageShell } from '@/components/mobile/MobilePageShell';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { Badge } from '@/components/ui/badge';
import MembershipHubStats, { type HubStatAction } from '@/components/memberships/MembershipHubStats';
import MembershipSetupWizard from '@/components/memberships/MembershipSetupWizard';
import MemberWorkspace from '@/components/memberships/MemberWorkspace';
import MembershipProgramSetup from '@/components/memberships/MembershipProgramSetup';
import MembershipZoneSwitcher from '@/components/memberships/MembershipZoneSwitcher';
import MembershipLoadingShell from '@/components/memberships/MembershipLoadingShell';
import { fadeSlideUp } from '@/components/memberships/membershipMotion';
import { useMembershipHub } from '@/hooks/useMembershipHub';
import { usePermissions } from '@/context/PermissionsContext';
import type { MembershipFeatureFlagKey } from '@/types/membership.types';
import type { SetupSection } from '@/components/memberships/membershipHubConstants';

export default function MembershipsPage() {
  const { can } = usePermissions();
  const hub = useMembershipHub();

  if (!can('memberships.view')) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleStatClick = (action: HubStatAction) => {
    if (action === 'members') {
      hub.setActiveZone('ops');
      return;
    }
    hub.setActiveZone('setup');
    const section: SetupSection =
      action === 'tiers' ? 'tiers' : action === 'coupons' ? 'coupons' : 'settings';
    if (action === 'cards') {
      hub.setActiveZone('ops');
    } else {
      hub.setActiveSection(section);
    }
  };

  const handleWizardComplete = () => {
    hub.dismissWizard();
    hub.setActiveZone('ops');
    void hub.loadHubData();
  };

  const subtitle = hub.activeLocation
    ? `Member desk and program setup for ${hub.activeLocation.name}.`
    : 'Member desk and program setup.';

  const contentKey = hub.showWizard
    ? 'wizard'
    : hub.activeZone === 'ops'
      ? 'ops'
      : `setup-${hub.activeSection}`;

  return (
    <MobilePageShell className="space-y-4 sm:space-y-6 relative">
      {/* Ambient background orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <motion.div
          className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl"
          animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 -left-32 h-64 w-64 rounded-full bg-cyan-500/8 blur-3xl"
          animate={{ x: [0, -15, 0], y: [0, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <MobilePageHeader
          title="Memberships"
          subtitle={subtitle}
          badge={
            !hub.isEnabled ? (
              <Badge variant="outline" className="border-amber-500/40 text-amber-300">
                Module off
              </Badge>
            ) : null
          }
          actions={
            !hub.showWizard ? (
              <MembershipZoneSwitcher
                activeZone={hub.activeZone}
                onZoneChange={hub.setActiveZone}
              />
            ) : undefined
          }
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {!hub.showWizard && !hub.loading && !hub.featuresLoading && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
          >
            <MembershipHubStats
              activeMembersCount={hub.activeMembersCount}
              tiers={hub.tiers}
              cards={hub.cards}
              coupons={hub.coupons}
              onStatClick={handleStatClick}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {hub.loading || hub.featuresLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MembershipLoadingShell />
          </motion.div>
        ) : hub.showWizard ? (
          <motion.div
            key="wizard"
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <MembershipSetupWizard
              canEditSettings={hub.canEditSettings}
              canEditTiers={hub.canEditTiers}
              savingSettings={hub.savingSettings}
              onSaveSettings={(flags) => hub.saveSettings(flags)}
              onSaveTier={hub.handleSaveTier}
              onComplete={handleWizardComplete}
              onSkip={hub.dismissWizard}
            />
          </motion.div>
        ) : (
          <motion.div
            key={contentKey}
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {hub.activeZone === 'ops' ? (
              <MemberWorkspace
                customers={hub.customers}
                cards={hub.cards}
                tiers={hub.tiers}
                rechargeTiers={hub.rechargeTiers}
                resolvedMember={hub.resolvedMember}
                onMemberResolved={hub.refreshMember}
                onCardAssigned={hub.handleCardAssigned}
                onTierAssigned={() => {}}
                canUse={hub.canUse as (key: MembershipFeatureFlagKey) => boolean}
                canExecuteRecharge={hub.canExecuteRecharge}
                canManageCards={hub.canManageCards}
                canEditCustomers={hub.canEditCustomers}
                canEditSettings={hub.canEditSettings}
                inventoryCount={hub.inventoryCount}
                rechargeAmount={hub.rechargeAmount}
                recharging={hub.recharging}
                onRechargeAmountChange={hub.setRechargeAmount}
                onRecharge={(amount) => void hub.handleMemberRecharge(amount)}
                onOpenSetup={() => hub.setActiveSection('settings')}
              />
            ) : (
              <MembershipProgramSetup
                activeSection={hub.activeSection}
                onSectionChange={hub.setActiveSection}
                tiers={hub.tiers}
                rechargeTiers={hub.rechargeTiers}
                coupons={hub.coupons}
                localFlags={hub.localFlags}
                onFlagsChange={hub.setLocalFlags}
                canEditTiers={hub.canEditTiers}
                canEditRecharge={hub.canEditRecharge}
                canEditCoupons={hub.canEditCoupons}
                canEditSettings={hub.canEditSettings}
                canUse={hub.canUse as (key: MembershipFeatureFlagKey) => boolean}
                savingSettings={hub.savingSettings}
                onSaveSettings={() => hub.saveSettings()}
                onSaveTier={hub.handleSaveTier}
                onDeleteTier={hub.handleDeleteTier}
                onSaveCoupon={hub.handleSaveCoupon}
                onDeleteCoupon={hub.handleDeleteCoupon}
                onSaveRechargeTier={hub.handleSaveRechargeTier}
                onDeleteRechargeTier={hub.handleDeleteRechargeTier}
                emptyTierForm={hub.emptyTierForm}
                emptyCouponForm={hub.emptyCouponForm}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </MobilePageShell>
  );
}
