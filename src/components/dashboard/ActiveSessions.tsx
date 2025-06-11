
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
    <Card className="bg-[#1A1F2C] border-gray-700 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-white font-heading">Active Sessions</CardTitle>
            <CardDescription className="text-gray-400">{activeStations.length} active session{activeStations.length !== 1 ? 's' : ''}</CardDescription>
          </div>
          <div className="h-10 w-10 rounded-full bg-[#0EA5E9]/20 flex items-center justify-center">
            <Clock className="h-5 w-5 text-[#0EA5E9]" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
              <div key={station.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-800 border border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-[#0EA5E9]/30 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium">{station.name}</p>
                    <p className="text-xs text-gray-400">{customer?.name || 'Unknown Customer'}</p>
                  </div>
                </div>
                <div className="text-white font-semibold">
                  {durationText}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center p-6 text-gray-400">
            <p>No active sessions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActiveSessions;
