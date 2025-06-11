
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
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {isCurrency ? <CurrencyDisplay amount={value as number} /> : value}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        {typeof change !== 'undefined' && (
          <div className={`text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'} mt-2`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from last period
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
