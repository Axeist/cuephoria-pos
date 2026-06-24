import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck,
  ChevronRight,
  CreditCard,
  Gift,
  Layers,
  Loader2,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import MembershipTierFormDialog from '@/components/memberships/MembershipTierFormDialog';
import { emptyTierForm } from '@/components/memberships/membershipHubConstants';
import type { MembershipFeatureFlagKey, MembershipTier } from '@/types/membership.types';
import { DEFAULT_MEMBERSHIP_FEATURE_FLAGS } from '@/types/membership.types';

type WizardStep = 'welcome' | 'enable' | 'tier' | 'features' | 'done';

const OPTIONAL_FEATURES: {
  key: MembershipFeatureFlagKey;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    key: 'nfc_cards_enabled',
    label: 'NFC cards',
    description: 'Tap-to-identify members at POS and stations.',
    icon: CreditCard,
  },
  {
    key: 'card_balance_enabled',
    label: 'Wallet balance',
    description: 'Prepaid credit on member accounts.',
    icon: Wallet,
  },
  {
    key: 'recharge_tiers_enabled',
    label: 'Recharge bundles',
    description: 'Preset top-up amounts for staff.',
    icon: Wallet,
  },
  {
    key: 'member_coupons_enabled',
    label: 'Member coupons',
    description: 'Exclusive codes for bookings and sessions.',
    icon: Gift,
  },
];

type MembershipSetupWizardProps = {
  canEditSettings: boolean;
  canEditTiers: boolean;
  savingSettings: boolean;
  onSaveSettings: (flags: Record<MembershipFeatureFlagKey, boolean>) => Promise<void>;
  onSaveTier: (
    form: Partial<MembershipTier> & { name: string },
    editingId: string | null,
  ) => Promise<MembershipTier | undefined>;
  onComplete: () => void;
  onSkip: () => void;
};

export default function MembershipSetupWizard({
  canEditSettings,
  canEditTiers,
  savingSettings,
  onSaveSettings,
  onSaveTier,
  onComplete,
  onSkip,
}: MembershipSetupWizardProps) {
  const [step, setStep] = useState<WizardStep>('welcome');
  const [flags, setFlags] = useState({
    ...DEFAULT_MEMBERSHIP_FEATURE_FLAGS,
    module_enabled: true,
    tier_plans_enabled: true,
    nfc_cards_enabled: true,
    card_balance_enabled: true,
    recharge_tiers_enabled: true,
    member_coupons_enabled: true,
  });
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [tierForm, setTierForm] = useState(emptyTierForm());
  const [tierCreated, setTierCreated] = useState(false);
  const [savingTier, setSavingTier] = useState(false);

  const steps: WizardStep[] = ['welcome', 'enable', 'tier', 'features', 'done'];
  const stepIndex = steps.indexOf(step);

  const enableModule = async () => {
    if (!canEditSettings) {
      setStep('tier');
      return;
    }
    await onSaveSettings(flags);
    setStep('tier');
  };

  const handleTierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditTiers) return;
    setSavingTier(true);
    try {
      await onSaveTier(tierForm, null);
      setTierCreated(true);
      setTierDialogOpen(false);
      setStep('features');
    } finally {
      setSavingTier(false);
    }
  };

  const finishSetup = async () => {
    if (canEditSettings) {
      await onSaveSettings(flags);
    }
    onComplete();
  };

  return (
    <div className="relative rounded-2xl border border-violet-500/25 bg-gradient-to-b from-violet-500/10 via-transparent to-transparent overflow-hidden">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/15 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute top-4 right-4 z-10">
        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onSkip}>
          <X className="h-4 w-4 mr-1" />
          Skip setup
        </Button>
      </div>

      <div className="px-4 sm:px-8 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="relative h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-400 to-indigo-400"
                initial={{ width: '0%' }}
                animate={{ width: i <= stepIndex ? '100%' : '0%' }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="max-w-lg mx-auto text-center space-y-6 py-4"
            >
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/20 border border-violet-400/30">
                <Sparkles className="h-8 w-8 text-violet-300" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Set up memberships</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  Create tier plans, link NFC cards, recharge wallets, and offer member-only perks.
                  We&apos;ll walk you through the essentials in a few steps.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  { icon: Layers, label: 'Tier plans', sub: 'Discounts synced to POS' },
                  { icon: CreditCard, label: 'NFC cards', sub: 'Tap to identify members' },
                  { icon: Wallet, label: 'Wallet', sub: 'Prepaid balance & top-ups' },
                  { icon: Gift, label: 'Coupons', sub: 'Member-only promos' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-white/8 bg-white/[0.03] p-3 flex gap-3"
                  >
                    <item.icon className="h-5 w-5 text-violet-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="btn-gradient gap-2" onClick={() => setStep('enable')}>
                Get started
                <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {step === 'enable' && (
            <motion.div
              key="enable"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="max-w-md mx-auto space-y-6 py-4"
            >
              <div className="text-center">
                <h2 className="text-xl font-bold">Enable memberships</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Turn on the module for this branch. You can fine-tune features later.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">Memberships module</p>
                  <p className="text-xs text-muted-foreground">Required for all membership features</p>
                </div>
                <Switch
                  checked={flags.module_enabled}
                  disabled={!canEditSettings}
                  onCheckedChange={(checked) =>
                    setFlags((f) => ({ ...f, module_enabled: checked, tier_plans_enabled: checked }))
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('welcome')}>
                  Back
                </Button>
                <Button
                  className="btn-gradient flex-1 gap-2"
                  disabled={!flags.module_enabled || savingSettings}
                  onClick={() => void enableModule()}
                >
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'tier' && (
            <motion.div
              key="tier"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="max-w-md mx-auto space-y-6 py-4"
            >
              <div className="text-center">
                <h2 className="text-xl font-bold">Create your first tier</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Tiers auto-sync as products in your POS catalog.
                </p>
              </div>
              {tierCreated ? (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-center">
                  <BadgeCheck className="h-8 w-8 text-emerald-300 mx-auto mb-2" />
                  <p className="font-medium text-emerald-100">Tier created</p>
                </div>
              ) : (
                <Button className="btn-gradient w-full" onClick={() => setTierDialogOpen(true)}>
                  Design first tier
                </Button>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('enable')}>
                  Back
                </Button>
                <Button
                  className="btn-gradient flex-1 gap-2"
                  onClick={() => setStep('features')}
                >
                  {tierCreated ? 'Continue' : 'Skip for now'}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'features' && (
            <motion.div
              key="features"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="max-w-lg mx-auto space-y-6 py-4"
            >
              <div className="text-center">
                <h2 className="text-xl font-bold">Optional features</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enable what your venue needs. Change anytime in Program setup.
                </p>
              </div>
              <div className="space-y-3">
                {OPTIONAL_FEATURES.map((feat) => (
                  <div
                    key={feat.key}
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/8 px-4 py-3"
                  >
                    <div className="flex gap-3">
                      <feat.icon className="h-5 w-5 text-violet-300 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{feat.label}</p>
                        <p className="text-xs text-muted-foreground">{feat.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={flags[feat.key]}
                      disabled={!canEditSettings}
                      onCheckedChange={(checked) => setFlags((f) => ({ ...f, [feat.key]: checked }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('tier')}>
                  Back
                </Button>
                <Button
                  className="btn-gradient flex-1 gap-2"
                  disabled={savingSettings}
                  onClick={() => void finishSetup().then(() => setStep('done'))}
                >
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save & finish
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto text-center space-y-6 py-8"
            >
              <BadgeCheck className="h-14 w-14 text-emerald-400 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold">You&apos;re all set</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Head to the member desk to find customers, assign tiers, recharge wallets, and link NFC cards.
                </p>
              </div>
              <Button className="btn-gradient gap-2" onClick={onComplete}>
                Go to member desk
                <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <MembershipTierFormDialog
        open={tierDialogOpen}
        onOpenChange={setTierDialogOpen}
        tierForm={tierForm}
        onTierFormChange={setTierForm}
        editingTierId={null}
        onSubmit={handleTierSubmit}
        saving={savingTier}
        simplified
      />
    </div>
  );
}
