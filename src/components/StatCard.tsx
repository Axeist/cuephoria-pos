
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  isCurrency?: boolean;
  change?: number;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  isCurrency = false,
  change,
  color = 'text-cuephoria-purple'
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isCurrency ? <CurrencyDisplay amount={value as number} /> : value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {typeof change !== 'undefined' && (
          <div className={`text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'} mt-1`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from last period
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
