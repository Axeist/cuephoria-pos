import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { DollarSign, CreditCard, Split, Gamepad2, Package, HandCoins, Gift, Loader2 } from 'lucide-react';
import type { BillAggregateMetrics, GamingRevenueStats, PaymentBreakdownStats } from '@/hooks/useLocationAnalytics';

interface SalesWidgetsProps {
  billMetrics?: BillAggregateMetrics | null;
  payment?: PaymentBreakdownStats | null;
  gaming?: GamingRevenueStats | null;
  loading?: boolean;
}

const SalesWidgets: React.FC<SalesWidgetsProps> = ({
  billMetrics,
  payment,
  gaming,
  loading,
}) => {
  if (loading || !billMetrics || !payment || !gaming) {
    return (
      <div className="flex items-center justify-center py-16 mb-8">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  const cashSales = payment.cashTotal;
  const upiSales = payment.upiTotal;
  const creditSales = payment.creditTotal;
  const razorpaySales = payment.razorpayTotal;
  const splitCashAmount = payment.splitCashTotal;
  const splitUpiAmount = payment.splitUpiTotal;
  const totalSplitSales = splitCashAmount + splitUpiAmount;
  const complimentarySales = billMetrics.complimentarySales;
  const complimentaryCount = billMetrics.complimentaryCount;
  const ps5SessionSales = gaming.ps5Gaming;
  const eightBallSales = gaming.eightBallPool;
  const productSales = gaming.canteenSales + gaming.challengesRevenue;
  const totalSales = billMetrics.totalRevenue;

  const cardBase =
    'glass-card glass-card-interactive border-white/10 shadow-xl transition-all duration-300';

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 mb-8">
      <Card className={`${cardBase} hover:shadow-red-500/25 hover:border-red-400/35`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">Cash Sales</CardTitle>
          <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-red-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={cashSales} />
          </div>
        </CardContent>
      </Card>

      <Card className={`${cardBase} hover:shadow-blue-500/25 hover:border-blue-400/35`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">UPI Sales</CardTitle>
          <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-blue-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={upiSales} />
          </div>
        </CardContent>
      </Card>

      <Card className={`${cardBase} hover:shadow-orange-500/25 hover:border-orange-400/35`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">Credit Sales</CardTitle>
          <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
            <HandCoins className="h-5 w-5 text-orange-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={creditSales} />
          </div>
        </CardContent>
      </Card>

      <Card className={`${cardBase} hover:shadow-indigo-500/25 hover:border-indigo-400/35`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">Razorpay Sales</CardTitle>
          <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-indigo-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={razorpaySales} />
          </div>
        </CardContent>
      </Card>

      <Card className={`${cardBase} hover:shadow-purple-500/25 hover:border-purple-400/35`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">Split Payments</CardTitle>
          <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Split className="h-5 w-5 text-purple-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white mb-2">
            <CurrencyDisplay amount={totalSplitSales} />
          </div>
          <div className="text-xs text-white/50 space-y-0.5">
            <div>Cash: <CurrencyDisplay amount={splitCashAmount} /></div>
            <div>UPI: <CurrencyDisplay amount={splitUpiAmount} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className={`${cardBase} border-amber-500/20 hover:border-amber-400/40 hover:shadow-amber-500/20`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-amber-100/95">Complimentary</CardTitle>
          <div className="h-10 w-10 rounded-full bg-amber-500/30 flex items-center justify-center">
            <Gift className="h-5 w-5 text-amber-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-400 mb-2">
            <CurrencyDisplay amount={complimentarySales} />
          </div>
          <div className="text-xs text-amber-300/70">{complimentaryCount} transactions</div>
        </CardContent>
      </Card>

      <Card className={`${cardBase} hover:shadow-cyan-500/25 hover:border-cyan-400/35`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">PS5 Sessions</CardTitle>
          <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <Gamepad2 className="h-5 w-5 text-cyan-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={ps5SessionSales} />
          </div>
        </CardContent>
      </Card>

      <Card className={`${cardBase} hover:shadow-yellow-500/25 hover:border-yellow-400/35`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">8-Ball Sessions</CardTitle>
          <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Gamepad2 className="h-5 w-5 text-yellow-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={eightBallSales} />
          </div>
        </CardContent>
      </Card>

      <Card className={`${cardBase} hover:shadow-pink-500/25 hover:border-pink-400/35`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">Product Sales</CardTitle>
          <div className="h-10 w-10 rounded-full bg-pink-500/20 flex items-center justify-center">
            <Package className="h-5 w-5 text-pink-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={productSales} />
          </div>
        </CardContent>
      </Card>

      <Card className={`${cardBase} hover:shadow-emerald-500/25 hover:border-emerald-400/35`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">Total Sales</CardTitle>
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-emerald-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white mb-2">
            <CurrencyDisplay amount={totalSales} />
          </div>
          <p className="text-xs text-white/50">Paid transactions only</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(SalesWidgets);
