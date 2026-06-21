import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Timer, ReceiptText } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import type { EarlyEndDetails } from '@/utils/sessionBilling.utils';

export type EarlyEndBillingChoice = 'actual' | 'fullBlock';

interface EarlyEndBillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationName: string;
  customerName: string;
  details: EarlyEndDetails;
  onChoice: (choice: EarlyEndBillingChoice) => void;
}

function fmtMins(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

const EarlyEndBillingDialog: React.FC<EarlyEndBillingDialogProps> = ({
  open,
  onOpenChange,
  stationName,
  customerName,
  details,
  onChoice,
}) => {
  const { playedMinutes, plannedMinutes, minutesRemaining, actualCost, fullBlockCost } = details;

  const handleChoice = (choice: EarlyEndBillingChoice) => {
    onOpenChange(false);
    onChoice(choice);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-violet-500/25 bg-gradient-to-b from-background to-violet-950/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <ReceiptText className="h-4 w-4" />
            </span>
            How should we bill this session?
          </DialogTitle>
          <DialogDescription className="space-y-0.5 pt-0.5">
            <span className="font-semibold text-foreground">{customerName}</span>
            {' · '}
            <span className="text-muted-foreground">{stationName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Session summary strip */}
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-3 text-center">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Played</p>
            <p className="text-sm font-bold text-foreground">{fmtMins(playedMinutes)}</p>
          </div>
          <div className="space-y-0.5 border-x border-white/8">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Booked</p>
            <p className="text-sm font-bold text-foreground">{fmtMins(plannedMinutes)}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Left unused</p>
            <p className="text-sm font-bold text-amber-400">{fmtMins(minutesRemaining)}</p>
          </div>
        </div>

        {/* Billing options */}
        <div className="space-y-2.5">
          {/* Option A — actual time */}
          <button
            id="early-end-bill-actual"
            type="button"
            onClick={() => handleChoice('actual')}
            className="group w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-left transition-all duration-150 hover:border-emerald-500/40 hover:bg-emerald-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
                  <Timer className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Bill actual time played
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {fmtMins(playedMinutes)} · per-minute rate
                  </p>
                </div>
              </div>
              <CurrencyDisplay
                amount={actualCost}
                className="shrink-0 text-base font-bold text-emerald-300"
              />
            </div>
          </button>

          {/* Option B — full block */}
          <button
            id="early-end-bill-full-block"
            type="button"
            onClick={() => handleChoice('fullBlock')}
            className="group w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-left transition-all duration-150 hover:border-violet-500/40 hover:bg-violet-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/25 bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Bill full {fmtMins(plannedMinutes)} block
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Charge the complete booked duration
                  </p>
                </div>
              </div>
              <CurrencyDisplay
                amount={fullBlockCost}
                className="shrink-0 text-base font-bold text-violet-300"
              />
            </div>
          </button>
        </div>

        {/* Info note */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-[11px] text-amber-100/80">
          The customer booked{' '}
          <strong>{fmtMins(plannedMinutes)}</strong> but played only{' '}
          <strong>{fmtMins(playedMinutes)}</strong>, leaving{' '}
          <strong>{fmtMins(minutesRemaining)}</strong> unused.
          Choose how to charge them before moving to POS.
        </div>

        <div className="flex justify-end pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            Cancel — keep session running
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EarlyEndBillingDialog;
