import React, { useState } from 'react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CreditCard,
  IdCard,
  Layers,
  Link2,
  Loader2,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CurrencyDisplay } from '@/components/ui/currency';
import MemberLookupPanel from '@/components/memberships/MemberLookupPanel';
import NfcCardLookupPanel from '@/components/memberships/NfcCardLookupPanel';
import AssignMemberCardPanel from '@/components/memberships/AssignMemberCardPanel';
import MemberCardRegistry from '@/components/memberships/MemberCardRegistry';
import AssignTierDialog from '@/components/memberships/AssignTierDialog';
import MembershipPanelShell from '@/components/memberships/MembershipPanelShell';
import type { MembershipCardLookupResult, MembershipCardWithMember, MembershipFeatureFlagKey, MembershipRechargeTier, MembershipTier } from '@/types/membership.types';
import type { Customer } from '@/types/pos.types';
import { cn } from '@/lib/utils';
import { scaleIn, staggerContainer, staggerItem } from '@/components/memberships/membershipMotion';

type MemberWorkspaceProps = {
  customers: Customer[];
  cards: MembershipCardWithMember[];
  tiers: MembershipTier[];
  rechargeTiers: MembershipRechargeTier[];
  resolvedMember: MembershipCardLookupResult | null;
  onMemberResolved: (result: MembershipCardLookupResult) => void;
  onCardAssigned: () => void;
  onTierAssigned: (tier: MembershipTier) => void;
  canUse: (key: MembershipFeatureFlagKey) => boolean;
  canExecuteRecharge: boolean;
  canManageCards: boolean;
  canEditCustomers: boolean;
  canEditSettings: boolean;
  inventoryCount: number;
  rechargeAmount: string;
  recharging: boolean;
  onRechargeAmountChange: (value: string) => void;
  onRecharge: (amount: number) => void;
  onOpenSetup?: (section: 'settings') => void;
};

export default function MemberWorkspace({
  customers,
  cards,
  tiers,
  rechargeTiers,
  resolvedMember,
  onMemberResolved,
  onCardAssigned,
  onTierAssigned,
  canUse,
  canExecuteRecharge,
  canManageCards,
  canEditCustomers,
  canEditSettings,
  inventoryCount,
  rechargeAmount,
  recharging,
  onRechargeAmountChange,
  onRecharge,
  onOpenSetup,
}: MemberWorkspaceProps) {
  const [assignTierOpen, setAssignTierOpen] = useState(false);
  const [showRegistry, setShowRegistry] = useState(true);

  const member = resolvedMember?.customer;
  const tier = resolvedMember?.tier;

  const handleTierAssigned = (assigned: MembershipTier) => {
    if (!resolvedMember) return;
    onTierAssigned(assigned);
    onMemberResolved({
      ...resolvedMember,
      tier: assigned,
      customer: {
        ...resolvedMember.customer,
        membershipTierId: assigned.id,
      },
    });
  };

  return (
    <motion.div
      className="space-y-5"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <motion.div className="space-y-5" variants={staggerItem}>
          <MemberLookupPanel
            members={customers}
            includeAllCustomers
            step={1}
            title="Find customer"
            description="Search by Customer ID, phone, or name — or tap an NFC card below."
            onMemberResolved={onMemberResolved}
            layoutKey="lookup"
          />

          {canUse('nfc_cards_enabled') && (
            <NfcCardLookupPanel compact onMemberResolved={onMemberResolved} />
          )}

          <AnimatePresence mode="wait">
            {member ? (
              <MembershipPanelShell
                key={member.id}
                layoutKey={member.id}
                step={2}
                accent="emerald"
                title={member.name}
                description="Member profile — choose an action below."
                icon={<IdCard className="h-5 w-5" />}
              >
              <div className="space-y-4">
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <div className="space-y-1">
                    {member.customerId && (
                      <span className="inline-block rounded-md bg-black/30 px-2.5 py-1 font-mono text-xs text-emerald-200/90 border border-emerald-500/20">
                        {member.customerId}
                      </span>
                    )}
                    <p className="text-sm text-muted-foreground">{member.phone}</p>
                    {member.membershipExpiryDate && (
                      <p className="text-xs text-muted-foreground">
                        Expires {format(new Date(member.membershipExpiryDate), 'dd MMM yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {tier ? (
                      <Badge className="bg-violet-500/20 text-violet-200 border-violet-400/30">
                        {tier.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        No tier
                      </Badge>
                    )}
                    {canUse('card_balance_enabled') && (
                      <p className="text-2xl font-bold tabular-nums mt-2 text-cyan-100">
                        <CurrencyDisplay amount={member.cardBalance ?? 0} />
                      </p>
                    )}
                  </div>
                </div>

                {resolvedMember?.card?.uid && (
                  <p className="text-xs font-mono text-cyan-200/90 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    NFC: {resolvedMember.card.uid}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {canEditCustomers && canUse('tier_plans_enabled') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setAssignTierOpen(true)}
                    >
                      <Layers className="h-4 w-4" />
                      {tier ? 'Change tier' : 'Assign tier'}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="gap-1.5" asChild>
                    <Link to="/pos">
                      <ShoppingCart className="h-4 w-4" />
                      Sell at POS
                    </Link>
                  </Button>
                </div>

                {canUse('card_balance_enabled') && (
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-cyan-300" />
                      <p className="font-medium text-sm">Recharge wallet</p>
                    </div>

                    {canUse('recharge_tiers_enabled') && rechargeTiers.length > 0 && (
                      <motion.div
                        className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                      >
                        {rechargeTiers
                          .filter((t) => t.isActive)
                          .map((rt) => (
                            <motion.div key={rt.id} variants={staggerItem}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-auto py-2 w-full flex flex-col gap-0.5 border-cyan-500/20 hover:border-cyan-400/50 hover:bg-cyan-500/10 transition-colors"
                                disabled={!canExecuteRecharge || recharging}
                                onClick={() => onRecharge(rt.creditAmount)}
                              >
                              <span className="text-[10px] text-muted-foreground">
                                Pay <CurrencyDisplay amount={rt.payAmount} />
                              </span>
                              <span className="font-semibold text-cyan-100 text-xs">
                                +<CurrencyDisplay amount={rt.creditAmount} />
                              </span>
                              </Button>
                            </motion.div>
                          ))}
                      </motion.div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder="Custom amount"
                        value={rechargeAmount}
                        onChange={(e) => onRechargeAmountChange(e.target.value)}
                        disabled={!canExecuteRecharge || recharging}
                        className="bg-black/30 border-white/10 h-10"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="btn-gradient shrink-0"
                        disabled={!canExecuteRecharge || recharging || !rechargeAmount}
                        onClick={() => onRecharge(Number(rechargeAmount))}
                      >
                        {recharging ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Recharge'}
                      </Button>
                    </div>
                  </div>
                )}

                {canUse('nfc_cards_enabled') && canManageCards && (
                  <AssignMemberCardPanel
                    member={resolvedMember}
                    disabled={!canManageCards}
                    onAssigned={() => onCardAssigned()}
                  />
                )}
              </div>
            </MembershipPanelShell>
            ) : (
              <motion.div
                key="empty"
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <IdCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                </motion.div>
                <p className="font-medium text-muted-foreground">No customer selected</p>
                <p className="text-sm text-muted-foreground/80 mt-1">
                  Search above or tap an NFC card to get started.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div className="space-y-3" variants={staggerItem}>
          {canUse('nfc_cards_enabled') && (
            <>
              <div className="flex items-center justify-between lg:hidden">
                <p className="text-sm font-medium">Card registry</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRegistry((v) => !v)}
                >
                  {showRegistry ? 'Hide' : 'Show'}
                </Button>
              </div>
              <div className={cn(!showRegistry && 'hidden lg:block')}>
                {canUse('physical_cards_inventory_enabled') && inventoryCount > 0 && (
                  <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">
                    {inventoryCount} card(s) in inventory awaiting assignment.
                  </p>
                )}
                <MemberCardRegistry cards={cards} />
              </div>
            </>
          )}

          {!canUse('nfc_cards_enabled') && canEditSettings && onOpenSetup && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm">
              <p className="font-medium text-amber-100 flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                NFC cards are off
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Enable NFC cards in Program setup to link physical tags.
              </p>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="px-0 h-auto mt-1 text-amber-200"
                onClick={() => onOpenSetup('settings')}
              >
                Open settings →
              </Button>
            </div>
          )}
        </motion.div>
      </div>

      <AssignTierDialog
        open={assignTierOpen}
        onOpenChange={setAssignTierOpen}
        member={resolvedMember}
        tiers={tiers}
        onAssigned={handleTierAssigned}
      />
    </motion.div>
  );
}
