import { useCallback, useEffect, useState } from 'react';
import { supabase, handleSupabaseError } from '@/integrations/supabase/client';
import { useLocation } from '@/context/LocationContext';
import { useToast } from '@/hooks/use-toast';

export type ShopCashEntryKind =
  | 'till_top_up'
  | 'till_adjustment'
  | 'till_to_piggy_owner'
  | 'till_to_piggy_cash_expense'
  | 'till_bank_deposit'
  | 'piggy_bank_deposit'
  | 'piggy_to_till_return'
  | 'reversal';

export type ShopCashLedgerRow = {
  id: string;
  location_id: string;
  entry_kind: ShopCashEntryKind;
  delta_till: number;
  delta_piggy: number;
  amount: number;
  notes: string | null;
  bank_reference: string | null;
  owner: string | null;
  reverses_ledger_id: string | null;
  idempotency_key: string | null;
  created_at: string;
  created_by: string;
};

export type ShopCashBalances = {
  till_amount: number;
  piggy_amount: number;
  updated_at: string;
  updated_by: string;
};

const PAGE_SIZE = 50;
const CREATED_BY = 'admin';

function computeDeltas(
  kind: ShopCashEntryKind,
  amount: number,
  deltaTill?: number,
  deltaPiggy?: number
): { delta_till: number; delta_piggy: number; displayAmount: number } {
  const a = amount;
  switch (kind) {
    case 'till_top_up':
      return { delta_till: a, delta_piggy: 0, displayAmount: a };
    case 'till_bank_deposit':
      return { delta_till: -a, delta_piggy: 0, displayAmount: a };
    case 'till_to_piggy_owner':
    case 'till_to_piggy_cash_expense':
      return { delta_till: -a, delta_piggy: a, displayAmount: a };
    case 'piggy_bank_deposit':
      return { delta_till: 0, delta_piggy: -a, displayAmount: a };
    case 'piggy_to_till_return':
      return { delta_till: a, delta_piggy: -a, displayAmount: a };
    case 'till_adjustment': {
      const dt = deltaTill ?? 0;
      const dp = deltaPiggy ?? 0;
      const mag = Math.max(Math.abs(dt), Math.abs(dp));
      if (mag === 0) throw new Error('Adjustment must change till or piggy');
      return { delta_till: dt, delta_piggy: dp, displayAmount: mag };
    }
    default:
      throw new Error(`Unsupported kind for computeDeltas: ${kind}`);
  }
}

export function useShopCash() {
  const { activeLocationId, loading: locationsLoading } = useLocation();
  const { toast } = useToast();
  const [balances, setBalances] = useState<ShopCashBalances | null>(null);
  const [ledger, setLedger] = useState<ShopCashLedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const loadBalances = useCallback(async () => {
    if (!activeLocationId) {
      setBalances(null);
      setBalancesLoading(false);
      return;
    }
    setBalancesLoading(true);
    try {
      const { data, error } = await supabase
        .from('shop_cash_balances')
        .select('till_amount, piggy_amount, updated_at, updated_by')
        .eq('location_id', activeLocationId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setBalances({
          till_amount: Number(data.till_amount),
          piggy_amount: Number(data.piggy_amount),
          updated_at: data.updated_at,
          updated_by: data.updated_by,
        });
      } else {
        setBalances({ till_amount: 0, piggy_amount: 0, updated_at: new Date().toISOString(), updated_by: 'system' });
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: handleSupabaseError(e, 'loading cash balances'),
        variant: 'destructive',
      });
      setBalances(null);
    } finally {
      setBalancesLoading(false);
    }
  }, [activeLocationId, toast]);

  const loadLedgerPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!activeLocationId) {
        setLedger([]);
        setLedgerLoading(false);
        return;
      }
      setLedgerLoading(true);
      try {
        const from = nextPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await supabase
          .from('shop_cash_ledger')
          .select('*')
          .eq('location_id', activeLocationId)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;
        const rows = (data || []) as ShopCashLedgerRow[];
        setHasMore(rows.length === PAGE_SIZE);
        setPage(nextPage);
        if (append && nextPage > 0) {
          setLedger((prev) => [...prev, ...rows]);
        } else {
          setLedger(rows);
        }
      } catch (e) {
        toast({
          title: 'Error',
          description: handleSupabaseError(e, 'loading ledger'),
          variant: 'destructive',
        });
      } finally {
        setLedgerLoading(false);
      }
    },
    [activeLocationId, toast]
  );

  const refreshAll = useCallback(async () => {
    await loadBalances();
    await loadLedgerPage(0, false);
  }, [loadBalances, loadLedgerPage]);

  useEffect(() => {
    if (locationsLoading) return;
    if (!activeLocationId) {
      setBalances(null);
      setLedger([]);
      setBalancesLoading(false);
      setLedgerLoading(false);
      return;
    }
    void loadBalances();
    void loadLedgerPage(0, false);
  }, [activeLocationId, locationsLoading, loadBalances, loadLedgerPage]);

  const postEntry = useCallback(
    async (params: {
      kind: ShopCashEntryKind;
      amount: number;
      deltaTill?: number;
      deltaPiggy?: number;
      notes?: string;
      bankReference?: string;
      owner?: string;
    }) => {
      if (!activeLocationId) {
        toast({ title: 'Branch required', description: 'Select a branch first.', variant: 'destructive' });
        return false;
      }
      try {
        const { delta_till, delta_piggy, displayAmount } = computeDeltas(
          params.kind,
          params.amount,
          params.deltaTill,
          params.deltaPiggy
        );

        const idempotency_key = crypto.randomUUID();

        const { error } = await supabase.from('shop_cash_ledger').insert({
          location_id: activeLocationId,
          entry_kind: params.kind,
          delta_till,
          delta_piggy,
          amount: displayAmount,
          notes: params.notes ?? null,
          bank_reference: params.bankReference ?? null,
          owner: params.owner ?? null,
          idempotency_key,
          created_by: CREATED_BY,
        });

        if (error) throw error;

        toast({ title: 'Recorded', description: 'Cash movement saved to the ledger.' });
        await refreshAll();
        return true;
      } catch (e: unknown) {
        const msg =
          typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message: string }).message === 'string'
            ? (e as { message: string }).message
            : handleSupabaseError(e, 'recording cash movement');
        toast({
          title: 'Could not record',
          description: msg.includes('insufficient balance') ? 'Not enough cash in till or piggy for this movement.' : msg,
          variant: 'destructive',
        });
        return false;
      }
    },
    [activeLocationId, refreshAll, toast]
  );

  const reverseEntry = useCallback(
    async (row: ShopCashLedgerRow) => {
      if (!activeLocationId) {
        toast({ title: 'Branch required', description: 'Select a branch first.', variant: 'destructive' });
        return false;
      }
      if (row.entry_kind === 'reversal') {
        toast({ title: 'Cannot reverse', description: 'This row is already a reversal.', variant: 'destructive' });
        return false;
      }
      try {
        const idempotency_key = crypto.randomUUID();
        const { error } = await supabase.from('shop_cash_ledger').insert({
          location_id: activeLocationId,
          entry_kind: 'reversal',
          delta_till: -Number(row.delta_till),
          delta_piggy: -Number(row.delta_piggy),
          amount: Number(row.amount),
          notes: row.notes ? `Reversal: ${row.notes}` : 'Reversal of prior entry',
          bank_reference: null,
          owner: null,
          reverses_ledger_id: row.id,
          idempotency_key,
          created_by: CREATED_BY,
        });

        if (error) throw error;

        toast({ title: 'Reversal recorded', description: 'Balances updated.' });
        await refreshAll();
        return true;
      } catch (e) {
        toast({
          title: 'Error',
          description: handleSupabaseError(e, 'reversing entry'),
          variant: 'destructive',
        });
        return false;
      }
    },
    [activeLocationId, refreshAll, toast]
  );

  const loadMore = useCallback(() => {
    if (!hasMore || ledgerLoading) return;
    void loadLedgerPage(page + 1, true);
  }, [hasMore, ledgerLoading, loadLedgerPage, page]);

  return {
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
  };
}
