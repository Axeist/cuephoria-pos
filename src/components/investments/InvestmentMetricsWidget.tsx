
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { InvestmentPartner, InvestmentTransaction } from '@/types/investment.types';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Activity
} from 'lucide-react';

interface InvestmentMetricsWidgetProps {
  partners: InvestmentPartner[];
  transactions: InvestmentTransaction[];
}

const InvestmentMetricsWidget: React.FC<InvestmentMetricsWidgetProps> = ({
  partners,
  transactions
}) => {
  // Calculate key metrics
  const totalInvestments = transactions
    .filter(t => t.transaction_type === 'investment' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = transactions
    .filter(t => t.transaction_type === 'withdrawal' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDividends = transactions
    .filter(t => t.transaction_type === 'dividend' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalReturns = transactions
    .filter(t => t.transaction_type === 'return' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const netInvestment = totalInvestments - totalWithdrawals;
  const totalPayouts = totalDividends + totalReturns;

  // Calculate recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentTransactions = transactions.filter(t => 
    new Date(t.transaction_date) >= thirtyDaysAgo && t.status === 'completed'
  );

  const recentInvestments = recentTransactions
    .filter(t => t.transaction_type === 'investment')
    .reduce((sum, t) => sum + t.amount, 0);

  const recentPayouts = recentTransactions
    .filter(t => t.transaction_type === 'dividend' || t.transaction_type === 'return')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">
            Total Investments
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={totalInvestments} />
          </div>
          <p className="text-xs text-gray-400">
            Net: <CurrencyDisplay amount={netInvestment} />
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">
            Total Payouts
          </CardTitle>
          <DollarSign className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={totalPayouts} />
          </div>
          <div className="flex gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              Dividends: <CurrencyDisplay amount={totalDividends} />
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">
            Recent Activity (30d)
          </CardTitle>
          <Activity className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            {recentTransactions.length}
          </div>
          <p className="text-xs text-gray-400">
            Investments: <CurrencyDisplay amount={recentInvestments} />
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">
            Investment Efficiency
          </CardTitle>
          {totalPayouts > totalInvestments * 0.1 ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-orange-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            {totalInvestments > 0 ? ((totalPayouts / totalInvestments) * 100).toFixed(1) : '0'}%
          </div>
          <p className="text-xs text-gray-400">
            Return on investment
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentMetricsWidget;
