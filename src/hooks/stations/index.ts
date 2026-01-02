
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
  
  // Connect active sessions to stations
  useEffect(() => {
    if (stations.length > 0 && sessions.length >= 0) {
      console.log("Connecting active sessions to stations");
      
      // Find active sessions (without endTime) if sessions exist
      const activeSessions = sessions.filter(s => !s.endTime);
      
      console.log(`Found ${activeSessions.length} active sessions to connect, out of ${sessions.length} total sessions`);
      
      // Create a mapping of station ID to session
      const activeSessionMap = new Map<string, Session>();
      activeSessions.forEach(session => {
        activeSessionMap.set(session.stationId, session);
      });
      
      // Update stations with their active sessions
      // IMPORTANT: Only update stations that don't already have the correct state
      // This prevents overriding manual state updates (like when ending a session)
      setStations(prev => prev.map(station => {
        const activeSession = activeSessionMap.get(station.id);
        
        // If station is already correctly set (occupied with session, or unoccupied without), skip update
        if (activeSession && station.isOccupied && station.currentSession?.id === activeSession.id) {
          // Station already correctly connected, no update needed
          return station;
        }
        
        if (!activeSession && !station.isOccupied && !station.currentSession) {
          // Station already correctly unoccupied, no update needed
          return station;
        }
        
        // Only update if state needs to change
        if (activeSession) {
          console.log(`Connecting session to station ${station.name}`);
          return {
            ...station,
            isOccupied: true,
            currentSession: activeSession
          };
        } else {
          // If there's no active session for this station, ensure it's marked as unoccupied
          // But only if it's not already correctly set
          if (station.isOccupied || station.currentSession) {
            console.log(`Disconnecting session from station ${station.name}`);
            return {
              ...station,
              isOccupied: false,
              currentSession: null
            };
          }
          return station;
        }
      }));
    }
  }, [sessions, stations.length]);
  
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
