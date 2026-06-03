import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Loader2 } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { useLocationAnalytics } from '@/hooks/useLocationAnalytics';

const ProductSalesWidget: React.FC = () => {
  const { canteen, loading } = useLocationAnalytics();

  const totalProductSales = canteen?.totalSales ?? 0;
  const totalItemsSold = canteen?.products.reduce((sum, p) => sum + p.quantity, 0) ?? 0;

  return (
    <Card className="mb-6 glass-card glass-card-interactive border-white/10 shadow-xl hover:shadow-blue-500/20 hover:border-blue-500/30 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium text-white">Total Product Sales</CardTitle>
        <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-blue-400" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
        ) : (
          <>
            <div className="text-xl font-bold text-white">
              <CurrencyDisplay amount={totalProductSales} />
            </div>
            <p className="text-xs text-gray-400">
              Food & drinks sold ({totalItemsSold} items)
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductSalesWidget;
