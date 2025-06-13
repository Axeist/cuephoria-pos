
import React from 'react';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BusinessSummarySectionProps {
  filteredExpenses?: any[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

const BusinessSummarySection: React.FC<BusinessSummarySectionProps> = ({ 
  filteredExpenses,
  dateRange 
}) => {
  const { bills, products } = usePOS();
  const { expenses } = useExpenses();
  
  // Use filtered expenses if provided, otherwise use all expenses
  const expensesToUse = filteredExpenses || expenses;
  
  // Filter bills by date range if provided
  const filteredBills = dateRange 
    ? bills.filter(bill => {
        const billDate = new Date(bill.createdAt);
        return billDate >= dateRange.start && billDate <= dateRange.end;
      })
    : bills;
  
  // Calculate gross income from filtered bills
  const grossIncome = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
  
  // Calculate total expenses from filtered expenses
  const totalExpenses = expensesToUse.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Calculate net profit
  const netProfit = grossIncome - totalExpenses;
  
  // Calculate profit margin percentage
  const profitMargin = grossIncome > 0 ? (netProfit / grossIncome) * 100 : 0;
  
  // Calculate progress percentage for visualizing profit margin
  const profitPercentage = Math.max(0, Math.min(100, profitMargin));
  
  // Format profitMargin to 2 decimal places
  const formattedProfitMargin = profitMargin.toFixed(2);
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gradient-to-br from-gray-900/95 via-emerald-950/30 to-gray-800/90 border-emerald-600/40 shadow-xl hover:shadow-emerald-500/30 hover:border-emerald-400/50 transition-all duration-300 hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Gross Income</CardTitle>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <DollarSign className="h-4 w-4 text-emerald-400 drop-shadow-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white drop-shadow-sm">
            <CurrencyDisplay amount={grossIncome} />
          </div>
          <p className="text-xs text-gray-400">
            {dateRange ? 'Revenue for selected period' : 'Total revenue from all sales'}
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-gray-900/95 via-red-950/30 to-gray-800/90 border-red-600/40 shadow-xl hover:shadow-red-500/30 hover:border-red-400/50 transition-all duration-300 hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Total Expenses</CardTitle>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500/30 to-red-600/20 flex items-center justify-center shadow-lg shadow-red-500/20">
            <Wallet className="h-4 w-4 text-red-400 drop-shadow-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white drop-shadow-sm">
            <CurrencyDisplay amount={totalExpenses} />
          </div>
          <p className="text-xs text-gray-400">
            {filteredExpenses ? 'Expenses for selected period' : 'All business expenses'}
          </p>
        </CardContent>
      </Card>
      
      <Card className={`bg-gradient-to-br from-gray-900/95 to-gray-800/90 border shadow-xl transition-all duration-300 hover:scale-[1.02] ${
        netProfit >= 0 
          ? 'via-green-950/30 border-green-600/40 hover:shadow-green-500/30 hover:border-green-400/50' 
          : 'via-orange-950/30 border-orange-600/40 hover:shadow-orange-500/30 hover:border-orange-400/50'
      }`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Net Profit</CardTitle>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center shadow-lg ${
            netProfit >= 0 
              ? 'bg-gradient-to-br from-green-500/30 to-green-600/20 shadow-green-500/20' 
              : 'bg-gradient-to-br from-orange-500/30 to-orange-600/20 shadow-orange-500/20'
          }`}>
            {netProfit >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-400 drop-shadow-sm" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-orange-400 drop-shadow-sm" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white drop-shadow-sm">
            <CurrencyDisplay amount={netProfit} />
          </div>
          <p className="text-xs text-gray-400">
            {netProfit >= 0 
              ? "Income after all expenses" 
              : "Operating at a loss"}
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-gray-900/95 via-indigo-950/30 to-gray-800/90 border-indigo-600/40 shadow-xl hover:shadow-indigo-500/30 hover:border-indigo-400/50 transition-all duration-300 hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Profit Margin</CardTitle>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <TrendingUp className="h-4 w-4 text-indigo-400 drop-shadow-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white drop-shadow-sm">
            {formattedProfitMargin}%
          </div>
          <div className="mt-2">
            <Progress value={profitPercentage} className="h-2" />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {profitMargin >= 20 
              ? "Healthy profit margin" 
              : profitMargin >= 10 
                ? "Average profit margin" 
                : "Low profit margin"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessSummarySection;
