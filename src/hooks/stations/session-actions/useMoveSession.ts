import { Session } from '@/types/pos.types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SessionActionsProps } from './types';
import { useLocation } from '@/context/LocationContext';
import { serializeSessionForDb } from '@/utils/sessionStorage.utils';
import {
  CACHE_KEYS,
  cacheKeyWithLocation,
  invalidateCache,
} from '@/utils/dataCache';
import {
  dateToYmd,
  getSessionDurationState,
  wouldSessionMoveConflict,
  stationsMatchForMove,
  type BookingConflict,
} from '@/utils/sessionDuration.utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const useMoveSession = ({
  stations,
  setStations,
  sessions,
  setSessions,
}: SessionActionsProps) => {
  const { toast } = useToast();
  const { activeLocationId } = useLocation();

  const moveSession = async (
    fromStationId: string,
    toStationId: string
  ): Promise<void> => {
    if (fromStationId === toStationId) {
      throw new Error('Cannot move to the same station');
    }

    const fromStation = stations.find((s) => s.id === fromStationId);
    const toStation = stations.find((s) => s.id === toStationId);
    const session = fromStation?.currentSession;

    if (!fromStation || !session) {
      toast({
        title: 'Session Error',
        description: 'No active session found on this station',
        variant: 'destructive',
      });
      throw new Error('No active session');
    }

    if (!toStation) {
      toast({
        title: 'Station Error',
        description: 'Target station not found',
        variant: 'destructive',
      });
      throw new Error('Target station not found');
    }

    if (!stationsMatchForMove(fromStation, toStation)) {
      toast({
        title: 'Different station type',
        description: 'You can only move to another station of the same type.',
        variant: 'destructive',
      });
      throw new Error('Station type mismatch');
    }

    if (toStation.isOccupied || toStation.currentSession) {
      toast({
        title: 'Station in use',
        description: `${toStation.name} already has an active session.`,
        variant: 'destructive',
      });
      throw new Error('Target station occupied');
    }

    if (!activeLocationId) {
      toast({
        title: 'Branch required',
        description: 'Select a branch before moving a session.',
        variant: 'destructive',
      });
      throw new Error('No branch selected');
    }

    const now = new Date();
    const { data: bookingsRaw, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, start_time, end_time')
      .eq('station_id', toStationId)
      .eq('location_id', activeLocationId)
      .eq('booking_date', dateToYmd(now))
      .in('status', ['confirmed', 'in-progress']);

    if (bookingsError) {
      console.error('Error checking bookings for move:', bookingsError);
    }

    const bookings: BookingConflict[] = (bookingsRaw ?? []).map((b) => ({
      id: b.id,
      startTime: String(b.start_time),
      endTime: String(b.end_time),
    }));

    const conflict = wouldSessionMoveConflict(bookings, session, now);
    if (conflict.blocked) {
      const slot = conflict.conflict
        ? `${conflict.conflict.startTime.slice(0, 5)}–${conflict.conflict.endTime.slice(0, 5)}`
        : 'a booking';
      toast({
        title: 'Cannot move here',
        description: `Next slot (${slot}) on ${toStation.name} conflicts with this session's remaining time.`,
        variant: 'destructive',
      });
      throw new Error('Move blocked by booking');
    }

    const movedSession: Session = {
      ...session,
      stationId: toStationId,
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === movedSession.id ? movedSession : s))
    );
    setStations((prev) =>
      prev.map((s) => {
        if (s.id === fromStationId) {
          return { ...s, isOccupied: false, currentSession: null };
        }
        if (s.id === toStationId) {
          return { ...s, isOccupied: true, currentSession: movedSession };
        }
        return s;
      })
    );

    const { error: sessionError } = await supabase
      .from('sessions')
      .update({ station_id: toStationId } as Record<string, unknown>)
      .eq('id', session.id);

    if (sessionError) {
      console.error('Error updating session station:', sessionError);
      toast({
        title: 'Database error',
        description: 'Session move may not persist after refresh.',
        variant: 'destructive',
      });
    }

    if (UUID_RE.test(fromStationId) && UUID_RE.test(toStationId) && activeLocationId) {
      const [{ error: clearError }, { error: setError }] = await Promise.all([
        supabase
          .from('stations')
          .update({ is_occupied: false, currentsession: null })
          .eq('id', fromStationId)
          .eq('location_id', activeLocationId),
        supabase
          .from('stations')
          .update({
            is_occupied: true,
            currentsession: serializeSessionForDb(movedSession),
          })
          .eq('id', toStationId)
          .eq('location_id', activeLocationId),
      ]);

      if (clearError) console.error('Error clearing source station:', clearError);
      if (setError) console.error('Error updating target station:', setError);

      invalidateCache(cacheKeyWithLocation(CACHE_KEYS.STATIONS, activeLocationId));
      invalidateCache(cacheKeyWithLocation(CACHE_KEYS.SESSIONS, activeLocationId));
    }

    const durationState = getSessionDurationState(movedSession, now);
    const minsLeft = durationState
      ? Math.ceil(Math.max(0, durationState.remainingMs) / 60000)
      : null;

    toast({
      title: 'Session moved',
      description: `${fromStation.name} → ${toStation.name}${
        minsLeft != null ? ` · ~${minsLeft} min left` : ''
      }`,
    });
  };

  return { moveSession };
};
