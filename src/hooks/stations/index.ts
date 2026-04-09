// This file exports the useStations hook
import { useSessionsData } from './useSessionsData';
import { useStationsData } from './useStationsData';
import { useSessionActions } from './session-actions';
import { Station, Session, Customer } from '@/types/pos.types';
import { useState, useEffect } from 'react';
import { useLocation } from '@/context/LocationContext';

export const useStations = (initialStations: Station[] = [], updateCustomer: (customer: Customer) => void) => {
  const { activeLocationId } = useLocation();
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

  // sessionsInitialized guards the station↔session connection effect below.
  // It must be reset to false on every location change so the connection
  // logic doesn't fire with an empty sessions array for the new location.
  const [sessionsInitialized, setSessionsInitialized] = useState(false);

  useEffect(() => {
    setSessionsInitialized(false);
  }, [activeLocationId]);

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
