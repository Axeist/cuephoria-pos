import React, { useState } from 'react';
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

const ENTRY_LABELS: Record<ShopCashEntryKind, string> = {
  till_top_up: 'Till — cash in',
  till_adjustment: 'Till — count adjustment',
  till_to_piggy_owner: 'Till → Piggy (owner)',
  till_to_piggy_cash_expense: 'Till → Piggy (cash expense)',
  till_bank_deposit: 'Bank deposit (from till)',
  piggy_bank_deposit: 'Bank deposit (from piggy)',
  piggy_to_till_return: 'Piggy → Till return',
  reversal: 'Reversal',
};

function AmountFormDialog(props: {
  title: string;
  trigger: React.ReactNode;
  onSubmit: (amount: number, extra: { notes: string; bankRef: string; owner: string }) => void | Promise<void>;
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

  const submit = async () => {
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) return;
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
      await onSubmit(n, { notes, bankRef, owner });
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
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-white/70">Amount (₹)</label>
            <Input
              type="number"
              step="0.01"
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
            <label className="text-sm text-white/70">Notes</label>
            <Textarea
              className="theme-inset border-white/10 text-white mt-1 min-h-[72px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-white/15" onClick={() => setOpen(false)} type="button">
            Cancel
          </Button>
          <Button className="btn-gradient border-0 text-white" disabled={busy} onClick={() => void submit()}>
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
  onSubmit: (deltaTill: number, notes: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const d = parseFloat(delta);
    if (!Number.isFinite(d) || d === 0) return;
    setBusy(true);
    try {
      await props.onSubmit(d, notes);
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
          <DialogTitle className="text-white">Till adjustment</DialogTitle>
          <p className="text-sm text-white/55">
            Current till (expected): <CurrencyDisplay amount={props.currentTill} />
            <br />
            Enter <strong>positive</strong> to add cash found, <strong>negative</strong> to remove (short).
          </p>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-white/70">Change to till (₹)</label>
            <Input
              type="number"
              step="0.01"
              className="theme-inset border-white/10 text-white mt-1"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="e.g. -500 or 200"
            />
          </div>
          <div>
            <label className="text-sm text-white/70">Reason</label>
            <Textarea
              className="theme-inset border-white/10 text-white mt-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Required — count correction, misc."
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-white/15" onClick={() => setOpen(false)} type="button">
            Cancel
          </Button>
          <Button className="btn-gradient border-0 text-white" disabled={busy || !notes.trim()} onClick={() => void submit()}>
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
        <p className="text-sm text-white/65 max-w-xl">
          Physical cash in the shop (till) and owner / cash-expense pool (piggy). Every movement is recorded; use reversal to
          correct mistakes—nothing is silently deleted.
        </p>
        <Button variant="outline" size="sm" className="border-white/15 text-white" onClick={() => void refreshAll()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card glass-card-interactive border-white/10 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/85 flex items-center gap-2">
              <Vault className="h-5 w-5 text-emerald-400" />
              Shop till (cashbox)
            </CardTitle>
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

      <div className="flex flex-wrap gap-2">
        <AmountFormDialog
          title="Add cash to till"
          trigger={
            <Button size="sm" className="btn-gradient border-0 text-white">
              <ArrowDownToLine className="h-4 w-4 mr-1" />
              Add to till
            </Button>
          }
          onSubmit={(amount, { notes }) =>
            postEntry({ kind: 'till_top_up', amount, notes: notes || undefined })
          }
        />

        <TillAdjustmentDialog
          currentTill={till}
          trigger={
            <Button size="sm" variant="secondary" className="bg-white/[0.08] border-white/10 text-white">
              Adjust till count
            </Button>
          }
          onSubmit={(deltaTill, notes) =>
            postEntry({
              kind: 'till_adjustment',
              amount: Math.abs(deltaTill),
              deltaTill,
              deltaPiggy: 0,
              notes,
            })
          }
        />

        <AmountFormDialog
          title="Till → Piggy (owner draw)"
          showOwner
          trigger={
            <Button size="sm" variant="secondary" className="bg-white/[0.08] border-white/10 text-white">
              Owner → piggy
            </Button>
          }
          onSubmit={(amount, { notes, owner }) =>
            postEntry({
              kind: 'till_to_piggy_owner',
              amount,
              notes: notes || undefined,
              owner,
            })
          }
        />

        <AmountFormDialog
          title="Till → Piggy (cash expense)"
          requireNotes
          trigger={
            <Button size="sm" variant="secondary" className="bg-white/[0.08] border-white/10 text-white">
              Cash expense → piggy
            </Button>
          }
          onSubmit={(amount, { notes }) =>
            postEntry({
              kind: 'till_to_piggy_cash_expense',
              amount,
              notes: notes || undefined,
            })
          }
        />

        <AmountFormDialog
          title="Bank deposit from till"
          requireBankRef
          trigger={
            <Button size="sm" variant="secondary" className="bg-white/[0.08] border-white/10 text-white">
              <Landmark className="h-4 w-4 mr-1" />
              Deposit (till)
            </Button>
          }
          onSubmit={(amount, { notes, bankRef }) =>
            postEntry({
              kind: 'till_bank_deposit',
              amount,
              notes: notes || undefined,
              bankReference: bankRef || undefined,
            })
          }
        />

        <AmountFormDialog
          title="Bank deposit from piggy"
          requireBankRef
          trigger={
            <Button size="sm" variant="secondary" className="bg-white/[0.08] border-white/10 text-white">
              <Landmark className="h-4 w-4 mr-1" />
              Deposit (piggy)
            </Button>
          }
          onSubmit={(amount, { notes, bankRef }) =>
            postEntry({
              kind: 'piggy_bank_deposit',
              amount,
              notes: notes || undefined,
              bankReference: bankRef || undefined,
            })
          }
        />

        <AmountFormDialog
          title="Return cash from piggy to till"
          trigger={
            <Button size="sm" variant="secondary" className="bg-white/[0.08] border-white/10 text-white">
              <ArrowUpFromLine className="h-4 w-4 mr-1" />
              Piggy → till
            </Button>
          }
          onSubmit={(amount, { notes }) =>
            postEntry({
              kind: 'piggy_to_till_return',
              amount,
              notes: notes || undefined,
            })
          }
        />
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
