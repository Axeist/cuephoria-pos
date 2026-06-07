import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Station, Customer } from '@/context/POSContext';
import { useToast } from '@/hooks/use-toast';
import { usePOS } from '@/context/POSContext';
import { Pause, Play, Square, ShoppingBag, Loader2, Plus, Users, ArrowRightLeft, Wrench } from 'lucide-react';
import StartSessionDialog from '@/components/StartSessionDialog';
import StationMaintenanceDialog from '@/components/station/StationMaintenanceDialog';
import MoveSessionDialog from '@/components/station/MoveSessionDialog';
import type { SessionEndCheckoutMode } from '@/types/pos.types';
import type { PrepaidBookingLink } from '@/types/prepaidBooking.types';
import { getRateForPlayerCount, isTimeBasedPricing } from '@/utils/stationPricing';
import { getDurationPresets, stationsMatchForMove } from '@/utils/sessionDuration.utils';
import {
  getDefaultDurationTiers,
  getTierPackagePrice,
} from '@/utils/timeBasedPricing.utils';
import type { StationTheme, StationPhase } from '@/utils/stationTheme';
import { prefetchPOS, navigateToPOS, sleep, SESSION_TRANSITION } from '@/utils/viewTransition';
import { useAuth } from '@/context/AuthContext';
import { isStationInMaintenance } from '@/utils/stationMaintenance.utils';

const EMPTY_OCCUPANCY_RATES: Record<string, number> = {};
const EMPTY_DURATION_TIERS: { minutes: number; price: number }[] = [];

interface StationActionsProps {
  station: Station;
  customers: Customer[];
  theme: StationTheme;
  phase?: StationPhase;
  onStartSession: (
    stationId: string,
    customerId: string,
    hourlyRate?: number,
    couponCode?: string,
    playerCount?: number,
    perPersonRate?: number,
    plannedDurationMinutes?: number,
    prepaidBooking?: PrepaidBookingLink,
    customStartTime?: Date
  ) => Promise<void>;
  onEndSession: (stationId: string) => Promise<SessionEndCheckoutMode | void>;
  onEndSessionGroup?: (stationId: string) => Promise<SessionEndCheckoutMode | void>;
  groupSize?: number;
  onPauseSession: (stationId: string) => Promise<void>;
  onResumeSession: (stationId: string) => Promise<void>;
  onExtendSession?: (stationId: string, extraMinutes: number) => Promise<void>;
  onQuickShop?: () => void;
  /** Full-width footer layout with larger tap targets */
  footerLayout?: boolean;
}

const StationActions: React.FC<StationActionsProps> = ({
  station,
  customers,
  theme,
  phase = 'idle',
  onStartSession,
  onEndSession,
  onEndSessionGroup,
  groupSize = 0,
  onPauseSession,
  onResumeSession,
  onExtendSession,
  onQuickShop,
  footerLayout = false,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectCustomer, stations, moveSession, startMaintenance, endMaintenance } = usePOS();
  const [isLoading, setIsLoading] = useState(false);
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const inMaintenance = isStationInMaintenance(station);
  const defaultStartedBy = user?.displayName || user?.username || '';

  const canMoveSession = useMemo(
    () =>
      stations.some(
        (s) =>
          s.id !== station.id &&
          s.category !== 'nit_event' &&
          stationsMatchForMove(s, station) &&
          !s.isOccupied &&
          !s.currentSession &&
          !s.maintenanceMode
      ),
    [stations, station]
  );
  const isPaused = station.currentSession?.isPaused;
  const isTransitioning = phase === 'starting' || phase === 'ending';

  useEffect(() => {
    if (station.isOccupied) prefetchPOS();
  }, [station.isOccupied]);

  const handleStartSession = async (
    customerId: string,
    customerName: string,
    finalRate: number,
    couponCode?: string,
    playerCount?: number,
    perPersonRate?: number,
    plannedDurationMinutes?: number,
    prepaidBooking?: PrepaidBookingLink,
    customStartTime?: Date
  ) => {
    try {
      setIsLoading(true);
      setIsStartDialogOpen(false);
      await onStartSession(
        station.id,
        customerId,
        finalRate,
        couponCode,
        playerCount,
        perPersonRate,
        plannedDurationMinutes,
        prepaidBooking,
        customStartTime
      );
      window.setTimeout(() => {
        toast({
          title: 'Session Started',
          description: prepaidBooking
            ? `${customerName} · ${station.name} · pre-paid ${prepaidBooking.durationMinutes} min`
            : customStartTime
              ? `${customerName} · ${station.name} · started ${customStartTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
              : `${customerName} · ${station.name} · ${plannedDurationMinutes ?? 60} min`,
        });
      }, 120);
    } catch {
      toast({ title: 'Error', description: 'Failed to start session.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!station.isOccupied || !station.currentSession) return;
    const customerId = station.currentSession.customerId;
    try {
      setIsLoading(true);
      const mode = await onEndSession(station.id);
      if (mode === 'pos') {
        if (customerId) selectCustomer(customerId);
        await sleep(SESSION_TRANSITION.posHandoffMs);
        navigateToPOS(navigate, { stationName: station.name });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to end session.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSessionGroup = async () => {
    if (!station.isOccupied || !station.currentSession || !onEndSessionGroup || groupSize < 2) return;
    const customerId = station.currentSession.customerId;
    try {
      setIsLoading(true);
      const mode = await onEndSessionGroup(station.id);
      if (mode === 'pos') {
        if (customerId) selectCustomer(customerId);
        await sleep(SESSION_TRANSITION.posHandoffMs);
        navigateToPOS(navigate, { stationName: station.name });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to end group sessions.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const btnBase = footerLayout
    ? 'h-11 text-sm font-semibold px-3 transition-all duration-200 active:scale-95'
    : 'h-8 flex-1 text-xs font-semibold px-2 transition-all duration-200 active:scale-95';

  const extendBtnClass = footerLayout
    ? 'h-10 flex-1 border-cuephoria-purple/40 bg-cuephoria-purple/10 text-sm font-semibold text-cuephoria-lightpurple hover:bg-cuephoria-purple/20'
    : 'h-7 flex-1 border-cuephoria-purple/40 bg-cuephoria-purple/10 px-1 text-[10px] font-semibold text-cuephoria-lightpurple hover:bg-cuephoria-purple/20';

  const tiers = station.durationTiers?.length ? station.durationTiers : getDefaultDurationTiers();
  const extendPresets = isTimeBasedPricing(station)
    ? tiers.slice(0, 3).map((t) => t.minutes)
    : getDurationPresets(station.slotDuration).slice(0, 3);
  const plannedMinutes = station.currentSession?.plannedDurationMinutes ?? 0;

  const handleExtend = async (extraMinutes: number) => {
    if (!onExtendSession) return;
    try {
      setIsLoading(true);
      await onExtendSession(station.id, extraMinutes);
    } catch {
      /* toast handled in hook */
    } finally {
      setIsLoading(false);
    }
  };

  if (station.isOccupied || phase === 'live' || phase === 'starting') {
    if (phase === 'starting') return null;

    return (
      <>
      <div
        className={`animate-station-content-in ${
          footerLayout ? 'w-full space-y-2 border-t border-white/8 pt-3' : 'flex w-full flex-col gap-1.5'
        }`}
      >
        {canMoveSession && (
          <Button
            type="button"
            size={footerLayout ? 'default' : 'sm'}
            variant="outline"
            className={
              footerLayout
                ? 'h-10 w-full border-white/15 bg-white/5 text-sm font-semibold text-gray-200 hover:bg-white/10'
                : 'h-7 w-full border-white/15 bg-white/5 text-[10px] font-semibold text-gray-200 hover:bg-white/10'
            }
            onClick={() => setIsMoveDialogOpen(true)}
            disabled={isLoading || isTransitioning}
          >
            <ArrowRightLeft className={`mr-1.5 ${footerLayout ? 'h-4 w-4' : 'h-3 w-3'}`} />
            Move station
          </Button>
        )}
        {station.currentSession?.plannedDurationMinutes && onExtendSession && (
          <div className={`flex gap-2 ${footerLayout ? '' : 'gap-1'}`}>
            {extendPresets.map((mins) => (
              <Button
                key={mins}
                size={footerLayout ? 'default' : 'sm'}
                variant="outline"
                className={extendBtnClass}
                onClick={() => void handleExtend(mins)}
                disabled={isLoading || isTransitioning}
              >
                <Plus className={`mr-1 ${footerLayout ? 'h-4 w-4' : 'h-3 w-3'}`} />
                {isTimeBasedPricing(station) ? (
                  <>
                    +{mins}m · ₹{getTierPackagePrice(plannedMinutes + mins, tiers)}
                  </>
                ) : (
                  <>{mins}m</>
                )}
              </Button>
            ))}
          </div>
        )}
        {groupSize >= 2 && onEndSessionGroup && (
          <Button
            size={footerLayout ? 'default' : 'sm'}
            variant="destructive"
            className={`${footerLayout ? 'h-11 w-full' : btnBase} bg-gradient-to-r from-rose-700 to-red-700 hover:from-rose-600 hover:to-red-600 shadow-[0_0_10px_rgba(225,29,72,0.2)]`}
            onClick={handleEndSessionGroup}
            disabled={isLoading || isTransitioning}
          >
            {isLoading ? (
              <Loader2 className={`mr-1.5 animate-spin ${footerLayout ? 'h-4 w-4' : 'h-3 w-3'}`} />
            ) : (
              <Users className={`mr-1.5 ${footerLayout ? 'h-4 w-4' : 'h-3 w-3'}`} />
            )}
            End group ({groupSize})
          </Button>
        )}
        <div
          className={
            footerLayout
              ? 'grid grid-cols-3 gap-2'
              : 'flex w-full flex-row flex-wrap gap-1 sm:flex-col sm:gap-1.5'
          }
        >
        {isPaused ? (
          <Button
            size={footerLayout ? 'default' : 'sm'}
            className={`${btnBase} bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)]`}
            onClick={() => void onResumeSession(station.id)}
            disabled={isLoading || isTransitioning}
          >
            <Play className={`mr-1.5 fill-current ${footerLayout ? 'h-4 w-4' : 'h-3 w-3'}`} />
            Resume
          </Button>
        ) : (
          <Button
            size={footerLayout ? 'default' : 'sm'}
            variant="secondary"
            className={`${btnBase} bg-amber-950/60 text-amber-100 border border-amber-500/30 hover:bg-amber-950/80`}
            onClick={() => void onPauseSession(station.id)}
            disabled={isLoading || isTransitioning}
          >
            <Pause className={`mr-1.5 ${footerLayout ? 'h-4 w-4' : 'h-3 w-3'}`} />
            Pause
          </Button>
        )}
        <Button
          size={footerLayout ? 'default' : 'sm'}
          className={`${btnBase} bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white`}
          onClick={() => onQuickShop?.()}
          disabled={isLoading || isTransitioning}
        >
          <ShoppingBag className={`mr-1.5 ${footerLayout ? 'h-4 w-4' : 'h-3 w-3'}`} />
          Shop
        </Button>
        <Button
          size={footerLayout ? 'default' : 'sm'}
          variant="destructive"
          className={`${btnBase} bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-[0_0_10px_rgba(239,68,68,0.25)]`}
          onClick={handleEndSession}
          disabled={isLoading || isTransitioning}
        >
          {isLoading && phase === 'ending' ? (
            <Loader2 className={`mr-1.5 animate-spin ${footerLayout ? 'h-4 w-4' : 'h-3 w-3'}`} />
          ) : (
            <Square className={`mr-1.5 fill-current ${footerLayout ? 'h-4 w-4' : 'h-3 w-3'}`} />
          )}
          {groupSize >= 2 ? 'End station' : 'End'}
        </Button>
        </div>
      </div>
      <MoveSessionDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        sourceStation={station}
        stations={stations}
        onMove={moveSession}
      />
      </>
    );
  }

  const defaultPricing = getRateForPlayerCount(station, 1);

  const idleBtnRow = footerLayout
    ? 'grid grid-cols-2 gap-2 w-full border-t border-white/8 pt-3'
    : 'grid grid-cols-2 gap-2 w-full';

  if (inMaintenance) {
    return (
      <div className={footerLayout ? 'w-full border-t border-amber-500/20 pt-3' : 'w-full'}>
        <Button
          type="button"
          size={footerLayout ? 'default' : 'sm'}
          className={`w-full ${footerLayout ? 'h-11' : 'h-10'} bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-sm font-semibold text-white`}
          disabled={isLoading}
          onClick={() => void endMaintenance(station.id)}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
          )}
          End maintenance
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className={idleBtnRow}>
        <Button
          type="button"
          size={footerLayout ? 'default' : 'sm'}
          variant="outline"
          className={
            footerLayout
              ? 'h-11 border-amber-500/35 bg-amber-500/10 text-sm font-semibold text-amber-100 hover:bg-amber-500/20'
              : 'h-10 border-amber-500/35 bg-amber-500/10 text-xs font-semibold text-amber-100'
          }
          disabled={isLoading || isTransitioning}
          onClick={() => setIsMaintenanceDialogOpen(true)}
        >
          <Wrench className={`mr-1.5 ${footerLayout ? 'h-4 w-4' : 'h-3.5 w-3.5'}`} />
          Maintenance
        </Button>
        <Button
          type="button"
          size={footerLayout ? 'default' : 'sm'}
          className={`h-11 text-sm font-bold text-white transition-all duration-300 active:scale-[0.98] hover:brightness-110 ${
            theme.accentStyle ? '' : theme.startBtn
          }`}
          style={theme.accentStyle?.startBtnStyle}
          disabled={isLoading || isTransitioning || inMaintenance}
          onClick={() => setIsStartDialogOpen(true)}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
          )}
          Start session
        </Button>
      </div>

      <StationMaintenanceDialog
        open={isMaintenanceDialogOpen}
        onOpenChange={setIsMaintenanceDialogOpen}
        stationName={station.name}
        defaultStartedBy={defaultStartedBy}
        onConfirm={(durationMinutes, startedByName) =>
          startMaintenance(station.id, durationMinutes, startedByName)
        }
      />

      <StartSessionDialog
        open={isStartDialogOpen}
        onOpenChange={setIsStartDialogOpen}
        stationId={station.id}
        stationName={station.name}
        baseRate={defaultPricing.totalRate}
        hourlyRate={station.hourlyRate}
        maxPlayers={station.maxPlayers ?? 1}
        occupancyRates={station.occupancyRates ?? EMPTY_OCCUPANCY_RATES}
        stationCategory={station.category}
        slotDuration={station.slotDuration}
        stationType={station.type}
        pricingMode={station.pricingMode}
        durationTiers={station.durationTiers ?? EMPTY_DURATION_TIERS}
        onConfirm={handleStartSession}
      />
    </>
  );
};

export default StationActions;
