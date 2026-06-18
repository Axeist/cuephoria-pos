
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
  // Extract color name for glow effect
  const getGlowColor = (colorClass: string) => {
    if (colorClass.includes('purple')) return 'hover:shadow-purple-500/20 hover:border-purple-500/30';
    if (colorClass.includes('blue')) return 'hover:shadow-blue-500/20 hover:border-blue-500/30';
    if (colorClass.includes('green')) return 'hover:shadow-green-500/20 hover:border-green-500/30';
    if (colorClass.includes('red')) return 'hover:shadow-red-500/20 hover:border-red-500/30';
    if (colorClass.includes('yellow')) return 'hover:shadow-yellow-500/20 hover:border-yellow-500/30';
    if (colorClass.includes('orange')) return 'hover:shadow-orange-500/20 hover:border-orange-500/30';
    return 'hover:shadow-purple-500/20 hover:border-purple-500/30'; // default
  };

  return (
    <Card className={`shadow-lg transition-all duration-300 ${getGlowColor(color)}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
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
