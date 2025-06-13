
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number | React.ReactNode;
  icon: LucideIcon;
  subValue?: string | React.ReactNode;
  iconColor: string;
  iconBgColor: string;
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  subValue,
  iconColor,
  iconBgColor,
  className = ""
}) => {
  return (
    <Card className={`bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-purple-500/20 hover:border-purple-500/30 transition-all duration-300 backdrop-blur-sm ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-700/30">
        <CardTitle className="text-lg font-semibold text-white">{title}</CardTitle>
        <div className={`h-8 w-8 rounded-full ${iconBgColor} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 hover:border-purple-500/30 transition-colors">
            <div className="text-3xl font-bold text-white mb-2">{value}</div>
            {subValue && (
              typeof subValue === 'string' 
                ? <p className="text-sm text-gray-300">{subValue}</p>
                : <div className="text-sm text-gray-300">{subValue}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
