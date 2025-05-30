
import React from 'react';
import { cn } from '@/lib/utils';

interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const MobileContainer: React.FC<MobileContainerProps> = ({ 
  children, 
  className, 
  padding = 'md' 
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6'
  };

  return (
    <div className={cn(
      'w-full max-w-full overflow-x-hidden',
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
};

export default MobileContainer;
