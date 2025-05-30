
import React from 'react';
import { usePOS } from '@/context/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const BusinessSummarySection = () => {
  const { bills, products } = usePOS();
  
  // Calculate gross income from all bills
  const grossIncome = bills.reduce((sum, bill) => sum + bill.total, 0);
  
  // Calculate total expenses - this would need to come from the expense context
  // For now, we'll calculate based on cost of goods sold
  const totalExpenses = bills.reduce((sum, bill) => {
    // Get bill items and calculate cost based on buying prices
    const billCost = bill.items?.reduce((itemSum, item) => {
      const product = products.find(p => p.id === item.id || p.name === item.name);
      if (product && product.buyingPrice) {
        return itemSum + (product.buyingPrice * item.quantity);
      }
      return itemSum;
    }, 0) || 0;
    return sum + billCost;
  }, 0);
  
  // Calculate net profit
  const netProfit = grossIncome - totalExpenses;
  
  // Calculate profit margin percentage
  const profitMargin = grossIncome > 0 ? (netProfit / grossIncome) * 100 : 0;
  
  // Calculate progress percentage for visualizing profit margin
  const profitPercentage = Math.max(0, Math.min(100, profitMargin));
  
  // Format profitMargin to 2 decimal places
  const formattedProfitMargin = profitMargin.toFixed(2);
  
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Gross Income</CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <CurrencyDisplay amount={grossIncome} />
          </div>
          <p className="text-xs text-muted-foreground">
            Total revenue from all sales
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <Wallet className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <CurrencyDisplay amount={totalExpenses} />
          </div>
          <p className="text-xs text-muted-foreground">
            Cost of goods sold
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          {netProfit >= 0 ? (
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <CurrencyDisplay amount={netProfit} />
          </div>
          <p className="text-xs text-muted-foreground">
            {netProfit >= 0 
              ? "Income after all expenses" 
              : "Operating at a loss"}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formattedProfitMargin}%
          </div>
          <div className="mt-2">
            <Progress value={profitPercentage} className="h-2" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
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
