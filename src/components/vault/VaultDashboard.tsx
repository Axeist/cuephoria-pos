import React, { useId, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import {
  useShopCash,
  ShopCashLedgerRow,
  ShopCashEntryKind,
} from '@/hooks/useShopCash';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { cn } from '@/lib/utils';
import {
  PiggyBank,
  Vault,
  RefreshCw,
  ArrowDownToLine,
  ArrowRightLeft,
  Landmark,
  Undo2,
  Loader2,
  Plus,
  Search,
  ChevronLeft,
  Scale,
  Coins,
  Building2,
  HandCoins,
  Receipt,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Types & helpers                                                            */
/* -------------------------------------------------------------------------- */

type MovementKind = Exclude<ShopCashEntryKind, 'reversal'>;

type FilterKey = 'all' | 'drawer' | 'piggy' | 'bank';

type MovementMeta = {
  kind: MovementKind;
  title: string;
  short: string;
  blurb: string;
  icon: React.ElementType;
  /** Visual accent: emerald = inflow, amber = piggy side, sky = bank, violet = neutral. */
  accent: 'emerald' | 'amber' | 'sky' | 'violet';
  group: 'in' | 'out' | 'bank' | 'fix';
  needs: {
    bankRef?: boolean;
    notes?: boolean;
    owner?: boolean;
    /** Use signed delta input (for adjustments) instead of positive-only amount. */
    signedDelta?: boolean;
  };
};

const MOVEMENTS: MovementMeta[] = [
  {
    kind: 'till_top_up',
    title: 'Add cash to drawer',
    short: 'Add to drawer',
    blurb: 'Notes/coins going into the cashbox (float, change from bank).',
    icon: ArrowDownToLine,
    accent: 'emerald',
    group: 'in',
    needs: {},
  },
  {
    kind: 'till_to_piggy_owner',
    title: 'Owner took cash',
    short: 'Owner draw',
    blurb: 'Personal draw from the cashbox — moved into piggy for tracking.',
    icon: HandCoins,
    accent: 'amber',
    group: 'out',
    needs: { owner: true },
  },
  {
    kind: 'till_to_piggy_cash_expense',
    title: 'Paid expense with cash',
    short: 'Cash expense',
    blurb: 'Cash went out for the business — parked in piggy as a memo.',
    icon: Receipt,
    accent: 'amber',
    group: 'out',
    needs: { notes: true },
  },
  {
    kind: 'till_bank_deposit',
    title: 'Deposit drawer cash to bank',
    short: 'Bank · drawer',
    blurb: 'Walked cash from the shop drawer to the bank.',
    icon: Landmark,
    accent: 'sky',
    group: 'bank',
    needs: { bankRef: true },
  },
  {
    kind: 'piggy_bank_deposit',
    title: 'Deposit piggy cash to bank',
    short: 'Bank · piggy',
    blurb: 'Cash that was tracked in piggy is now at the bank.',
    icon: Building2,
    accent: 'sky',
    group: 'bank',
    needs: { bankRef: true },
  },
  {
    kind: 'piggy_to_till_return',
    title: 'Return piggy cash to drawer',
    short: 'Piggy → drawer',
    blurb: 'Cash from piggy goes back into the physical cashbox.',
    icon: ArrowRightLeft,
    accent: 'violet',
    group: 'fix',
    needs: {},
  },
  {
    kind: 'till_adjustment',
    title: 'Fix drawer count',
    short: 'Fix count',
    blurb: 'Counted the drawer — adjust up (positive) or down (negative).',
    icon: Scale,
    accent: 'violet',
    group: 'fix',
    needs: { notes: true, signedDelta: true },
  },
];

const QUICK_ACTIONS: MovementKind[] = [
  'till_top_up',
  'till_to_piggy_owner',
  'till_to_piggy_cash_expense',
  'till_bank_deposit',
  'piggy_to_till_return',
  'till_adjustment',
];

const ENTRY_LABELS: Record<ShopCashEntryKind, string> = {
  till_top_up: 'Cash added to drawer',
  till_adjustment: 'Drawer count fix',
  till_to_piggy_owner: 'Owner took cash',
  till_to_piggy_cash_expense: 'Cash expense paid',
  till_bank_deposit: 'Bank deposit (drawer)',
  piggy_bank_deposit: 'Bank deposit (piggy)',
  piggy_to_till_return: 'Piggy returned to drawer',
  reversal: 'Reversal',
};

const ENTRY_ICONS: Record<ShopCashEntryKind, React.ElementType> = {
  till_top_up: ArrowDownToLine,
  till_adjustment: Scale,
  till_to_piggy_owner: HandCoins,
  till_to_piggy_cash_expense: Receipt,
  till_bank_deposit: Landmark,
  piggy_bank_deposit: Building2,
  piggy_to_till_return: ArrowRightLeft,
  reversal: Undo2,
};

const ACCENT_BG: Record<MovementMeta['accent'], string> = {
  emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
  sky: 'bg-sky-500/10 text-sky-300 border-sky-500/25',
  violet: 'bg-violet-500/10 text-violet-300 border-violet-500/25',
};

const ACCENT_HOVER: Record<MovementMeta['accent'], string> = {
  emerald: 'hover:border-emerald-400/55 hover:bg-emerald-500/15',
  amber: 'hover:border-amber-400/55 hover:bg-amber-500/15',
  sky: 'hover:border-sky-400/55 hover:bg-sky-500/15',
  violet: 'hover:border-violet-400/55 hover:bg-violet-500/15',
};

function findMeta(kind: MovementKind): MovementMeta {
  return MOVEMENTS.find((m) => m.kind === kind)!;
}

/** Accepts "8800", "8,800", "₹8800". Returns null on bad input. */
function parsePositiveAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').replace(/₹/g, '').replace(/\s/g, '').trim();
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Accepts signed amount, including negatives. */
function parseSignedAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').replace(/₹/g, '').replace(/\s/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === '+') return null;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n === 0) return null;
  return n;
}

/** Compute (drawerDelta, piggyDelta) preview given a movement kind and amount. */
function previewDeltas(kind: MovementKind, amount: number): { drawer: number; piggy: number } {
  switch (kind) {
    case 'till_top_up':
      return { drawer: amount, piggy: 0 };
    case 'till_bank_deposit':
      return { drawer: -amount, piggy: 0 };
    case 'till_to_piggy_owner':
    case 'till_to_piggy_cash_expense':
      return { drawer: -amount, piggy: amount };
    case 'piggy_bank_deposit':
      return { drawer: 0, piggy: -amount };
    case 'piggy_to_till_return':
      return { drawer: amount, piggy: -amount };
    case 'till_adjustment':
      return { drawer: amount, piggy: 0 };
  }
}

function formatRelativeDay(d: Date): string {
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE · MMM d, yyyy');
}

function classifyRowForFilter(row: ShopCashLedgerRow): FilterKey[] {
  const dt = Number(row.delta_till);
  const dp = Number(row.delta_piggy);
  const tags: FilterKey[] = ['all'];
  if (dt !== 0) tags.push('drawer');
  if (dp !== 0) tags.push('piggy');
  if (
    row.entry_kind === 'till_bank_deposit' ||
    row.entry_kind === 'piggy_bank_deposit' ||
    !!row.bank_reference
  ) {
    tags.push('bank');
  }
  return tags;
}

/* -------------------------------------------------------------------------- */
/* Main dashboard                                                             */
/* -------------------------------------------------------------------------- */

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
  const total = till + piggy;

  // Recorder sheet state
  const [movementKind, setMovementKind] = useState<MovementKind | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState<'pick' | 'fill'>('pick');

  const openRecorder = (kind?: MovementKind) => {
    if (kind) {
      setMovementKind(kind);
      setStep('fill');
    } else {
      setMovementKind(null);
      setStep('pick');
    }
    setSheetOpen(true);
  };

  const onSheetOpenChange = (v: boolean) => {
    setSheetOpen(v);
    if (!v) {
      // Reset on close after the animation kicks in.
      window.setTimeout(() => {
        setMovementKind(null);
        setStep('pick');
      }, 120);
    }
  };

  // History filters
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  const filteredLedger = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ledger.filter((row) => {
      if (filter !== 'all' && !classifyRowForFilter(row).includes(filter)) return false;
      if (!q) return true;
      const hay = [
        ENTRY_LABELS[row.entry_kind],
        row.notes ?? '',
        row.bank_reference ?? '',
        row.owner ?? '',
        String(row.amount),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [ledger, filter, search]);

  // Group by day (for the feed headers)
  const grouped = useMemo(() => {
    const buckets: { day: Date; rows: ShopCashLedgerRow[] }[] = [];
    for (const row of filteredLedger) {
      const day = new Date(row.created_at);
      const last = buckets[buckets.length - 1];
      if (last && isSameDay(last.day, day)) {
        last.rows.push(row);
      } else {
        buckets.push({ day, rows: [row] });
      }
    }
    return buckets;
  }, [filteredLedger]);

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
    <div className="space-y-5">
      {/* HEADER ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5 max-w-2xl">
          <h3 className="text-lg font-semibold text-white font-heading tracking-tight">
            Shop cash vault
          </h3>
          <p className="text-sm text-white/60 leading-relaxed">
            Two pots: <strong className="text-white/90">drawer</strong> (cash physically in the
            cashbox) and <strong className="text-white/90">piggy</strong> (cash that left the drawer
            but you still account for). Hit <strong className="text-white/90">Record movement</strong>
            {' '}to log anything that happens.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="border-white/15 text-white"
            onClick={() => void refreshAll()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="btn-gradient border-0 text-white"
            onClick={() => openRecorder()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Record movement
          </Button>
        </div>
      </div>

      {/* BALANCE CARDS ------------------------------------------------------ */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <BalanceCard
          icon={Vault}
          label="Drawer"
          sublabel="Cash in the cashbox"
          amount={till}
          loading={balancesLoading}
          accent="emerald"
        />
        <BalanceCard
          icon={PiggyBank}
          label="Piggy"
          sublabel="Tracked but out of drawer"
          amount={piggy}
          loading={balancesLoading}
          accent="amber"
        />
        <BalanceCard
          icon={Coins}
          label="Total tracked"
          sublabel="Drawer + piggy"
          amount={total}
          loading={balancesLoading}
          accent="violet"
        />
      </div>

      {/* QUICK ACTIONS ------------------------------------------------------ */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
            Quick actions
          </p>
          <button
            type="button"
            onClick={() => openRecorder()}
            className="text-xs text-purple-300 hover:text-purple-200 transition-colors"
          >
            All movements →
          </button>
        </div>
        <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_ACTIONS.map((kind) => {
            const meta = findMeta(kind);
            const Icon = meta.icon;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => openRecorder(kind)}
                className={cn(
                  'group flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all',
                  'border-white/10 bg-white/[0.04]',
                  ACCENT_HOVER[meta.accent],
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50'
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg border',
                    ACCENT_BG[meta.accent]
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                <span className="text-[13px] font-semibold text-white leading-tight">
                  {meta.short}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* HISTORY ------------------------------------------------------------ */}
      <Card className="glass-card border-white/10">
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white">Recent activity</h4>
              <p className="text-xs text-white/50 mt-0.5">
                Every line is permanent. Use Reverse to add an undo entry.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search notes, owner, ref…"
                  className="theme-inset border-white/10 text-white pl-8 h-9 w-full sm:w-56"
                />
              </div>
              <FilterPills value={filter} onChange={setFilter} />
            </div>
          </div>

          {/* Feed body */}
          <div className="p-4 sm:p-5">
            {ledgerLoading && ledger.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            ) : filteredLedger.length === 0 ? (
              <EmptyState
                hasAnyLedger={ledger.length > 0}
                onRecord={() => openRecorder()}
                searching={search.trim().length > 0 || filter !== 'all'}
              />
            ) : (
              <div className="space-y-6">
                {grouped.map(({ day, rows }) => (
                  <div key={day.toISOString()} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                        {formatRelativeDay(day)}
                      </span>
                      <div className="h-px flex-1 bg-white/[0.07]" />
                    </div>
                    <div className="space-y-1.5">
                      {rows.map((row) => (
                        <LedgerLine
                          key={row.id}
                          row={row}
                          onReverse={() => void reverseEntry(row)}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {hasMore ? (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/15 text-white"
                      onClick={loadMore}
                      disabled={ledgerLoading}
                    >
                      {ledgerLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Load older entries'
                      )}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* RECORDER SHEET ----------------------------------------------------- */}
      <Sheet open={sheetOpen} onOpenChange={onSheetOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col bg-[#0f0a18] border-white/10 text-white"
        >
          {step === 'pick' || !movementKind ? (
            <PickStep
              onPick={(kind) => {
                setMovementKind(kind);
                setStep('fill');
              }}
            />
          ) : (
            <FillStep
              key={movementKind}
              kind={movementKind}
              till={till}
              piggy={piggy}
              onBack={() => setStep('pick')}
              onCancel={() => onSheetOpenChange(false)}
              postEntry={postEntry}
              onSaved={() => onSheetOpenChange(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default VaultDashboard;

/* -------------------------------------------------------------------------- */
/* Subcomponents                                                              */
/* -------------------------------------------------------------------------- */

function BalanceCard({
  icon: Icon,
  label,
  sublabel,
  amount,
  loading,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  amount: number;
  loading: boolean;
  accent: 'emerald' | 'amber' | 'violet';
}) {
  const colorMap = {
    emerald: { ring: 'ring-emerald-500/20', icon: 'text-emerald-300 bg-emerald-500/12 border-emerald-500/25' },
    amber: { ring: 'ring-amber-500/20', icon: 'text-amber-300 bg-amber-500/12 border-amber-500/25' },
    violet: { ring: 'ring-violet-500/20', icon: 'text-violet-300 bg-violet-500/12 border-violet-500/25' },
  } as const;
  const c = colorMap[accent];

  return (
    <Card className={cn('glass-card glass-card-interactive border-white/10 ring-1', c.ring)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-white/55">{label}</p>
            <p className="text-[11px] text-white/45 leading-snug">{sublabel}</p>
          </div>
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg border', c.icon)}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        </div>
        <div className="mt-3">
          {loading ? (
            <Loader2 className="h-7 w-7 animate-spin text-white/30" />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              <CurrencyDisplay amount={amount} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FilterPills({
  value,
  onChange,
}: {
  value: FilterKey;
  onChange: (v: FilterKey) => void;
}) {
  const pills: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'drawer', label: 'Drawer' },
    { key: 'piggy', label: 'Piggy' },
    { key: 'bank', label: 'Bank' },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1">
      {pills.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.key)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            value === p.key
              ? 'bg-white/15 text-white'
              : 'text-white/55 hover:text-white hover:bg-white/[0.06]'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({
  hasAnyLedger,
  onRecord,
  searching,
}: {
  hasAnyLedger: boolean;
  onRecord: () => void;
  searching: boolean;
}) {
  if (searching) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Search className="h-6 w-6 text-white/30 mb-2" />
        <p className="text-sm text-white/65">No entries match this filter.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] mb-3">
        <Vault className="h-6 w-6 text-white/45" />
      </div>
      <p className="text-sm text-white/75 font-medium">
        {hasAnyLedger ? 'Nothing to show.' : 'No movements recorded for this branch yet.'}
      </p>
      <p className="text-xs text-white/45 mt-1 max-w-xs">
        Start by recording how cash entered the drawer or any movement that just happened.
      </p>
      <Button size="sm" className="btn-gradient border-0 text-white mt-4" onClick={onRecord}>
        <Plus className="h-4 w-4 mr-2" />
        Record movement
      </Button>
    </div>
  );
}

function LedgerLine({
  row,
  onReverse,
}: {
  row: ShopCashLedgerRow;
  onReverse: () => void;
}) {
  const dt = Number(row.delta_till);
  const dp = Number(row.delta_piggy);
  const Icon = ENTRY_ICONS[row.entry_kind];
  const isReversal = row.entry_kind === 'reversal';
  const time = format(new Date(row.created_at), 'h:mm a');

  return (
    <div className="group flex items-start gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-white/10 hover:bg-white/[0.03]">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
          isReversal
            ? 'border-rose-500/25 bg-rose-500/10 text-rose-300'
            : 'border-white/10 bg-white/[0.05] text-white/75'
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-white truncate">
            {ENTRY_LABELS[row.entry_kind]}
          </p>
          <span className="text-[11px] text-white/40">{time}</span>
          {row.owner ? (
            <Badge
              variant="outline"
              className="border-white/10 bg-white/[0.05] text-[10px] font-normal text-white/65 px-1.5 py-0"
            >
              {row.owner}
            </Badge>
          ) : null}
          {row.bank_reference ? (
            <Badge
              variant="outline"
              className="border-sky-500/25 bg-sky-500/10 text-[10px] font-normal text-sky-200 px-1.5 py-0"
            >
              ref: {row.bank_reference}
            </Badge>
          ) : null}
        </div>
        {row.notes ? (
          <p
            className="text-xs text-white/55 mt-0.5 truncate"
            title={row.notes}
          >
            {row.notes}
          </p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {dt !== 0 && (
            <DeltaChip label="Drawer" value={dt} tone="emerald" />
          )}
          {dp !== 0 && (
            <DeltaChip label="Piggy" value={dp} tone="amber" />
          )}
          {dt === 0 && dp === 0 && (
            <span className="text-[11px] text-white/40">No balance change</span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <div className="text-sm font-semibold text-white tabular-nums">
          <CurrencyDisplay amount={Number(row.amount)} />
        </div>
        {!isReversal ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] text-white/45 transition-colors hover:text-rose-300"
              >
                <Undo2 className="h-3 w-3" />
                Reverse
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-card border-white/10 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Reverse this entry?</AlertDialogTitle>
                <AlertDialogDescription className="text-white/65">
                  A new reversal row will be added — original rows are never deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-white/15 bg-white/[0.06] text-white">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={() => onReverse()}
                >
                  Confirm reversal
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <span className="text-[10px] text-white/30">undo line</span>
        )}
      </div>
    </div>
  );
}

function DeltaChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'amber';
}) {
  const positive = value >= 0;
  const toneCls =
    positive
      ? tone === 'emerald'
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-300';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
        toneCls
      )}
    >
      <span className="text-white/55 font-normal">{label}</span>
      <span>
        {positive ? '+' : ''}
        <CurrencyDisplay amount={value} />
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Recorder sheet — step 1: pick movement type                                */
/* -------------------------------------------------------------------------- */

function PickStep({ onPick }: { onPick: (k: MovementKind) => void }) {
  const groups: { id: MovementMeta['group']; title: string; subtitle: string }[] = [
    { id: 'in', title: 'Cash coming in', subtitle: 'More money in the drawer.' },
    { id: 'out', title: 'Cash leaving the drawer', subtitle: 'Tracked in piggy as a memo.' },
    { id: 'bank', title: 'Bank deposit', subtitle: 'Cash physically taken to the bank.' },
    { id: 'fix', title: 'Fix or move between pots', subtitle: 'Adjustments and internal transfers.' },
  ];

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b border-white/10 p-5">
        <SheetTitle className="text-white">Record a cash movement</SheetTitle>
        <SheetDescription className="text-white/60">
          Pick what happened — we’ll ask for the details next.
        </SheetDescription>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {groups.map((g) => {
          const items = MOVEMENTS.filter((m) => m.group === g.id);
          return (
            <section key={g.id} className="space-y-2.5">
              <div>
                <h5 className="text-xs font-semibold uppercase tracking-wider text-white/55">
                  {g.title}
                </h5>
                <p className="text-[11px] text-white/40 mt-0.5">{g.subtitle}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.kind}
                      type="button"
                      onClick={() => onPick(m.kind)}
                      className={cn(
                        'group flex items-start gap-3 rounded-xl border p-3 text-left transition-all',
                        'border-white/10 bg-white/[0.03]',
                        ACCENT_HOVER[m.accent],
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                          ACCENT_BG[m.accent]
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">{m.title}</p>
                        <p className="text-[11px] text-white/55 leading-snug mt-0.5">
                          {m.blurb}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Recorder sheet — step 2: fill the form                                     */
/* -------------------------------------------------------------------------- */

type PostEntryFn = (params: {
  kind: ShopCashEntryKind;
  amount: number;
  deltaTill?: number;
  deltaPiggy?: number;
  notes?: string;
  bankReference?: string;
  owner?: string;
}) => Promise<boolean>;

function FillStep({
  kind,
  till,
  piggy,
  onBack,
  onCancel,
  postEntry,
  onSaved,
}: {
  kind: MovementKind;
  till: number;
  piggy: number;
  onBack: () => void;
  onCancel: () => void;
  postEntry: PostEntryFn;
  onSaved: () => void;
}) {
  const meta = findMeta(kind);
  const Icon = meta.icon;
  const { toast } = useToast();
  const formId = `vault-fill-${useId().replace(/:/g, '')}`;

  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [bankRef, setBankRef] = useState('');
  const [owner, setOwner] = useState('me');
  const [busy, setBusy] = useState(false);

  const parsed = meta.needs.signedDelta
    ? parseSignedAmount(amount)
    : parsePositiveAmount(amount);

  const preview = parsed !== null ? previewDeltas(kind, parsed) : null;
  const newTill = preview ? till + preview.drawer : till;
  const newPiggy = preview ? piggy + preview.piggy : piggy;

  const willOverdrawDrawer = preview ? newTill < 0 : false;
  const willOverdrawPiggy = preview ? newPiggy < 0 : false;
  const overdraw = willOverdrawDrawer || willOverdrawPiggy;

  const submit = async () => {
    if (parsed === null) {
      toast({
        title: 'Enter a valid amount',
        description: meta.needs.signedDelta
          ? 'Use a non-zero number — negative if the drawer is short.'
          : 'Use a number greater than zero (commas allowed, e.g. 8,800).',
        variant: 'destructive',
      });
      return;
    }
    if (meta.needs.bankRef && !bankRef.trim()) {
      toast({
        title: 'Bank reference required',
        description: 'Enter the deposit slip / UTR reference.',
        variant: 'destructive',
      });
      return;
    }
    if (meta.needs.notes && !notes.trim()) {
      toast({
        title: 'Note required',
        description: meta.needs.signedDelta
          ? 'Explain why the drawer count changed.'
          : 'Briefly describe what this cash was for.',
        variant: 'destructive',
      });
      return;
    }

    setBusy(true);
    try {
      let ok = false;
      if (meta.needs.signedDelta) {
        ok = await postEntry({
          kind: 'till_adjustment',
          amount: Math.abs(parsed),
          deltaTill: parsed,
          deltaPiggy: 0,
          notes: notes || undefined,
        });
      } else {
        ok = await postEntry({
          kind,
          amount: parsed,
          notes: notes || undefined,
          bankReference: bankRef || undefined,
          owner: meta.needs.owner ? owner : undefined,
        });
      }
      if (ok) onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b border-white/10 p-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs text-white/55 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Pick another
          </button>
        </div>
        <div className="flex items-start gap-3 pt-2">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
              ACCENT_BG[meta.accent]
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-white">{meta.title}</SheetTitle>
            <SheetDescription className="text-white/60">{meta.blurb}</SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <form
        id={formId}
        className="flex-1 overflow-y-auto p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {/* Amount */}
        <div className="space-y-1.5">
          <label
            className="text-xs font-medium uppercase tracking-wider text-white/55"
            htmlFor={`${formId}-amount`}
          >
            {meta.needs.signedDelta ? 'Change to drawer (₹)' : 'Amount (₹)'}
          </label>
          <Input
            id={`${formId}-amount`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder={meta.needs.signedDelta ? 'e.g. -500 or 200' : 'e.g. 8800 or 8,800'}
            className="theme-inset border-white/10 text-white text-lg h-11"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {meta.needs.signedDelta ? (
            <p className="text-[11px] text-white/45">
              Positive if you counted more than expected, negative if the drawer is short.
            </p>
          ) : null}
        </div>

        {/* Owner */}
        {meta.needs.owner && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-white/55">
              Owner
            </label>
            <Select value={owner} onValueChange={setOwner}>
              <SelectTrigger className="border-white/10 bg-white/[0.04] text-white h-11">
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

        {/* Bank reference */}
        {meta.needs.bankRef && (
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium uppercase tracking-wider text-white/55"
              htmlFor={`${formId}-ref`}
            >
              Bank reference / slip
            </label>
            <Input
              id={`${formId}-ref`}
              className="theme-inset border-white/10 text-white h-11"
              value={bankRef}
              onChange={(e) => setBankRef(e.target.value)}
              placeholder="UTR or slip number"
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <label
            className="text-xs font-medium uppercase tracking-wider text-white/55"
            htmlFor={`${formId}-notes`}
          >
            {meta.needs.notes ? 'Reason' : 'Notes (optional)'}
          </label>
          <Textarea
            id={`${formId}-notes`}
            className="theme-inset border-white/10 text-white min-h-[80px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              meta.needs.signedDelta
                ? 'e.g. Counted ₹500 more than expected'
                : meta.needs.notes
                  ? 'e.g. Paid milk supplier ₹450'
                  : 'Optional context for this entry'
            }
          />
        </div>

        {/* Live impact preview */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
            After this entry
          </p>
          <div className="grid grid-cols-2 gap-3">
            <PreviewPot
              icon={Vault}
              label="Drawer"
              before={till}
              after={newTill}
              delta={preview?.drawer ?? 0}
              tone="emerald"
              warning={willOverdrawDrawer}
            />
            <PreviewPot
              icon={PiggyBank}
              label="Piggy"
              before={piggy}
              after={newPiggy}
              delta={preview?.piggy ?? 0}
              tone="amber"
              warning={willOverdrawPiggy}
            />
          </div>
          {overdraw ? (
            <p className="text-[11px] text-rose-300/90">
              Heads up — this would push a balance below ₹0. The server will reject it.
            </p>
          ) : null}
        </div>
      </form>

      <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-white/[0.02] p-4">
        <Button variant="outline" className="border-white/15 text-white" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button
          className="btn-gradient border-0 text-white min-w-[110px]"
          disabled={busy || parsed === null}
          type="submit"
          form={formId}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save entry'}
        </Button>
      </div>
    </div>
  );
}

function PreviewPot({
  icon: Icon,
  label,
  before,
  after,
  delta,
  tone,
  warning,
}: {
  icon: React.ElementType;
  label: string;
  before: number;
  after: number;
  delta: number;
  tone: 'emerald' | 'amber';
  warning: boolean;
}) {
  const deltaText =
    delta === 0
      ? 'unchanged'
      : `${delta > 0 ? '+' : ''}${formatINRCompact(delta)}`;
  const deltaCls =
    delta === 0
      ? 'text-white/40'
      : delta > 0
        ? tone === 'emerald'
          ? 'text-emerald-300'
          : 'text-amber-300'
        : 'text-rose-300';

  return (
    <div
      className={cn(
        'rounded-lg border p-2.5',
        warning
          ? 'border-rose-500/30 bg-rose-500/[0.06]'
          : 'border-white/10 bg-white/[0.04]'
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-white/55" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/55">
          {label}
        </span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-base font-semibold text-white tabular-nums">
          <CurrencyDisplay amount={after} />
        </span>
        <span className={cn('text-[11px] font-medium tabular-nums', deltaCls)}>
          {deltaText}
        </span>
      </div>
      <p className="text-[10px] text-white/35 tabular-nums mt-0.5">
        was <CurrencyDisplay amount={before} />
      </p>
    </div>
  );
}

function formatINRCompact(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}₹${abs.toLocaleString('en-IN')}`;
}
