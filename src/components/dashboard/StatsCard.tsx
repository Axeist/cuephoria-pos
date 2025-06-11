
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
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium text-gray-200">{title}</CardTitle>
        <div className={`h-10 w-10 rounded-full ${iconBgColor} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-heading">{value}</div>
        {subValue && (
          typeof subValue === 'string' 
            ? <p className="text-xs text-gray-400 mt-1">{subValue}</p>
            : <div className="text-xs text-gray-400 mt-1">{subValue}</div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;
