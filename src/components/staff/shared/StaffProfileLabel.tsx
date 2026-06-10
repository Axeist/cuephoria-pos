import React from 'react';
import { staffDisplayName, staffSecondaryUsername, type StaffNameFields } from '@/services/staff/staffMappers';

type Props = {
  staff: StaffNameFields & { designation?: string | null };
  nameClassName?: string;
  subClassName?: string;
  showUsername?: boolean;
  showDesignation?: boolean;
  designationClassName?: string;
};

const StaffProfileLabel: React.FC<Props> = ({
  staff,
  nameClassName = 'font-semibold text-foreground',
  subClassName = 'text-xs text-muted-foreground',
  showUsername = true,
  showDesignation = false,
  designationClassName = 'text-sm text-muted-foreground',
}) => {
  const name = staffDisplayName(staff);
  const username = showUsername ? staffSecondaryUsername(staff) : null;

  return (
    <div className="min-w-0">
      <p className={`truncate ${nameClassName}`}>{name}</p>
      {showDesignation && staff.designation?.trim() && (
        <p className={`truncate ${designationClassName}`}>{staff.designation}</p>
      )}
      {username && <p className={`truncate ${subClassName}`}>{username}</p>}
    </div>
  );
};

export default StaffProfileLabel;
