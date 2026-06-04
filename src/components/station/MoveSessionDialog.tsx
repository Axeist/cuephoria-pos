import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResponsiveDialog, ResponsiveDialogContent } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { useLocation } from '@/context/LocationContext';
import { supabase } from '@/integrations/supabase/client';
import type { Station } from '@/types/pos.types';
import { stationTypeLabel } from '@/utils/stationTypeUtils';
import {
  dateToYmd,
  getSessionDurationState,
  wouldSessionMoveConflict,
  stationsMatchForMove,
  type BookingConflict,
} from '@/utils/sessionDuration.utils';
import { ArrowRightLeft, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MoveSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceStation: Station;
  stations: Station[];
  onMove: (fromStationId: string, toStationId: string) => Promise<void>;
}

type TargetStatus = {
  station: Station;
  available: boolean;
  reason?: string;
};

const MoveSessionDialog: React.FC<MoveSessionDialogProps> = ({
  open,
  onOpenChange,
  sourceStation,
  stations,
  onMove,
}) => {
  const { activeLocationId } = useLocation();
  const [selectedId, setSelectedId] = useState('');
  const [targets, setTargets] = useState<TargetStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);

  const session = sourceStation.currentSession;

  const eligibleStations = useMemo(
    () =>
      stations.filter(
        (s) =>
          s.id !== sourceStation.id &&
          s.category !== 'nit_event' &&
          stationsMatchForMove(s, sourceStation) &&
          !s.isOccupied &&
          !s.currentSession
      ),
    [stations, sourceStation]
  );

  const loadTargets = useCallback(async () => {
    if (!session || !activeLocationId || eligibleStations.length === 0) {
      setTargets(
        eligibleStations.map((station) => ({
          station,
          available: true,
        }))
      );
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const ids = eligibleStations.map((s) => s.id);
      const { data, error } = await supabase
        .from('bookings')
        .select('id, station_id, start_time, end_time')
        .eq('location_id', activeLocationId)
        .eq('booking_date', dateToYmd(now))
        .in('station_id', ids)
        .in('status', ['confirmed', 'in-progress']);

      if (error) throw error;

      const byStation = new Map<string, BookingConflict[]>();
      for (const row of data ?? []) {
        const sid = String(row.station_id);
        const list = byStation.get(sid) ?? [];
        list.push({
          id: row.id,
          startTime: String(row.start_time),
          endTime: String(row.end_time),
        });
        byStation.set(sid, list);
      }

      setTargets(
        eligibleStations.map((station) => {
          const bookings = byStation.get(station.id) ?? [];
          const conflict = wouldSessionMoveConflict(bookings, session, now);
          if (conflict.blocked && conflict.conflict) {
            const slot = `${conflict.conflict.startTime.slice(0, 5)}–${conflict.conflict.endTime.slice(0, 5)}`;
            return {
              station,
              available: false,
              reason: `Booked ${slot}`,
            };
          }
          return { station, available: true };
        })
      );
    } catch {
      setTargets(
        eligibleStations.map((station) => ({
          station,
          available: true,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [session, activeLocationId, eligibleStations]);

  useEffect(() => {
    if (!open) {
      setSelectedId('');
      return;
    }
    void loadTargets();
  }, [open, loadTargets]);

  const durationState = session ? getSessionDurationState(session) : null;
  const minsLeft = durationState
    ? Math.ceil(Math.max(0, durationState.remainingMs) / 60000)
    : null;

  const handleMove = async () => {
    if (!selectedId) return;
    const target = targets.find((t) => t.station.id === selectedId);
    if (!target?.available) return;

    setMoving(true);
    try {
      await onMove(sourceStation.id, selectedId);
      onOpenChange(false);
    } catch {
      /* toast in hook */
    } finally {
      setMoving(false);
    }
  };

  const typeLabel = stationTypeLabel(sourceStation.type);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} mobileVariant="sheet-bottom">
      <ResponsiveDialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ArrowRightLeft className="h-5 w-5 text-cuephoria-lightpurple" />
            Move session
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-left">
            Move the full active session from <span className="text-gray-200">{sourceStation.name}</span> to
            another free {typeLabel} station. Timer, extensions, and customer details stay on the same session.
            {minsLeft != null && (
              <span className="block mt-1 text-cuephoria-lightpurple/90">
                ~{minsLeft} min remaining — blocked if the next booking on the target station overlaps.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {eligibleStations.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No other free {typeLabel} stations available.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Checking bookings…
          </div>
        ) : (
          <ul className="space-y-2 py-2">
            {targets.map(({ station, available, reason }) => {
              const selected = selectedId === station.id;
              return (
                <li key={station.id}>
                  <button
                    type="button"
                    disabled={!available}
                    onClick={() => available && setSelectedId(station.id)}
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                      !available && 'opacity-50 cursor-not-allowed border-white/5 bg-black/20',
                      available &&
                        selected &&
                        'border-cuephoria-purple bg-cuephoria-purple/15 ring-1 ring-cuephoria-purple/40',
                      available &&
                        !selected &&
                        'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-white">{station.name}</span>
                      {available ? (
                        selected ? (
                          <CheckCircle2 className="h-5 w-5 text-cuephoria-lightpurple shrink-0" />
                        ) : (
                          <span className="text-xs text-emerald-400/90">Available</span>
                        )
                      ) : (
                        <span className="text-xs text-amber-400/90 flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {reason ?? 'Unavailable'}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={moving}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleMove()}
            disabled={!selectedId || moving || loading}
            className="bg-cuephoria-purple hover:bg-cuephoria-purple/90"
          >
            {moving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Moving…
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Move here
              </>
            )}
          </Button>
        </DialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default MoveSessionDialog;
