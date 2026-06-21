import React, { useState } from 'react';
import { Loader2, Wallet } from 'lucide-react';
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
import { rechargeMembershipCard } from '@/services/membershipService';

import type { WalletTopUpOffer } from '@/types/membership.types';

type MembershipWalletTopUpDialogProps = {
  offer: WalletTopUpOffer | null;
  onClose: () => void;
  onCredited?: (newBalance?: number) => void;
};

export default function MembershipWalletTopUpDialog({
  offer,
  onClose,
  onCredited,
}: MembershipWalletTopUpDialogProps) {
  const { toast } = useToast();
  const { activeLocationId } = useLocation();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (offer) {
      setAmount(String(offer.suggestedAmount > 0 ? offer.suggestedAmount : ''));
    }
  }, [offer]);

  const creditWallet = async () => {
    if (!offer) return;
    const credit = Number(amount);
    if (!credit || credit <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await rechargeMembershipCard(
        {
          customerId: offer.customerId,
          creditAmount: credit,
          note: `POS membership purchase top-up (bill ${offer.billId.slice(0, 8)})`,
          referenceType: 'bill',
          referenceId: offer.billId,
        },
        activeLocationId,
      );
      toast({
        title: 'Wallet credited',
        description: `₹${credit} added — balance ₹${res.balanceAfter}`,
      });
      onCredited?.(res.balanceAfter);
      onClose();
    } catch (err) {
      toast({
        title: 'Top-up failed',
        description: err instanceof Error ? err.message : 'Could not credit wallet',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!offer} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-card border-cyan-500/25 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-cyan-400" />
            Top up member wallet?
          </DialogTitle>
          <DialogDescription>
            {offer
              ? `${offer.customerName} purchased${offer.tierName ? ` ${offer.tierName}` : ' a membership'}. Credit their prepaid card balance now — tracked on the bill.`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="wallet-topup-amount">Credit amount (₹)</Label>
          <Input
            id="wallet-topup-amount"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-11 bg-black/30 border-white/10"
            disabled={loading}
          />
          {offer && offer.suggestedAmount > 0 && (
            <p className="text-xs text-muted-foreground">
              Suggested: <CurrencyDisplay amount={offer.suggestedAmount} /> (from purchase)
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Skip
          </Button>
          <Button type="button" className="btn-gradient" disabled={loading} onClick={() => void creditWallet()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Credit wallet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
