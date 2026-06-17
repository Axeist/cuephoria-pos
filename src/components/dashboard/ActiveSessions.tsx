
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { usePOS } from '@/context/POSContext';

const ActiveSessions = () => {
  const { stations, customers } = usePOS();
  
  // Get occupied stations with sessions
  const activeStations = stations.filter(station => station.isOccupied && station.currentSession);
  
  // Calculate session duration in minutes
  const getSessionDuration = (startTime: Date) => {
    // Ensure we're working with Date objects
    const start = new Date(startTime);
    const now = new Date();
    
    // Convert to milliseconds (numbers) before arithmetic
    const startMs = start.getTime();
    const nowMs = now.getTime();
    const durationMs = nowMs - startMs;
    
    // Convert milliseconds to minutes
    return Math.floor(durationMs / (1000 * 60));
  };
  
  return (
    <Card className="glass-card h-full w-full min-w-0 flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-white font-heading">Active Sessions</CardTitle>
            <CardDescription className="text-white/55">{activeStations.length} active session{activeStations.length !== 1 ? 's' : ''}</CardDescription>
          </div>
          <div className="h-10 w-10 rounded-full bg-[#0EA5E9]/20 flex items-center justify-center">
            <Clock className="h-5 w-5 text-[#0EA5E9]" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        {activeStations.length > 0 ? (
          activeStations.map(station => {
            const session = station.currentSession;
            if (!session) return null;
            
            const customer = customers.find(c => c.id === session.customerId);
            const duration = getSessionDuration(session.startTime);
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            const durationText = `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
            
            return (
              <div key={station.id} className="flex w-full min-w-0 items-center justify-between gap-2 p-3 sm:p-4 theme-inset">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-[#0EA5E9]/30 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{station.name}</p>
                    <p className="text-xs text-white/55 truncate">{customer?.name || 'Unknown Customer'}</p>
                  </div>
                </div>
                <div className="shrink-0 text-sm font-semibold text-white tabular-nums">
                  {durationText}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center p-6 text-white/55">
            <p>No active sessions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActiveSessions;
