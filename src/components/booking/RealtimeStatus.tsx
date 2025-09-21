import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Activity, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface RealtimeStatusProps {
  isConnected: boolean;
  lastUpdate?: Date;
  newBookingsCount: number;
  onRefresh?: () => void;
}

export function RealtimeStatus({ 
  isConnected, 
  lastUpdate, 
  newBookingsCount, 
  onRefresh 
}: RealtimeStatusProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Connection Status */}
      <Badge 
        variant={isConnected ? "default" : "destructive"}
        className="flex items-center gap-1 animate-pulse-soft"
      >
        {isConnected ? (
          <>
            <Wifi className="h-3 w-3" />
            Live
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            Offline
          </>
        )}
      </Badge>

      {/* New Bookings Counter */}
      {newBookingsCount > 0 && (
        <Badge variant="secondary" className="animate-pulse-glow">
          <Activity className="h-3 w-3 mr-1" />
          {newBookingsCount} New
        </Badge>
      )}

      {/* Last Update Time */}
      {lastUpdate && (
        <span className="text-xs text-muted-foreground">
          Updated: {format(lastUpdate, 'HH:mm:ss')}
        </span>
      )}

      {/* Manual Refresh Button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="p-1 hover:bg-muted rounded-md transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>
      )}
    </div>
  );
}