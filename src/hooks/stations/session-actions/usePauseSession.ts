import { Session } from '@/types/pos.types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SessionActionsProps } from './types';
import { useLocation } from '@/context/LocationContext';
import { serializeSessionForDb } from '@/utils/sessionStorage.utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function syncStationCurrentSession(
  stationId: string,
  session: Session,
  activeLocationId: string | null
) {
  if (!UUID_RE.test(stationId) || !activeLocationId) return;

  const { error } = await supabase
    .from('stations')
    .update({ currentsession: serializeSessionForDb(session) })
    .eq('id', stationId)
    .eq('location_id', activeLocationId);

  if (error) {
    console.error('Error syncing station currentsession:', error);
  }
}

export const usePauseSession = ({
  stations,
  setStations,
  sessions,
  setSessions,
}: SessionActionsProps) => {
  const { toast } = useToast();
  const { activeLocationId } = useLocation();

  const applySessionUpdate = (stationId: string, updatedSession: Session) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    );
    setStations((prev) =>
      prev.map((s) =>
        s.id === stationId
          ? { ...s, isOccupied: true, currentSession: updatedSession }
          : s
      )
    );
  };

  const pauseSession = async (stationId: string): Promise<void> => {
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

    if (session.isPaused) {
      return;
    }

    const now = new Date();
    const updatedSession: Session = {
      ...session,
      isPaused: true,
      pausedAt: now,
      totalPausedMs: session.totalPausedMs ?? 0,
    };

    applySessionUpdate(stationId, updatedSession);

    const { error } = await supabase
      .from('sessions')
      .update({
        is_paused: true,
        paused_at: now.toISOString(),
        status: 'paused',
      })
      .eq('id', session.id);

    if (error) {
      console.error('Error pausing session:', error);
      toast({
        title: 'Database Error',
        description: 'Failed to pause session. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }

    await syncStationCurrentSession(stationId, updatedSession, activeLocationId);

    toast({
      title: 'Session Paused',
      description: `${station.name} timer paused`,
    });
  };

  const resumeSession = async (stationId: string): Promise<void> => {
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

    if (!session.isPaused || !session.pausedAt) {
      return;
    }

    const now = new Date();
    const pauseDuration = now.getTime() - new Date(session.pausedAt).getTime();
    const totalPausedMs = (session.totalPausedMs ?? 0) + pauseDuration;

    const updatedSession: Session = {
      ...session,
      isPaused: false,
      pausedAt: undefined,
      totalPausedMs,
    };

    applySessionUpdate(stationId, updatedSession);

    const { error } = await supabase
      .from('sessions')
      .update({
        is_paused: false,
        paused_at: null,
        total_paused_time: totalPausedMs,
        status: 'active',
      })
      .eq('id', session.id);

    if (error) {
      console.error('Error resuming session:', error);
      toast({
        title: 'Database Error',
        description: 'Failed to resume session. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }

    await syncStationCurrentSession(stationId, updatedSession, activeLocationId);

    toast({
      title: 'Session Resumed',
      description: `${station.name} timer resumed`,
    });
  };

  return { pauseSession, resumeSession };
};
