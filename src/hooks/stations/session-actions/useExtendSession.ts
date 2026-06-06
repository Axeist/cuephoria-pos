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
  wouldExtensionConflict,
  type BookingConflict,
} from '@/utils/sessionDuration.utils';
import { getPresetSessionExtensionPlan } from '@/utils/sessionBilling.utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const useExtendSession = ({
  stations,
  setStations,
  sessions,
  setSessions,
}: SessionActionsProps) => {
  const { toast } = useToast();
  const { activeLocationId } = useLocation();

  const extendSession = async (stationId: string, extraMinutes: number): Promise<void> => {
    if (extraMinutes <= 0) return;

    const station = stations.find((s) => s.id === stationId);
    const session = station?.currentSession;

    if (!station || !session) {
      toast({
        title: 'Session Error',
        description: 'No active session found for this station',
        variant: 'destructive',
      });
      throw new Error('No active session found');
    }

    if (!session.plannedDurationMinutes) {
      toast({
        title: 'No duration set',
        description: 'This session has no planned duration to extend.',
        variant: 'destructive',
      });
      throw new Error('No planned duration');
    }

    if (!activeLocationId) {
      toast({
        title: 'Branch required',
        description: 'Select a branch before extending a session.',
        variant: 'destructive',
      });
      throw new Error('No branch selected');
    }

    const now = new Date();
    const { data: bookingsRaw, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, start_time, end_time')
      .eq('station_id', stationId)
      .eq('location_id', activeLocationId)
      .eq('booking_date', dateToYmd(now))
      .in('status', ['confirmed', 'in-progress']);

    if (bookingsError) {
      console.error('Error checking bookings for extend:', bookingsError);
    }

    const bookings: BookingConflict[] = (bookingsRaw ?? []).map((b) => ({
      id: b.id,
      startTime: String(b.start_time),
      endTime: String(b.end_time),
    }));

    const extensionPlan = getPresetSessionExtensionPlan(session, extraMinutes, now);
    if (!extensionPlan) {
      throw new Error('Invalid extension');
    }

    const { newPlannedMinutes, effectiveAddedMinutes, overtimeMinutes } = extensionPlan;

    const conflict = wouldExtensionConflict(bookings, session, extraMinutes, now);
    if (conflict.blocked) {
      const slot = conflict.conflict
        ? `${conflict.conflict.startTime.slice(0, 5)}–${conflict.conflict.endTime.slice(0, 5)}`
        : 'another booking';
      toast({
        title: 'Cannot extend',
        description: `Next slot (${slot}) is already booked for this station.`,
        variant: 'destructive',
      });
      throw new Error('Extension blocked by booking');
    }

    const newPlanned = newPlannedMinutes;
    const updatedSession: Session = {
      ...session,
      plannedDurationMinutes: newPlanned,
    };

    setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
    setStations((prev) =>
      prev.map((s) =>
        s.id === stationId ? { ...s, isOccupied: true, currentSession: updatedSession } : s
      )
    );

    const { error: sessionError } = await supabase
      .from('sessions')
      .update({ planned_duration_minutes: newPlanned } as Record<string, unknown>)
      .eq('id', session.id);

    if (sessionError) {
      console.error('Error updating session planned duration:', sessionError);
    }

    if (UUID_RE.test(stationId) && activeLocationId) {
      const { error: stationError } = await supabase
        .from('stations')
        .update({ currentsession: serializeSessionForDb(updatedSession) })
        .eq('id', stationId)
        .eq('location_id', activeLocationId);

      if (stationError) {
        console.error('Error syncing station after extend:', stationError);
      }

      invalidateCache(cacheKeyWithLocation(CACHE_KEYS.STATIONS, activeLocationId));
      invalidateCache(cacheKeyWithLocation(CACHE_KEYS.SESSIONS, activeLocationId));
    }

    const state = getSessionDurationState(updatedSession, now);
    const overtimeNote =
      overtimeMinutes > 0 && effectiveAddedMinutes < extraMinutes
        ? ` (${effectiveAddedMinutes} min added — ${overtimeMinutes} min past plan counted toward +${extraMinutes})`
        : '';
    toast({
      title: 'Session extended',
      description: `+${extraMinutes} min package · ${newPlanned} min total${
        state ? ` · ${Math.ceil(state.remainingMs / 60000)} min left` : ''
      }${overtimeNote}`,
    });
  };

  return { extendSession };
};
