
import React from 'react';
import { useCash } from '@/context/CashContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Banknote, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const CashSummaryCards = () => {
  const { cashSummaries, todayCashOnHand } = useCash();

  // Get today's summary
  const today = new Date().toISOString().split('T')[0];
  const todaySummary = cashSummaries.find(s => s.date === today);

  // Get yesterday's summary for comparison
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().split('T')[0];
  const yesterdaySummary = cashSummaries.find(s => s.date === yesterdayDate);

  const todaySales = todaySummary?.total_sales || 0;
  const todayDeposits = todaySummary?.total_deposits || 0;
  const yesterdayClosing = yesterdaySummary?.closing_balance || 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Cash on Hand</CardTitle>
          <Banknote className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={todayCashOnHand} />
          </div>
          <p className="text-xs text-gray-400">
            Current cash available
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Today's Sales</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={todaySales} />
          </div>
          <p className="text-xs text-gray-400">
            Cash sales today
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Today's Deposits</CardTitle>
          <TrendingDown className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={todayDeposits} />
          </div>
          <p className="text-xs text-gray-400">
            Deposited to bank today
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Yesterday's Closing</CardTitle>
          <Wallet className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={yesterdayClosing} />
          </div>
          <p className="text-xs text-gray-400">
            Previous day closing balance
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashSummaryCards;
