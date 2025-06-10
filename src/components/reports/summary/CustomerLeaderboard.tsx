
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  totalSpent: number;
  visitCount: number;
  loyaltyPoints: number;
  isMember: boolean;
}

interface CustomerLeaderboardProps {
  customers: Customer[];
}

const CustomerLeaderboard: React.FC<CustomerLeaderboardProps> = ({ customers }) => {
  const topCustomers = customers
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-400">#{index + 1}</span>;
    }
  };

  return (
    <Card className="border-gray-800 bg-[#1A1F2C] shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Customers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topCustomers.map((customer, index) => (
            <div
              key={customer.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getRankIcon(index)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{customer.name}</span>
                    {customer.isMember && (
                      <Badge variant="outline" className="bg-purple-900/30 text-purple-400 border-purple-800 text-xs">
                        Member
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    {customer.visitCount} visits • {customer.loyaltyPoints} points
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-semibold">
                  <CurrencyDisplay amount={customer.totalSpent} />
                </div>
              </div>
            </div>
          ))}
          {topCustomers.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Trophy className="h-12 w-12 mx-auto mb-2 text-gray-600" />
              <p>No customer data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerLeaderboard;
