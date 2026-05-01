import React, { useId, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  useShopCash,
  ShopCashLedgerRow,
  ShopCashEntryKind,
} from '@/hooks/useShopCash';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  PiggyBank,
  Vault,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRight,
  ArrowRightLeft,
  Landmark,
  Undo2,
  Loader2,
  Wallet,
  Building2,
  Scale,
} from 'lucide-react';

/** Accepts "8800", "8,800", "₹8800" style input */
function parsePositiveAmountInput(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').replace(/₹/g, '').replace(/\s/g, '').trim();
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

const ENTRY_LABELS: Record<ShopCashEntryKind, string> = {
  till_top_up: 'Put cash in drawer',
  till_adjustment: 'Drawer count fix',
  till_to_piggy_owner: 'Owner took cash (→ piggy)',
  till_to_piggy_cash_expense: 'Paid expense with cash (→ piggy)',
  till_bank_deposit: 'Deposited drawer cash at bank',
  piggy_bank_deposit: 'Deposited piggy cash at bank',
  piggy_to_till_return: 'Moved piggy cash back to drawer',
  reversal: 'Undo previous line',
};

export type MovementActionCardProps = {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  emphasize?: boolean;
  className?: string;
};

/**
 * Must use forwardRef: Radix DialogTrigger with `asChild` merges ref + listeners onto this button.
 * Without forwardRef, clicks do nothing (handlers never attach).
 */
const MovementActionCard = React.forwardRef<HTMLButtonElement, MovementActionCardProps>(
  function MovementActionCard({ icon: Icon, title, subtitle, emphasize, className }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex flex-col rounded-xl border p-4 text-left transition-all min-h-[132px] w-full cursor-pointer',
          'active:scale-[0.99] hover:brightness-110',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0a18]',
          emphasize
            ? 'border-fuchsia-500/35 bg-gradient-to-br from-fuchsia-500/15 via-purple-500/8 to-transparent shadow-[0_0_28px_-10px_rgba(192,38,211,0.45)] hover:border-fuchsia-400/55'
            : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/18',
          className
        )}
      >
        <Icon className={cn('h-6 w-6 mb-2 shrink-0', emphasize ? 'text-fuchsia-300' : 'text-white/75')} />
        <span className="font-semibold text-white text-sm leading-snug">{title}</span>
        <span className="text-xs text-white/55 mt-1.5 leading-relaxed">{subtitle}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-purple-300/90 mt-auto pt-3">
          Click to enter amount
        </span>
      </button>
    );
  }
);

function AmountFormDialog(props: {
  title: string;
  description?: string;
  trigger: React.ReactNode;
  /** Return false to keep the dialog open (failed save). */
  onSubmit: (
    amount: number,
    extra: { notes: string; bankRef: string; owner: string }
  ) => boolean | Promise<boolean>;
  requireBankRef?: boolean;
  requireNotes?: boolean;
  showOwner?: boolean;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [bankRef, setBankRef] = useState('');
  const [owner, setOwner] = useState('me');
  const [busy, setBusy] = useState(false);
  const formId = `vault-amt-${useId().replace(/:/g, '')}`;

  const submit = async () => {
    const n = parsePositiveAmountInput(amount);
    if (n === null) {
      toast({
        title: 'Enter a valid amount',
        description: 'Use a number greater than zero (you can use commas, e.g. 8,800).',
        variant: 'destructive',
      });
      return;
    }
    if (props.requireBankRef && !bankRef.trim()) {
      toast({ title: 'Reference required', description: 'Enter bank reference or slip details.', variant: 'destructive' });
      return;
    }
    if (props.requireNotes && !notes.trim()) {
      toast({ title: 'Notes required', description: 'Describe what this cash expense was for.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const ok = await props.onSubmit(n, { notes, bankRef, owner });
      if (ok === false) return;
      setAmount('');
      setNotes('');
      setBankRef('');
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent className="glass-card border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{props.title}</DialogTitle>
          {props.description ? (
            <DialogDescription className="text-white/65">{props.description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <form
          id={formId}
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div>
            <label className="text-sm text-white/70" htmlFor={`${formId}-amount`}>
              Amount (₹)
            </label>
            <Input
              id={`${formId}-amount`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 8800 or 8,800"
              className="theme-inset border-white/10 text-white mt-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {props.showOwner && (
            <div>
              <label className="text-sm text-white/70">Owner</label>
              <Select value={owner} onValueChange={setOwner}>
                <SelectTrigger className="mt-1 border-white/10 bg-white/[0.04] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="me">Me</SelectItem>
                  <SelectItem value="krishna">Krishna</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {props.requireBankRef && (
            <div>
              <label className="text-sm text-white/70">Bank reference / slip</label>
              <Input
                className="theme-inset border-white/10 text-white mt-1"
                value={bankRef}
                onChange={(e) => setBankRef(e.target.value)}
                placeholder="Reference or UTR"
              />
            </div>
          )}
          <div>
            <label className="text-sm text-white/70" htmlFor={`${formId}-notes`}>
              Notes
            </label>
            <Textarea
              id={`${formId}-notes`}
              className="theme-inset border-white/10 text-white mt-1 min-h-[72px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional — e.g. source of cash, date reference"
            />
          </div>
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-white/15" onClick={() => setOpen(false)} type="button">
            Cancel
          </Button>
          <Button className="btn-gradient border-0 text-white" disabled={busy} type="submit" form={formId}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TillAdjustmentDialog(props: {
  trigger: React.ReactNode;
  currentTill: number;
  onSubmit: (deltaTill: number, notes: string) => boolean | Promise<boolean>;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const formId = `vault-adj-${useId().replace(/:/g, '')}`;

  const submit = async () => {
    const cleaned = delta.replace(/,/g, '').replace(/₹/g, '').replace(/\s/g, '').trim();
    const d = parseFloat(cleaned);
    if (!Number.isFinite(d) || d === 0) {
      toast({
        title: 'Enter a valid adjustment',
        description: 'Use a non-zero number (negative if the drawer is short).',
        variant: 'destructive',
      });
      return;
    }
    if (!notes.trim()) {
      toast({ title: 'Reason required', description: 'Explain why the drawer changed.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const ok = await props.onSubmit(d, notes);
      if (ok === false) return;
      setDelta('');
      setNotes('');
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent className="glass-card border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Drawer count adjustment</DialogTitle>
          <DialogDescription className="text-white/65">
            Current expected cash in drawer: <CurrencyDisplay amount={props.currentTill} />. Enter a{' '}
            <strong>positive</strong> adjustment if you counted more cash than the app, or <strong>negative</strong> if the
            drawer is short.
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div>
            <label className="text-sm text-white/70" htmlFor={`${formId}-delta`}>
              Change to drawer (₹)
            </label>
            <Input
              id={`${formId}-delta`}
              type="text"
              inputMode="decimal"
              className="theme-inset border-white/10 text-white mt-1"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="e.g. -500 or 200"
            />
          </div>
          <div>
            <label className="text-sm text-white/70" htmlFor={`${formId}-reason`}>
              Reason
            </label>
            <Textarea
              id={`${formId}-reason`}
              className="theme-inset border-white/10 text-white mt-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Required — e.g. count mismatch, change fund"
            />
          </div>
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-white/15" onClick={() => setOpen(false)} type="button">
            Cancel
          </Button>
          <Button className="btn-gradient border-0 text-white" disabled={busy} type="submit" form={formId}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const VaultDashboard: React.FC = () => {
  const {
    activeLocationId,
    balances,
    balancesLoading,
    ledger,
    ledgerLoading,
    hasMore,
    refreshAll,
    postEntry,
    reverseEntry,
    loadMore,
  } = useShopCash();

  const till = balances?.till_amount ?? 0;
  const piggy = balances?.piggy_amount ?? 0;

  if (!activeLocationId) {
    return (
      <Card className="glass-card border-white/10">
        <CardContent className="py-10 text-center text-white/70">
          Select a branch to manage shop cash and piggy bank.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2 max-w-2xl">
          <h3 className="text-lg font-semibold text-white font-heading tracking-tight">Shop cash vault</h3>
          <p className="text-sm text-white/60 leading-relaxed">
            Two balances: <strong className="text-white/90">drawer</strong> (what should be in the cashbox) and{' '}
            <strong className="text-white/90">piggy</strong> (cash you still track after it left the drawer). Pick{' '}
            <strong className="text-white/90">Record movement</strong> below, then open <strong className="text-white/90">History</strong>{' '}
            to review lines — use <strong className="text-white/90">Reverse</strong> there if you made a mistake.
          </p>
        </div>
        <Button variant="outline" size="sm" className="border-white/15 text-white shrink-0" onClick={() => void refreshAll()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card glass-card-interactive border-white/10 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/85 flex items-center gap-2">
              <Vault className="h-5 w-5 text-emerald-400" />
              Cash drawer
            </CardTitle>
            <p className="text-xs text-white/50 font-normal pt-1">Physical cash that should be in the shop right now.</p>
          </CardHeader>
          <CardContent>
            {balancesLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-white/40" />
            ) : (
              <div className="text-3xl font-bold text-white">
                <CurrencyDisplay amount={till} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card glass-card-interactive border-white/10 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/85 flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-amber-400" />
              Piggy bank
            </CardTitle>
            <p className="text-xs text-white/50 font-normal pt-1">
              Cash that already left the drawer but you still account for (owners, petty cash, etc.).
            </p>
          </CardHeader>
          <CardContent>
            {balancesLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-white/40" />
            ) : (
              <div className="text-3xl font-bold text-white">
                <CurrencyDisplay amount={piggy} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="record" className="w-full">
        <TabsList className="glass-card border border-white/10 bg-white/[0.04] p-1 h-auto min-h-11 w-full flex flex-col sm:flex-row sm:inline-flex gap-1 rounded-xl">
          <TabsTrigger
            value="record"
            className="rounded-lg flex-1 sm:flex-none px-4 py-2.5 text-white/70 data-[state=active]:btn-gradient data-[state=active]:text-white data-[state=active]:border-0 data-[state=active]:shadow-lg"
          >
            Record movement
          </TabsTrigger>
          <TabsTrigger
            value="ledger"
            className="rounded-lg flex-1 sm:flex-none px-4 py-2.5 text-white/70 data-[state=active]:btn-gradient data-[state=active]:text-white data-[state=active]:border-0 data-[state=active]:shadow-lg"
          >
            History & reverse
          </TabsTrigger>
        </TabsList>

        <TabsContent value="record" className="mt-5 space-y-8 focus-visible:outline-none">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-3">How money flows</p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-2">
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 flex-1 sm:max-w-[200px]">
                <Wallet className="h-8 w-8 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">Drawer</p>
                  <p className="text-[11px] text-white/50 leading-snug">Cash at the counter</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-white/25 shrink-0 hidden sm:block self-center" />
              <div className="flex items-center gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 flex-1 sm:max-w-[200px]">
                <PiggyBank className="h-8 w-8 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">Piggy</p>
                  <p className="text-[11px] text-white/50 leading-snug">Tracked after leaving drawer</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-white/25 shrink-0 hidden sm:block self-center" />
              <div className="flex items-center gap-3 rounded-lg border border-sky-500/25 bg-sky-500/10 px-4 py-3 flex-1 sm:max-w-[200px]">
                <Building2 className="h-8 w-8 text-sky-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">Bank</p>
                  <p className="text-[11px] text-white/50 leading-snug">Money you deposited externally</p>
                </div>
              </div>
            </div>
          </div>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-white/90">A · Put cash in the drawer or fix the count</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <AmountFormDialog
                title="Add cash to drawer"
                description="More notes/coins going into the cashbox (float, change from bank, etc.). Only increases the drawer total."
                trigger={
                  <MovementActionCard
                    emphasize
                    icon={ArrowDownToLine}
                    title="Add cash to drawer"
                    subtitle="You physically added money to the shop cashbox."
                  />
                }
                onSubmit={async (amount, { notes }) =>
                  await postEntry({ kind: 'till_top_up', amount, notes: notes || undefined })
                }
              />
              <TillAdjustmentDialog
                currentTill={till}
                trigger={
                  <MovementActionCard
                    icon={Scale}
                    title="Fix drawer count"
                    subtitle="Counted the drawer and it doesn’t match this number — adjust up or down."
                  />
                }
                onSubmit={async (deltaTill, notes) =>
                  await postEntry({
                    kind: 'till_adjustment',
                    amount: Math.abs(deltaTill),
                    deltaTill,
                    deltaPiggy: 0,
                    notes,
                  })
                }
              />
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-white/90">B · Cash left the drawer → track it in piggy</h4>
            <p className="text-xs text-white/45 -mt-1">
              Drawer goes down, piggy goes up by the same ₹ — nothing disappears from your records.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <AmountFormDialog
                title="Owner took cash"
                description="You or Krishna took money from the drawer for personal use — so the drawer total should drop."
                showOwner
                trigger={
                  <MovementActionCard
                    icon={Vault}
                    title="Owner took cash"
                    subtitle="Personal draw from the cashbox — we move that amount into piggy for tracking."
                  />
                }
                onSubmit={async (amount, { notes, owner }) =>
                  await postEntry({
                    kind: 'till_to_piggy_owner',
                    amount,
                    notes: notes || undefined,
                    owner,
                  })
                }
              />
              <AmountFormDialog
                title="Paid someone with drawer cash"
                description="Required note: who / what (supplier, supplies, delivery, etc.)."
                requireNotes
                trigger={
                  <MovementActionCard
                    icon={ArrowUpFromLine}
                    title="Paid an expense with cash"
                    subtitle="Cash went out for the business — we park it in piggy so you remember it."
                  />
                }
                onSubmit={async (amount, { notes }) =>
                  await postEntry({
                    kind: 'till_to_piggy_cash_expense',
                    amount,
                    notes: notes || undefined,
                  })
                }
              />
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-white/90">C · Took cash to the bank</h4>
            <p className="text-xs text-white/45 -mt-1">Pick whether that cash came from the drawer or from piggy. Reference / slip is required.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <AmountFormDialog
                title="Bank deposit (from drawer)"
                description="You walked cash from the shop drawer to the bank. Enter slip / UTR."
                requireBankRef
                trigger={
                  <MovementActionCard
                    icon={Landmark}
                    title="Deposit — from drawer"
                    subtitle="Less cash should remain in the cashbox."
                  />
                }
                onSubmit={async (amount, { notes, bankRef }) =>
                  await postEntry({
                    kind: 'till_bank_deposit',
                    amount,
                    notes: notes || undefined,
                    bankReference: bankRef || undefined,
                  })
                }
              />
              <AmountFormDialog
                title="Bank deposit (from piggy)"
                description="You deposited money that was tracked in piggy. Enter slip / UTR."
                requireBankRef
                trigger={
                  <MovementActionCard
                    icon={Landmark}
                    title="Deposit — from piggy"
                    subtitle="Less cash remains in the piggy pool."
                  />
                }
                onSubmit={async (amount, { notes, bankRef }) =>
                  await postEntry({
                    kind: 'piggy_bank_deposit',
                    amount,
                    notes: notes || undefined,
                    bankReference: bankRef || undefined,
                  })
                }
              />
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-white/90">D · Put cash back into the drawer</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AmountFormDialog
                title="Return piggy cash to drawer"
                description="Cash came back from piggy into the physical drawer (e.g. returning float)."
                trigger={
                  <MovementActionCard
                    icon={ArrowRightLeft}
                    title="Piggy → drawer"
                    subtitle="Moves money from piggy back into the cashbox."
                  />
                }
                onSubmit={async (amount, { notes }) =>
                  await postEntry({
                    kind: 'piggy_to_till_return',
                    amount,
                    notes: notes || undefined,
                  })
                }
              />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="ledger" className="mt-5 focus-visible:outline-none">
          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-white font-heading">Movement history</CardTitle>
                <p className="text-xs text-white/50 font-normal mt-1">
                  Every row is permanent; use Reverse to correct a mistake (adds an undo line).
                </p>
              </div>
              {ledgerLoading && ledger.length === 0 ? (
                <Loader2 className="h-5 w-5 animate-spin text-white/40 shrink-0" />
              ) : null}
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {ledger.length === 0 && !ledgerLoading ? (
                <p className="text-center text-white/55 py-10">No movements recorded for this branch yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-white/65">
                      <th className="pb-2 pr-3 font-medium">When</th>
                      <th className="pb-2 pr-3 font-medium">What happened</th>
                      <th className="pb-2 pr-3 font-medium">Amount</th>
                      <th className="pb-2 pr-3 font-medium">Drawer Δ</th>
                      <th className="pb-2 pr-3 font-medium">Piggy Δ</th>
                      <th className="pb-2 pr-3 font-medium">Notes</th>
                      <th className="pb-2 font-medium text-right">Fix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((row) => (
                      <LedgerRow key={row.id} row={row} onReverse={() => void reverseEntry(row)} />
                    ))}
                  </tbody>
                </table>
              )}
              {hasMore ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/15 text-white"
                    onClick={loadMore}
                    disabled={ledgerLoading}
                  >
                    {ledgerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load older rows'}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function LedgerRow({ row, onReverse }: { row: ShopCashLedgerRow; onReverse: () => void }) {
  const dt = Number(row.delta_till);
  const dp = Number(row.delta_piggy);

  return (
    <tr className="border-b border-white/[0.06] hover:bg-white/[0.03]">
      <td className="py-2 pr-3 text-white/85 whitespace-nowrap">{format(new Date(row.created_at), 'MMM d, yyyy HH:mm')}</td>
      <td className="py-2 pr-3">
        <Badge variant="outline" className="border-white/15 bg-white/[0.06] text-white/90 font-normal">
          {ENTRY_LABELS[row.entry_kind]}
        </Badge>
      </td>
      <td className="py-2 pr-3 text-white">
        <CurrencyDisplay amount={Number(row.amount)} />
      </td>
      <td className={`py-2 pr-3 ${dt >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {dt >= 0 ? '+' : ''}
        <CurrencyDisplay amount={dt} />
      </td>
      <td className={`py-2 pr-3 ${dp >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
        {dp >= 0 ? '+' : ''}
        <CurrencyDisplay amount={dp} />
      </td>
      <td className="py-2 pr-3 text-white/70 max-w-[200px] truncate" title={row.notes || ''}>
        {row.bank_reference ? <span className="text-sky-300/90 mr-1">[{row.bank_reference}] </span> : null}
        {row.owner ? <span className="text-white/50 mr-1">({row.owner}) </span> : null}
        {row.notes || '—'}
      </td>
      <td className="py-2 text-right">
        {row.entry_kind !== 'reversal' ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                <Undo2 className="h-4 w-4 mr-1" />
                Reverse
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-card border-white/10 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Reverse this entry?</AlertDialogTitle>
                <AlertDialogDescription className="text-white/65">
                  A new reversal row will be added. Original rows are never deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-white/15 bg-white/[0.06] text-white">Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => onReverse()}>
                  Confirm reversal
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <span className="text-white/35 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

export default VaultDashboard;
