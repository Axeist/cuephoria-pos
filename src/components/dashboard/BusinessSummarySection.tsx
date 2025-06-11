
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
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Gross Income</CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={grossIncome} />
          </div>
          <p className="text-xs text-gray-400">
            {dateRange ? 'Revenue for selected period' : 'Total revenue from all sales'}
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Total Expenses</CardTitle>
          <Wallet className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={totalExpenses} />
          </div>
          <p className="text-xs text-gray-400">
            {filteredExpenses ? 'Expenses for selected period' : 'All business expenses'}
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Net Profit</CardTitle>
          {netProfit >= 0 ? (
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={netProfit} />
          </div>
          <p className="text-xs text-gray-400">
            {netProfit >= 0 
              ? "Income after all expenses" 
              : "Operating at a loss"}
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-200">Profit Margin</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
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
