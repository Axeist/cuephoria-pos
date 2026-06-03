
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, Target, TrendingUp, Loader2 } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { useSummaryAnalytics } from '@/context/SummaryAnalyticsContext';

const TARGET_REVENUE = 28947;

const GamingRevenueWidget: React.FC = () => {
  const { gaming, loading } = useSummaryAnalytics();

  const gamingData = gaming
    ? {
        ps5Gaming: gaming.ps5Gaming,
        eightBallPool: gaming.eightBallPool,
        challengesRevenue: gaming.challengesRevenue,
        canteenSales: gaming.canteenSales,
        totalRevenue: gaming.totalRevenue,
        targetRevenue: TARGET_REVENUE,
        variance: gaming.totalRevenue - TARGET_REVENUE,
        targetProgress: TARGET_REVENUE > 0 ? (gaming.totalRevenue / TARGET_REVENUE) * 100 : 0,
      }
    : null;

  return (
    <Card className="glass-card glass-card-interactive border-white/10 shadow-xl hover:shadow-purple-500/20 hover:border-purple-500/30 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700/30">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-purple-400" />
          Gaming Revenue Breakdown
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Target className="h-4 w-4 text-purple-400" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {loading || !gamingData ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                { label: 'PS5 Gaming', amount: gamingData.ps5Gaming, color: 'blue' },
                { label: '8-Ball Pool', amount: gamingData.eightBallPool, color: 'amber' },
                { label: 'Challenges', amount: gamingData.challengesRevenue, color: 'green' },
                { label: 'Canteen Sales', amount: gamingData.canteenSales, color: 'orange' },
              ].map((row) => (
                <div key={row.label} className="theme-inset p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{row.label}</span>
                    <span className="text-sm font-medium text-white">
                      <CurrencyDisplay amount={row.amount} />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="theme-inset p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-200 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  Total Revenue
                </span>
                <span className="text-lg font-bold text-green-400">
                  <CurrencyDisplay amount={gamingData.totalRevenue} />
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Target: ₹{gamingData.targetRevenue.toLocaleString()}</span>
                  <span className={`font-medium ${gamingData.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {gamingData.variance >= 0 ? '+' : ''}
                    <CurrencyDisplay amount={gamingData.variance} />
                  </span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-400"
                    style={{ width: `${Math.min(gamingData.targetProgress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span className="font-medium">{gamingData.targetProgress.toFixed(1)}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GamingRevenueWidget;
