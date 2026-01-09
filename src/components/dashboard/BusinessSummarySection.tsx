import React from 'react';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BusinessSummarySectionProps {
  filteredExpenses?: any[];
  dateRange?: { start: Date; end: Date; };
}

const normalizeCategory = (c: string) => (c === 'restock' ? 'inventory' : c);

const BusinessSummarySection: React.FC<BusinessSummarySectionProps> = ({ filteredExpenses, dateRange }) => {
  const { bills } = usePOS();
  const { expenses } = useExpenses();
  const expensesToUse = filteredExpenses ?? expenses;

  const inRange = (d: Date) => !dateRange || (d >= dateRange.start && d <= dateRange.end);

  const grossIncome = bills
    .filter((b: any) => b?.paymentMethod !== 'complimentary')
    .filter((b: any) => inRange(new Date(b.createdAt)))
    .reduce((sum: number, b: any) => sum + (b?.total ?? 0), 0);

  const withdrawals = expensesToUse
    .filter((e: any) => normalizeCategory(e.category) === 'withdrawal')
    .reduce((sum: number, e: any) => sum + e.amount, 0);

  const operatingExpenses = expensesToUse
    .filter((e: any) => normalizeCategory(e.category) !== 'withdrawal')
    .reduce((sum: number, e: any) => sum + e.amount, 0);

  const netProfit = grossIncome - operatingExpenses;
  const moneyInBank = netProfit - withdrawals;
  const profitMargin = grossIncome > 0 ? (netProfit / grossIncome) * 100 : 0;
  const profitPercentage = Math.max(0, Math.min(100, profitMargin));
  const formattedProfitMargin = profitMargin.toFixed(2);

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 w-full max-w-full overflow-hidden">
      <Card className="bg-gray-800 border-gray-700 hover:shadow-emerald-500/20 hover:border-emerald-500/30 transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Gross Income</CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white"><CurrencyDisplay amount={grossIncome} /></div>
          <p className="text-xs text-gray-400">{dateRange ? 'Revenue for selected period (paid only)' : 'Revenue (paid only)'}</p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700 hover:shadow-orange-500/20 hover:border-orange-500/30 transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Operating Expenses</CardTitle>
          <Wallet className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white"><CurrencyDisplay amount={operatingExpenses} /></div>
          <p className="text-xs text-gray-400">{filteredExpenses ? 'Expenses for selected period (excl. withdrawals)' : 'All operating expenses (excl. withdrawals)'}</p>
        </CardContent>
      </Card>

      <Card className={`bg-gray-800 border-gray-700 transition-all ${netProfit >= 0 ? 'hover:shadow-green-500/20 hover:border-green-500/30' : 'hover:shadow-red-500/20 hover:border-red-500/30'}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Net Profit</CardTitle>
          {netProfit >= 0 ? <ArrowUpRight className="h-4 w-4 text-green-500" /> : <ArrowDownRight className="h-4 w-4 text-red-500" />}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white"><CurrencyDisplay amount={netProfit} /></div>
          <p className="text-xs text-gray-400">Revenue minus operating expenses</p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700 hover:shadow-blue-500/20 hover:border-blue-500/30 transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Profit Margin</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{formattedProfitMargin}%</div>
          <div className="mt-2"><Progress value={profitPercentage} className="h-2" /></div>
          <p className="text-xs text-gray-400 mt-1">{profitMargin >= 20 ? 'Healthy' : profitMargin >= 10 ? 'Average' : 'Low'}</p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700 hover:shadow-rose-500/20 hover:border-rose-500/30 transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Withdrawals</CardTitle>
          <ArrowDownRight className="h-4 w-4 text-rose-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white"><CurrencyDisplay amount={withdrawals} /></div>
          <p className="text-xs text-gray-400">Partner drawings (excluded from expenses)</p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700 hover:shadow-sky-500/20 hover:border-sky-500/30 transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Money in Bank</CardTitle>
          <ArrowUpRight className="h-4 w-4 text-sky-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white"><CurrencyDisplay amount={moneyInBank} /></div>
          <p className="text-xs text-gray-400">Net profit after withdrawals</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessSummarySection;
