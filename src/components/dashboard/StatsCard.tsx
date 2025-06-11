
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
    <Card className={`bg-[#1A1F2C] border-gray-700 shadow-xl hover:shadow-${iconColor.split('-')[1]}-900/10 transition-all ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-medium text-gray-200">{title}</CardTitle>
        <div className={`h-12 w-12 rounded-full ${iconBgColor} flex items-center justify-center`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-heading">{value}</div>
        {subValue && (
          typeof subValue === 'string' 
            ? <p className="text-sm text-gray-400 mt-2">{subValue}</p>
            : <div className="text-sm text-gray-400 mt-2">{subValue}</div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;
