// This file exports the useStations hook
import { useSessionsData } from './useSessionsData';
import { useStationsData } from './useStationsData';
import { useSessionActions } from './session-actions';
import { Station, Session, Customer } from '@/types/pos.types';
import { useState, useEffect } from 'react';
import { useLocation } from '@/context/LocationContext';
import { mergeStationActiveSession } from '@/utils/sessionStorage.utils';

import { useStationMaintenance } from './useStationMaintenance';

export const useStations = (initialStations: Station[] = [], updateCustomer: (customer: Customer) => void) => {
  const { activeLocationId } = useLocation();
  const { 
    stations, 
    setStations,
    stationsLoading,
    stationsError,
    stationsCacheKey,
    refreshStations,
    deleteStation,
    updateStation,
    reorderStations,
    applyAccentToStationType,
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
    
    const sessionTimingMatches = (a: Session, b: Session) =>
      new Date(a.startTime).getTime() === new Date(b.startTime).getTime() &&
      a.isPaused === b.isPaused &&
      (a.pausedAt ? new Date(a.pausedAt).getTime() : null) ===
        (b.pausedAt ? new Date(b.pausedAt).getTime() : null) &&
      (a.totalPausedMs ?? 0) === (b.totalPausedMs ?? 0) &&
      (a.hourlyRate ?? 0) === (b.hourlyRate ?? 0) &&
      (a.plannedDurationMinutes ?? 0) === (b.plannedDurationMinutes ?? 0) &&
      (a.sessionGroupId ?? null) === (b.sessionGroupId ?? null);

    setStations(prev => prev.map(station => {
      const activeSession = activeSessionMap.get(station.id);
      
      if (activeSession) {
        const current = station.currentSession;
        const merged = mergeStationActiveSession(current, activeSession);
        if (
          current?.id === merged.id &&
          sessionTimingMatches(current, merged)
        ) {
          return station;
        }
        console.log(`Connecting session to station ${station.name}`);
        return { ...station, isOccupied: true, currentSession: merged };
      } else {
        // Only mark as unoccupied when sessions have loaded AND the station
        // row itself does not have a currentsession stored in the DB.
        // If station.currentSession came from the DB (via refreshStationsFromDB),
        // trust the DB value — the sessions list might just lag behind slightly.
        if (station.currentSession) {
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
    endSessionGroup,
    pauseSession,
    resumeSession,
    extendSession,
    moveSession,
    isLoading
  } = useSessionActions({
    stations,
    setStations,
    sessions,
    setSessions,
    updateCustomer
  });

  const { startMaintenance, endMaintenance } = useStationMaintenance({
    stations,
    setStations,
    stationsCacheKey,
  });

  return {
    stations,
    setStations,
    sessions,
    setSessions,
    startSession,
    endSession,
    endSessionGroup,
    pauseSession,
    resumeSession,
    extendSession,
    moveSession,
    startMaintenance,
    endMaintenance,
    deleteStation,
    updateStation,
    stationsLoading,
    stationsError,
    sessionsLoading,
    sessionsError,
    refreshStations,
    refreshSessions,
    reorderStations,
    applyAccentToStationType,
    isLoading
  };
};

export { useSessionsData } from './useSessionsData';
export { useStationsData } from './useStationsData';
export { useSessionActions } from './session-actions';
