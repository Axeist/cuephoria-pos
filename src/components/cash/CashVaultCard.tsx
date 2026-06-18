
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Vault, TrendingUp } from 'lucide-react';

interface CashVaultCardProps {
  currentAmount: number;
  isLoading?: boolean;
}

const CashVaultCard: React.FC<CashVaultCardProps> = ({ 
  currentAmount, 
  isLoading = false 
}) => {
  return (
    <Card className="glass-card border-white/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-300">
          Cash Vault Balance
        </CardTitle>
        <Vault className="h-4 w-4 text-green-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">
          {isLoading ? (
            <div className="h-8 w-24 bg-white/10 animate-pulse rounded" />
          ) : (
            `₹${currentAmount.toFixed(2)}`
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Available cash in vault
        </p>
      </CardContent>
    </Card>
  );
};

export default CashVaultCard;
