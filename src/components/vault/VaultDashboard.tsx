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
import {
  PiggyBank,
  Vault,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  Landmark,
  Undo2,
  Loader2,
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
  till_top_up: 'Drawer — cash in',
  till_adjustment: 'Drawer — count adjustment',
  till_to_piggy_owner: 'Drawer → Piggy (owner)',
  till_to_piggy_cash_expense: 'Drawer → Piggy (cash expense)',
  till_bank_deposit: 'Bank deposit (from drawer)',
  piggy_bank_deposit: 'Bank deposit (from piggy)',
  piggy_to_till_return: 'Piggy → Till return',
  reversal: 'Reversal',
};

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-white/65 max-w-2xl space-y-1">
          <p>
            <strong className="text-white/85">Vault</strong> tracks physical cash: what should be in the{' '}
            <strong className="text-white/85">drawer</strong> (shop counter) vs money moved to the{' '}
            <strong className="text-white/85">piggy bank</strong> pool (owner draws and cash-only expenses you still want
            accounted for).
          </p>
          <p>
            Every action writes one line to the ledger. To fix a mistake, use <strong className="text-white/85">Reverse</strong>{' '}
            on that row—entries are never deleted.
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
              Cash drawer (vault)
            </CardTitle>
            <p className="text-xs text-white/50 font-normal pt-1">Notes and coins that should physically be on site.</p>
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
              Cash that left the drawer but you still track (owners / petty cash–style spend).
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

      <div className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/45">Cash coming in or correcting the drawer</h3>
          <div className="flex flex-wrap gap-2">
            <AmountFormDialog
              title="Add cash to drawer"
              description="Use when you put more cash into the shop drawer (float, ATM withdrawal for change, etc.). This increases the drawer balance only."
              trigger={
                <Button size="sm" className="btn-gradient border-0 text-white">
                  <ArrowDownToLine className="h-4 w-4 mr-1" />
                  Add cash to drawer
                </Button>
              }
              onSubmit={async (amount, { notes }) =>
                await postEntry({ kind: 'till_top_up', amount, notes: notes || undefined })
              }
            />

            <TillAdjustmentDialog
              currentTill={till}
              trigger={
                <Button size="sm" variant="secondary" className="bg-white/[0.08] border-white/10 text-white">
                  Adjust drawer count
                </Button>
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

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/45">Move cash: drawer → piggy bank</h3>
          <p className="text-xs text-white/45">
            Drawer balance goes down by this amount; piggy balance goes up by the same amount (nothing leaves your tracking).
          </p>
          <div className="flex flex-wrap gap-2">
            <AmountFormDialog
              title="Owner draw → piggy"
              description="You or Krishna took cash from the drawer for personal use—record it here so the drawer matches reality."
              showOwner
              trigger={
                <Button size="sm" variant="secondary" className="bg-white/[0.08] border-white/10 text-white">
                  Owner draw → piggy
                </Button>
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
              title="Cash expense → piggy"
              description="You paid a supplier or expense with physical cash from the drawer—log it so that spend is tracked in piggy."
              requireNotes
              trigger={
                <Button size="sm" variant="secondary" className="bg-white/[0.08] border-white/10 text-white">
                  Cash expense → piggy
                </Button>
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

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/45">Bank deposits</h3>
          <p className="text-xs text-white/45">Cash leaves the drawer or piggy pool because it was deposited at the bank.</p>
          <div className="flex flex-wrap gap-2">
            <AmountFormDialog
              title="Bank deposit (from drawer)"
              description="Cash walked from the shop drawer to the bank. Reference / slip is required."
              requireBankRef
              trigger={
                <Button size="sm" variant="secondary" className="bg-white/[0.08] border-white/10 text-white">
                  <Landmark className="h-4 w-4 mr-1" />
                  Deposit from drawer
                </Button>
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
              description="You deposited piggy-pooled cash at the bank. Reference / slip is required."
              requireBankRef
              trigger={
                <Button size="sm" variant="secondary" className="bg-white/[0.08] border-white/10 text-white">
                  <Landmark className="h-4 w-4 mr-1" />
                  Deposit from piggy
                </Button>
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

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/45">Return cash to drawer</h3>
          <div className="flex flex-wrap gap-2">
            <AmountFormDialog
              title="Return piggy cash to drawer"
              description="Cash comes back from the piggy pool into the physical drawer (e.g. bringing float back)."
              trigger={
                <Button size="sm" variant="secondary" className="bg-white/[0.08] border-white/10 text-white">
                  <ArrowUpFromLine className="h-4 w-4 mr-1" />
                  Piggy → drawer
                </Button>
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
      </div>

      <Card className="glass-card border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white font-heading">Ledger (append-only)</CardTitle>
          {ledgerLoading && ledger.length === 0 ? (
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          ) : null}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {ledger.length === 0 && !ledgerLoading ? (
            <p className="text-center text-white/55 py-8">No movements yet for this branch.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/65">
                  <th className="pb-2 pr-3 font-medium">When</th>
                  <th className="pb-2 pr-3 font-medium">Type</th>
                  <th className="pb-2 pr-3 font-medium">Amount</th>
                  <th className="pb-2 pr-3 font-medium">Δ Till</th>
                  <th className="pb-2 pr-3 font-medium">Δ Piggy</th>
                  <th className="pb-2 pr-3 font-medium">Notes</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
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
              <Button variant="outline" size="sm" className="border-white/15 text-white" onClick={loadMore} disabled={ledgerLoading}>
                {ledgerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load more'}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
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
