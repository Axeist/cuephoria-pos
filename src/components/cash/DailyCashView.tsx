
import React from 'react';
import { useCash } from '@/context/CashContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { format } from 'date-fns';

const DailyCashView = () => {
  const { cashSummaries } = useCash();

  // Get last 7 days of summaries
  const last7Days = cashSummaries.slice(0, 7);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Daily Cash Summary</h3>
      
      <div className="grid gap-4">
        {last7Days.map((summary) => (
          <Card key={summary.id} className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white">
                {format(new Date(summary.date), 'EEEE, MMMM d, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-gray-400 mb-1">Opening</p>
                  <p className="font-semibold text-white">
                    <CurrencyDisplay amount={summary.opening_balance} />
                  </p>
                </div>
                
                <div>
                  <p className="text-gray-400 mb-1">Sales</p>
                  <p className="font-semibold text-green-400">
                    +<CurrencyDisplay amount={summary.total_sales} />
                  </p>
                </div>
                
                <div>
                  <p className="text-gray-400 mb-1">Deposits</p>
                  <p className="font-semibold text-orange-400">
                    -<CurrencyDisplay amount={summary.total_deposits} />
                  </p>
                </div>
                
                <div>
                  <p className="text-gray-400 mb-1">Withdrawals</p>
                  <p className="font-semibold text-red-400">
                    -<CurrencyDisplay amount={summary.total_withdrawals} />
                  </p>
                </div>
                
                <div>
                  <p className="text-gray-400 mb-1">Closing</p>
                  <p className="font-semibold text-white">
                    <CurrencyDisplay amount={summary.closing_balance} />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {last7Days.length === 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-gray-400">No cash summaries available yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DailyCashView;
