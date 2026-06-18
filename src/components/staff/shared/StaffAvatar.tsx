import React from 'react';
import { cn } from '@/lib/utils';
import { staffInitials } from '@/services/staff/staffMappers';
import type { StaffProfile } from '@/types/staff.types';

type Props = {
  staff: Pick<StaffProfile, 'username' | 'full_name' | 'email'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeMap = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
};

const StaffAvatar: React.FC<Props> = ({ staff, size = 'md', className }) => (
  <div
    className={cn(
      'rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-primary shrink-0',
      sizeMap[size],
      className,
    )}
  >
    {staffInitials(staff)}
  </div>
);

export default StaffAvatar;
