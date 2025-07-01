
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { InvestmentPartner, InvestmentTransaction } from '@/types/investment.types';
import { 
  TrendingUp, 
  Users, 
  Percent, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';

interface InvestmentSummaryCardsProps {
  partners: InvestmentPartner[];
  transactions: InvestmentTransaction[];
}

const InvestmentSummaryCards: React.FC<InvestmentSummaryCardsProps> = ({
  partners,
  transactions
}) => {
  const totalInvestment = partners.reduce((sum, partner) => sum + partner.investment_amount, 0);
  const activePartners = partners.filter(p => p.status === 'active').length;
  const totalEquity = partners.reduce((sum, partner) => sum + (partner.equity_percentage || 0), 0);
  const averageInvestment = partners.length > 0 ? totalInvestment / partners.length : 0;

  const totalReturns = transactions
    .filter(t => t.transaction_type === 'dividend' || t.transaction_type === 'return')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = transactions
    .filter(t => t.transaction_type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);

  const netReturns = totalReturns - totalWithdrawals;
  const roi = totalInvestment > 0 ? (netReturns / totalInvestment) * 100 : 0;

  // Calculate monthly growth (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentTransactions = transactions.filter(t => 
    new Date(t.transaction_date) >= thirtyDaysAgo
  );
  
  const monthlyGrowth = recentTransactions
    .filter(t => t.transaction_type === 'investment')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">
            Total Investment
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={totalInvestment} />
          </div>
          <p className="text-xs text-gray-400">
            From {partners.length} partners
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">
            Active Partners
          </CardTitle>
          <Users className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            {activePartners}
          </div>
          <p className="text-xs text-gray-400">
            Out of {partners.length} total
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">
            Total Equity
          </CardTitle>
          <Percent className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            {totalEquity.toFixed(1)}%
          </div>
          <p className="text-xs text-gray-400">
            Distributed equity
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">
            Average Investment
          </CardTitle>
          <BarChart3 className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={averageInvestment} />
          </div>
          <p className="text-xs text-gray-400">
            Per partner
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">
            Net Returns
          </CardTitle>
          {netReturns >= 0 ? (
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={netReturns} />
          </div>
          <p className="text-xs text-gray-400">
            ROI: {roi.toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">
            Monthly Growth
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={monthlyGrowth} />
          </div>
          <p className="text-xs text-gray-400">
            Last 30 days
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentSummaryCards;
