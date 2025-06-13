
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
    <Card className={`bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl transition-all duration-300 backdrop-blur-sm ${getGlowColor(color)}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-700/30">
        <CardTitle className="text-lg font-semibold text-white">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 hover:border-purple-500/30 transition-colors">
            <div className="text-3xl font-bold text-white mb-2">
              {isCurrency ? <CurrencyDisplay amount={value as number} /> : value}
            </div>
            {description && (
              <p className="text-sm text-gray-300">{description}</p>
            )}
            {typeof change !== 'undefined' && (
              <div className={`text-sm ${change >= 0 ? 'text-green-400' : 'text-red-400'} mt-2`}>
                {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from last period
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
