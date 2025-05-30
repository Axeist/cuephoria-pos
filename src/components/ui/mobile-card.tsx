
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MobileCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}

const MobileCard: React.FC<MobileCardProps> = ({ 
  title, 
  children, 
  className, 
  compact = false 
}) => {
  return (
    <Card className={cn(
      'w-full mx-auto shadow-md',
      compact ? 'p-3' : 'p-4',
      className
    )}>
      {title && (
        <CardHeader className={compact ? 'pb-2 pt-0 px-0' : 'pb-3 pt-0 px-0'}>
          <CardTitle className={cn(
            'text-center gradient-text font-heading',
            compact ? 'text-lg' : 'text-xl'
          )}>
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        {children}
      </CardContent>
    </Card>
  );
};

export default MobileCard;
