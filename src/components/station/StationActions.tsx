import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Station, Customer } from '@/context/POSContext';
import { useToast } from '@/hooks/use-toast';
import { usePOS } from '@/context/POSContext';
import { Pause, Play, Square, ShoppingBag, Loader2, Plus, Users } from 'lucide-react';
import StartSessionDialog from '@/components/StartSessionDialog';
import { getRateForPlayerCount } from '@/utils/stationPricing';
import { getDurationPresets } from '@/utils/sessionDuration.utils';
import type { StationTheme, StationPhase } from '@/utils/stationTheme';
import { prefetchPOS } from '@/utils/viewTransition';

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
    plannedDurationMinutes?: number
  ) => Promise<void>;
  onEndSession: (stationId: string) => Promise<void>;
  onEndSessionGroup?: (stationId: string) => Promise<void>;
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
  const { selectCustomer } = usePOS();
  const [isLoading, setIsLoading] = useState(false);
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
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
    plannedDurationMinutes?: number
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
        plannedDurationMinutes
      );
      toast({
        title: 'Session Started',
        description: `${customerName} · ${station.name} · ${plannedDurationMinutes ?? 60} min`,
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to start session.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!station.isOccupied || !station.currentSession) return;
    try {
      setIsLoading(true);
      const customer = customers.find((c) => c.id === station.currentSession!.customerId);
      if (customer) selectCustomer(customer.id);
      await onEndSession(station.id);
      toast({ title: 'Session Ended', description: 'Items are ready in the cart.' });
      navigate('/pos');
    } catch {
      toast({ title: 'Error', description: 'Failed to end session.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSessionGroup = async () => {
    if (!station.isOccupied || !station.currentSession || !onEndSessionGroup || groupSize < 2) return;
    try {
      setIsLoading(true);
      const customer = customers.find((c) => c.id === station.currentSession!.customerId);
      if (customer) selectCustomer(customer.id);
      await onEndSessionGroup(station.id);
      navigate('/pos');
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

  const extendPresets = getDurationPresets(station.slotDuration).slice(0, 3);

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
      <div
        className={`animate-station-content-in ${
          footerLayout ? 'w-full space-y-2 border-t border-white/8 pt-3' : 'flex w-full flex-col gap-1.5'
        }`}
      >
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
                {mins}m
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
          End
        </Button>
        </div>
      </div>
    );
  }

  const defaultPricing = getRateForPlayerCount(station, 1);

  return (
    <>
      <Button
        size="default"
        className={`w-full h-11 text-sm font-bold text-white transition-all duration-300 active:scale-[0.98] hover:brightness-110 ${theme.startBtn}`}
        disabled={isLoading || customers.length === 0 || isTransitioning}
        onClick={() => setIsStartDialogOpen(true)}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
        ) : (
          <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
        )}
        {customers.length === 0 ? 'No Customers' : 'Start Session'}
      </Button>

      <StartSessionDialog
        open={isStartDialogOpen}
        onOpenChange={setIsStartDialogOpen}
        stationId={station.id}
        stationName={station.name}
        baseRate={defaultPricing.totalRate}
        hourlyRate={station.hourlyRate}
        maxPlayers={station.maxPlayers ?? 1}
        occupancyRates={station.occupancyRates ?? {}}
        stationCategory={station.category}
        slotDuration={station.slotDuration}
        stationType={station.type}
        pricingMode={station.pricingMode}
        onConfirm={handleStartSession}
      />
    </>
  );
};

export default StationActions;
