import React from 'react';
import { MobilePageShell } from '@/components/mobile/MobilePageShell';
import { Button } from '@/components/ui/button';
import StaffAvatar from '@/components/staff/shared/StaffAvatar';

type Props = {
  displayName: string;
  username: string;
  designation?: string | null;
  onLock: () => void;
  children: React.ReactNode;
};

const PortalShell: React.FC<Props> = ({ displayName, username, designation, onLock, children }) => (
  <MobilePageShell className="space-y-6 pt-2 sm:pt-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-4">
        <StaffAvatar staff={{ username, full_name: displayName, email: null }} size="lg" />
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text font-heading">
            Welcome, {displayName}!
          </h2>
          {designation && (
            <p className="text-sm text-muted-foreground mt-1">{designation}</p>
          )}
          {username && username !== displayName && (
            <p className="text-xs text-muted-foreground/80">{username}</p>
          )}
        </div>
      </div>
      <Button
        onClick={onLock}
        variant="outline"
        className="border-border/50 hover:bg-white/5 self-start sm:self-auto"
      >
        Lock Portal
      </Button>
    </div>
    {children}
  </MobilePageShell>
);

export default PortalShell;
