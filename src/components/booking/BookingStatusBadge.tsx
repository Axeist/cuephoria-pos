import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, Play, Calendar } from 'lucide-react';

interface BookingStatusBadgeProps {
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  size?: 'sm' | 'md' | 'lg';
}

export const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({ 
  status, 
  size = 'md' 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'confirmed':
        return {
          variant: 'default' as const,
          icon: Calendar,
          label: 'Confirmed',
          className: 'bg-blue-500 hover:bg-blue-600'
        };
      case 'in-progress':
        return {
          variant: 'default' as const,
          icon: Play,
          label: 'In Progress',
          className: 'bg-green-500 hover:bg-green-600'
        };
      case 'completed':
        return {
          variant: 'secondary' as const,
          icon: CheckCircle,
          label: 'Completed',
          className: 'bg-gray-500 hover:bg-gray-600'
        };
      case 'cancelled':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          label: 'Cancelled',
          className: ''
        };
      case 'no-show':
        return {
          variant: 'outline' as const,
          icon: Clock,
          label: 'No Show',
          className: 'text-orange-600 border-orange-600'
        };
      default:
        return {
          variant: 'secondary' as const,
          icon: Clock,
          label: status,
          className: ''
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Badge 
      variant={config.variant}
      className={`${sizeClasses[size]} ${config.className} flex items-center gap-1`}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </Badge>
  );
};