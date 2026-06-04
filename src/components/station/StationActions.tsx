import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Station, Customer } from '@/context/POSContext';
import { useToast } from '@/hooks/use-toast';
import { usePOS } from '@/context/POSContext';
import { Pause, Play, Square, ShoppingBag, Loader2, Plus } from 'lucide-react';
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
  onPauseSession: (stationId: string) => Promise<void>;
  onResumeSession: (stationId: string) => Promise<void>;
  onExtendSession?: (stationId: string, extraMinutes: number) => Promise<void>;
  onQuickShop?: () => void;
}

const StationActions: React.FC<StationActionsProps> = ({
  station,
  customers,
  theme,
  phase = 'idle',
  onStartSession,
  onEndSession,
  onPauseSession,
  onResumeSession,
  onExtendSession,
  onQuickShop,
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

  const btnBase =
    'h-8 flex-1 text-xs font-semibold px-2 transition-all duration-200 active:scale-95';

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
      <div className="flex w-full flex-col gap-1.5 animate-station-content-in">
        {station.currentSession?.plannedDurationMinutes && onExtendSession && (
          <div className="flex gap-1">
            {extendPresets.map((mins) => (
              <Button
                key={mins}
                size="sm"
                variant="outline"
                className="h-7 flex-1 border-cuephoria-purple/40 bg-cuephoria-purple/10 px-1 text-[10px] font-semibold text-cuephoria-lightpurple hover:bg-cuephoria-purple/20"
                onClick={() => void handleExtend(mins)}
                disabled={isLoading || isTransitioning}
              >
                <Plus className="mr-0.5 h-3 w-3" />
                {mins}m
              </Button>
            ))}
          </div>
        )}
        <div className="flex w-full flex-row flex-wrap gap-1 sm:flex-col sm:gap-1.5">
        {isPaused ? (
          <Button
            size="sm"
            className={`${btnBase} bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)]`}
            onClick={() => void onResumeSession(station.id)}
            disabled={isLoading || isTransitioning}
          >
            <Play className="h-3 w-3 mr-1 fill-current" />
            Resume
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            className={`${btnBase} bg-amber-950/60 text-amber-100 border border-amber-500/30 hover:bg-amber-950/80`}
            onClick={() => void onPauseSession(station.id)}
            disabled={isLoading || isTransitioning}
          >
            <Pause className="h-3 w-3 mr-1" />
            Pause
          </Button>
        )}
        <Button
          size="sm"
          className={`${btnBase} bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white`}
          onClick={() => onQuickShop?.()}
          disabled={isLoading || isTransitioning}
        >
          <ShoppingBag className="h-3 w-3 mr-1" />
          Shop
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className={`${btnBase} bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-[0_0_10px_rgba(239,68,68,0.25)]`}
          onClick={handleEndSession}
          disabled={isLoading || isTransitioning}
        >
          {isLoading && phase === 'ending' ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Square className="h-3 w-3 mr-1 fill-current" />
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
        size="sm"
        className={`w-full h-9 text-sm font-bold text-white transition-all duration-300 active:scale-[0.98] hover:brightness-110 ${theme.startBtn}`}
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
