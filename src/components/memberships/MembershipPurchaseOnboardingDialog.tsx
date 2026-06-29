import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Loader2,
  Sparkles,
  Wallet,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyDisplay } from '@/components/ui/currency';
import { useLocation } from '@/context/LocationContext';
import { useToast } from '@/hooks/use-toast';
import { useNfcWedgeListener } from '@/hooks/useNfcWedgeListener';
import { useMembershipFeatures } from '@/hooks/useMembershipFeatures';
import { assignNfcCard, rechargeMembershipCard } from '@/services/membershipService';
import type { MembershipPurchaseFollowUp } from '@/types/membership.types';
import { isValidNfcUid, normalizeNfcUid } from '@/utils/nfcUid.utils';
import {
  normalizeTierAccent,
  TIER_ACCENT_STYLES,
} from '@/components/memberships/membershipTierTheme';
import { cn } from '@/lib/utils';
import { useEmployeePinGate } from '@/hooks/useEmployeePinGate';
import EmployeePinVerificationDialog from '@/components/EmployeePinVerificationDialog';
import { CRITICAL_PIN_ACTIONS } from '@/constants/criticalEmployeePinActions';
import { gateAsyncAction } from '@/utils/employeePinGate.utils';

type Step = 'welcome' | 'wallet' | 'card' | 'done';

type MembershipPurchaseOnboardingDialogProps = {
  followUp: MembershipPurchaseFollowUp | null;
  onClose: () => void;
  onWalletCredited?: (newBalance?: number) => void;
  onCardAssigned?: () => void;
};

export default function MembershipPurchaseOnboardingDialog({
  followUp,
  onClose,
  onWalletCredited,
  onCardAssigned,
}: MembershipPurchaseOnboardingDialogProps) {
  const { toast } = useToast();
  const { activeLocationId } = useLocation();
  const { canUse } = useMembershipFeatures();
  const walletEnabled = canUse('card_balance_enabled');
  const nfcEnabled = canUse('nfc_cards_enabled');
  const {
    showPinDialog,
    setShowPinDialog,
    pendingActionKey,
    requestEmployeePin,
    handlePinSuccess,
  } = useEmployeePinGate();

  const [step, setStep] = useState<Step>('welcome');
  const [amount, setAmount] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);
  const [cardUid, setCardUid] = useState('');
  const [cardLoading, setCardLoading] = useState(false);

  const accent = normalizeTierAccent(followUp?.tierAccentColor);
  const accentStyle = TIER_ACCENT_STYLES[accent];

  const steps = useMemo(() => {
    const list: Step[] = ['welcome'];
    if (walletEnabled) list.push('wallet');
    if (nfcEnabled) list.push('card');
    return list;
  }, [walletEnabled, nfcEnabled]);

  const stepIndex = steps.indexOf(step);

  useEffect(() => {
    if (followUp) {
      setStep('welcome');
      setCardUid('');
      const suggested = followUp.suggestedWalletAmount;
      setAmount(suggested > 0 ? String(suggested) : '');
    }
  }, [followUp]);

  const advance = useCallback(() => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1]);
    } else {
      setStep('done');
      onClose();
    }
  }, [onClose, step, steps]);

  const skipWallet = () => {
    advance();
  };

  const creditWallet = async () => {
    if (!followUp) return;
    const credit = Number(amount);
    if (!credit || credit <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    setWalletLoading(true);
    try {
      await gateAsyncAction(
        requestEmployeePin,
        CRITICAL_PIN_ACTIONS.MEMBER_RECHARGE,
        async () => {
          const res = await rechargeMembershipCard(
            {
              customerId: followUp.customerId,
              creditAmount: credit,
              note: `POS membership onboarding (bill ${followUp.billId.slice(0, 8)})`,
              referenceType: 'bill',
              referenceId: followUp.billId,
            },
            activeLocationId,
          );
          toast({
            title: 'Wallet credited',
            description: `₹${credit} added — balance ₹${res.balanceAfter}`,
          });
          onWalletCredited?.(res.balanceAfter);
          advance();
        },
        {
          amount: credit,
          customerName: followUp.customerName,
        },
      );
    } catch (err) {
      toast({
        title: 'Top-up failed',
        description: err instanceof Error ? err.message : 'Could not credit wallet',
        variant: 'destructive',
      });
    } finally {
      setWalletLoading(false);
    }
  };

  const linkCard = useCallback(
    async (rawUid: string) => {
      if (!followUp) return;
      const normalized = normalizeNfcUid(rawUid);
      if (!isValidNfcUid(normalized)) {
        toast({
          title: 'Invalid card UID',
          description: 'Enter 4–32 hex characters from the NFC tag.',
          variant: 'destructive',
        });
        return;
      }
      setCardUid(normalized);
      setCardLoading(true);
      try {
        await gateAsyncAction(
          requestEmployeePin,
          CRITICAL_PIN_ACTIONS.MEMBER_CARD_ASSIGN,
          async () => {
            await assignNfcCard(
              {
                uid: normalized,
                customerId: followUp.customerId,
                locationId: activeLocationId,
              },
              activeLocationId,
            );
            toast({
              title: 'Card linked',
              description: `${normalized} → ${followUp.customerDisplayId || followUp.customerName}`,
            });
            onCardAssigned?.();
            setStep('done');
            onClose();
          },
          { customerName: followUp.customerName },
        );
      } catch (err) {
        toast({
          title: 'Link failed',
          description: err instanceof Error ? err.message : 'Could not link card',
          variant: 'destructive',
        });
      } finally {
        setCardLoading(false);
      }
    },
    [activeLocationId, followUp, onCardAssigned, onClose, requestEmployeePin, toast],
  );

  useNfcWedgeListener({
    enabled: Boolean(followUp && step === 'card' && !cardLoading),
    onScan: (uid) => void linkCard(uid),
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <>
    <Dialog open={!!followUp} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'glass-card max-w-md border',
          accentStyle.border,
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'welcome' ? (
              <Sparkles className={cn('h-5 w-5', accentStyle.text)} />
            ) : step === 'wallet' ? (
              <Wallet className="h-5 w-5 text-cyan-400" />
            ) : (
              <CreditCard className="h-5 w-5 text-violet-400" />
            )}
            {step === 'welcome' && 'Membership activated'}
            {step === 'wallet' && 'Recharge member wallet'}
            {step === 'card' && 'Assign NFC card'}
          </DialogTitle>
          <DialogDescription>
            {followUp && step === 'welcome' && (
              <>
                <span className="font-medium text-foreground">{followUp.customerName}</span>
                {followUp.customerDisplayId ? ` (${followUp.customerDisplayId})` : ''} is now a{' '}
                <span className={cn('font-semibold', accentStyle.text)}>
                  {followUp.tierName ?? 'member'}
                </span>
                . Complete setup in the next steps.
              </>
            )}
            {step === 'wallet' &&
              'Credit their prepaid wallet now — amount is tracked against this sale.'}
            {step === 'card' &&
              'Tap or scan the NFC tag to link a physical membership card to this customer.'}
          </DialogDescription>
        </DialogHeader>

        {steps.length > 1 && step !== 'done' && (
          <div className="flex items-center gap-1.5 py-1">
            {steps.map((s, i) => (
              <div
                key={s}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i <= stepIndex ? 'bg-cuephoria-lightpurple' : 'bg-white/10',
                )}
              />
            ))}
          </div>
        )}

        {step === 'welcome' && followUp && (
          <div
            className={cn(
              'rounded-xl border bg-gradient-to-br p-4 space-y-2',
              accentStyle.border,
              accentStyle.bg,
            )}
          >
            <p className={cn('text-lg font-bold', accentStyle.text)}>
              {followUp.tierName ?? 'Membership'}
            </p>
            {(followUp.walletCreditOnPurchase ?? 0) > 0 && walletEnabled && (
              <p className="text-sm text-muted-foreground">
                Includes{' '}
                <CurrencyDisplay amount={followUp.walletCreditOnPurchase ?? 0} /> wallet credit on
                setup.
              </p>
            )}
            {(walletEnabled || nfcEnabled) && (
              <p className="text-sm text-muted-foreground">
                {walletEnabled && nfcEnabled
                  ? 'Next: recharge wallet and link their NFC card.'
                  : walletEnabled
                    ? 'Next: recharge their member wallet.'
                    : 'Next: link their NFC card.'}
              </p>
            )}
          </div>
        )}

        {step === 'wallet' && followUp && (
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="onboard-wallet-amount">Credit amount (₹)</Label>
              <Input
                id="onboard-wallet-amount"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 bg-black/30 border-white/10"
                disabled={walletLoading}
              />
              {followUp.suggestedWalletAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Suggested: <CurrencyDisplay amount={followUp.suggestedWalletAmount} />
                  {(followUp.walletCreditOnPurchase ?? 0) > 0 && ' (tier included credit)'}
                </p>
              )}
            </div>
            {(followUp.walletCreditOnPurchase ?? 0) > 0 &&
              amount !== String(followUp.walletCreditOnPurchase) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setAmount(String(followUp.walletCreditOnPurchase))}
                >
                  Use included <CurrencyDisplay amount={followUp.walletCreditOnPurchase ?? 0} /> credit
                </Button>
              )}
          </div>
        )}

        {step === 'card' && followUp && (
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="onboard-card-uid">NFC card UID</Label>
              <Input
                id="onboard-card-uid"
                data-nfc-wedge="true"
                value={cardUid}
                onChange={(e) => setCardUid(e.target.value.toUpperCase())}
                placeholder="Tap card or enter hex UID"
                className="h-11 font-mono bg-black/30 border-white/10 uppercase"
                disabled={cardLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void linkCard(cardUid);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Member: {followUp.customerDisplayId || followUp.customerName}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          {step === 'welcome' && (
            <Button type="button" className="btn-gradient w-full sm:w-auto gap-1" onClick={advance}>
              Continue setup
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {step === 'wallet' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={skipWallet}
                disabled={walletLoading}
              >
                Skip for now
              </Button>
              <Button
                type="button"
                className="btn-gradient gap-1"
                disabled={walletLoading}
                onClick={() => void creditWallet()}
              >
                {walletLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Credit wallet
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          )}
          {step === 'card' && (
            <>
              <Button type="button" variant="outline" onClick={onClose} disabled={cardLoading}>
                Skip for now
              </Button>
              <Button
                type="button"
                className="btn-gradient gap-1"
                disabled={cardLoading || !cardUid}
                onClick={() => void linkCard(cardUid)}
              >
                {cardLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Link card
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <EmployeePinVerificationDialog
      open={showPinDialog}
      onOpenChange={setShowPinDialog}
      actionKey={pendingActionKey}
      onSuccess={handlePinSuccess}
    />
    </>
  );
}
