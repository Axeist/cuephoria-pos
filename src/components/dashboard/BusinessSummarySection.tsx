import React, { useMemo } from 'react';
import { useExpenses } from '@/context/ExpenseContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, TrendingUp, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useBusinessAnalytics } from '@/hooks/useBusinessAnalytics';

interface BusinessSummarySectionProps {
  filteredExpenses?: any[];
  dateRange?: { start: Date; end: Date; };
}

const normalizeCategory = (c: string) => (c === 'restock' ? 'inventory' : c);

const BusinessSummarySection: React.FC<BusinessSummarySectionProps> = ({ filteredExpenses, dateRange }) => {
  const { expenses } = useExpenses();
  const expensesToUse = filteredExpenses ?? expenses;

  const { stats, loading } = useBusinessAnalytics({
    startDate: dateRange?.start,
    endDate: dateRange?.end,
  });

  const summary = useMemo(() => {
    const withdrawals = expensesToUse
      .filter((e: any) => normalizeCategory(e.category) === 'withdrawal')
      .reduce((sum: number, e: any) => sum + e.amount, 0);

    const operatingExpenses = expensesToUse
      .filter((e: any) => normalizeCategory(e.category) !== 'withdrawal')
      .reduce((sum: number, e: any) => sum + e.amount, 0);

    const grossIncome = stats?.grossIncome ?? 0;
    const netProfit = grossIncome - operatingExpenses;
    const moneyInBank = netProfit - withdrawals;
    const profitMargin = grossIncome > 0 ? (netProfit / grossIncome) * 100 : 0;

    return {
      grossIncome,
      operatingExpenses,
      netProfit,
      moneyInBank,
      profitMargin,
      withdrawals,
      profitPercentage: Math.max(0, Math.min(100, profitMargin)),
      formattedProfitMargin: profitMargin.toFixed(2),
    };
  }, [stats, expensesToUse]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12 text-white/60 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading business summary…
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 w-full max-w-full overflow-hidden">
      <Card className="glass-card glass-card-interactive border-white/10 hover:shadow-emerald-500/20 hover:border-emerald-500/35 transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white/85">Gross Income</CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white"><CurrencyDisplay amount={summary.grossIncome} /></div>
          <p className="text-xs text-white/55">{dateRange ? 'Revenue for selected period (paid only)' : 'Revenue (paid only)'}</p>
        </CardContent>
      </Card>

      <Card className="glass-card glass-card-interactive border-white/10 hover:shadow-orange-500/20 hover:border-orange-500/35 transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white/85">Operating Expenses</CardTitle>
          <Wallet className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white"><CurrencyDisplay amount={summary.operatingExpenses} /></div>
          <p className="text-xs text-white/55">{filteredExpenses ? 'Expenses for selected period (excl. withdrawals)' : 'All operating expenses (excl. withdrawals)'}</p>
        </CardContent>
      </Card>

      <Card className={`glass-card glass-card-interactive border-white/10 transition-all ${summary.netProfit >= 0 ? 'hover:shadow-green-500/20 hover:border-green-500/35' : 'hover:shadow-red-500/20 hover:border-red-500/35'}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white/85">Net Profit</CardTitle>
          {summary.netProfit >= 0 ? <ArrowUpRight className="h-4 w-4 text-green-500" /> : <ArrowDownRight className="h-4 w-4 text-red-500" />}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white"><CurrencyDisplay amount={summary.netProfit} /></div>
          <p className="text-xs text-white/55">Revenue minus operating expenses</p>
        </CardContent>
      </Card>

      <Card className="glass-card glass-card-interactive border-white/10 hover:shadow-blue-500/20 hover:border-blue-500/35 transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white/85">Profit Margin</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{summary.formattedProfitMargin}%</div>
          <div className="mt-2"><Progress value={summary.profitPercentage} className="h-2" /></div>
          <p className="text-xs text-white/55 mt-1">{summary.profitMargin >= 20 ? 'Healthy' : summary.profitMargin >= 10 ? 'Average' : 'Low'}</p>
        </CardContent>
      </Card>

      <Card className="glass-card glass-card-interactive border-white/10 hover:shadow-rose-500/20 hover:border-rose-500/35 transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white/85">Withdrawals</CardTitle>
          <ArrowDownRight className="h-4 w-4 text-rose-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white"><CurrencyDisplay amount={summary.withdrawals} /></div>
          <p className="text-xs text-white/55">Partner drawings (excluded from expenses)</p>
        </CardContent>
      </Card>

      <Card className="glass-card glass-card-interactive border-white/10 hover:shadow-sky-500/20 hover:border-sky-500/35 transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white/85">Money in Bank</CardTitle>
          <ArrowUpRight className="h-4 w-4 text-sky-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white"><CurrencyDisplay amount={summary.moneyInBank} /></div>
          <p className="text-xs text-white/55">Net profit after withdrawals</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessSummarySection;
