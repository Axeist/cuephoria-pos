
// This file exports the useStations hook
import { useSessionsData } from './useSessionsData';
import { useStationsData } from './useStationsData';
import { useSessionActions } from './session-actions';
import { Station, Session, Customer } from '@/types/pos.types';
import { useState, useEffect } from 'react';

export const useStations = (initialStations: Station[] = [], updateCustomer: (customer: Customer) => void) => {
  const { 
    stations, 
    setStations,
    stationsLoading,
    stationsError,
    refreshStations,
    deleteStation,
    updateStation
  } = useStationsData();
  
  const {
    sessions,
    setSessions,
    sessionsLoading,
    sessionsError,
    refreshSessions
  } = useSessionsData();

  // Track whether sessions have been fetched at least once so we don't
  // prematurely clear station state while the sessions query is still in flight.
  const [sessionsInitialized, setSessionsInitialized] = useState(false);
  useEffect(() => {
    if (!sessionsLoading) {
      setSessionsInitialized(true);
    }
  }, [sessionsLoading]);
  
  // Connect active sessions to stations.
  // IMPORTANT: Only run after sessions have actually been loaded from the DB.
  // Running with an empty sessions array before the fetch completes would
  // incorrectly clear isOccupied / currentSession that was already loaded
  // correctly from the stations table, breaking cross-device sync.
  useEffect(() => {
    if (stations.length === 0 || !sessionsInitialized) return;
      
    const activeSessions = sessions.filter(s => !s.endTime);
    
    console.log(`Connecting ${activeSessions.length} active sessions to ${stations.length} stations`);
    
    const activeSessionMap = new Map<string, Session>();
    activeSessions.forEach(session => {
      activeSessionMap.set(session.stationId, session);
    });
    
    setStations(prev => prev.map(station => {
      const activeSession = activeSessionMap.get(station.id);
      
      if (activeSession) {
        // Already correctly connected — skip re-render
        if (station.isOccupied && station.currentSession?.id === activeSession.id) {
          return station;
        }
        console.log(`Connecting session to station ${station.name}`);
        return { ...station, isOccupied: true, currentSession: activeSession };
      } else {
        // Only mark as unoccupied when sessions have loaded AND the station
        // row itself does not have a currentsession stored in the DB.
        // If station.currentSession came from the DB (via refreshStationsFromDB),
        // trust the DB value — the sessions list might just lag behind slightly.
        if (station.currentSession) {
          // DB says occupied — trust it, don't override
          return station;
        }
        if (station.isOccupied) {
          console.log(`Clearing stale occupied flag from station ${station.name}`);
          return { ...station, isOccupied: false, currentSession: null };
        }
        return station;
      }
    }));
  }, [sessions, sessionsInitialized]);
  
  const {
    startSession,
    endSession,
    isLoading
  } = useSessionActions({
    stations,
    setStations,
    sessions,
    setSessions,
    updateCustomer
  });

  return {
    stations,
    setStations,
    sessions,
    setSessions,
    startSession,
    endSession,
    deleteStation,
    updateStation,
    stationsLoading,
    stationsError,
    sessionsLoading,
    sessionsError,
    refreshStations,
    refreshSessions,
    isLoading
  };
};

export { useSessionsData } from './useSessionsData';
export { useStationsData } from './useStationsData';
export { useSessionActions } from './session-actions';
