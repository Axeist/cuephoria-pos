
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Loader2 } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { useLocationAnalytics } from '@/hooks/useLocationAnalytics';

const ProductProfitWidget: React.FC = () => {
  const { canteen, loading } = useLocationAnalytics();

  const totalProfit = canteen?.totalProfit ?? 0;
  const totalSales = canteen?.totalSales ?? 0;
  const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  return (
    <Card className="mb-6 glass-card glass-card-interactive border-white/10 shadow-xl hover:shadow-green-500/20 hover:border-green-500/30 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium text-white">Total Product Profit</CardTitle>
        <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <DollarSign className="h-4 w-4 text-green-400" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-green-400" />
        ) : (
          <>
            <div className="text-xl font-bold text-green-400">
              <CurrencyDisplay amount={totalProfit} />
            </div>
            <p className="text-xs text-gray-400">
              Profit margin: {profitMargin.toFixed(1)}%
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductProfitWidget;
