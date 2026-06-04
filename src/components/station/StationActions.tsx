import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Station, Customer } from '@/context/POSContext';
import { useToast } from '@/hooks/use-toast';
import { usePOS } from '@/context/POSContext';
import { Pause, Play, Square, ShoppingBag } from 'lucide-react';
import StartSessionDialog from '@/components/StartSessionDialog';
import { getRateForPlayerCount } from '@/utils/stationPricing';
import { getStationTheme } from '@/utils/stationTheme';
import { prefetchPOS } from '@/utils/viewTransition';

interface StationActionsProps {
  station: Station;
  customers: Customer[];
  onStartSession: (
    stationId: string,
    customerId: string,
    hourlyRate?: number,
    couponCode?: string,
    playerCount?: number,
    perPersonRate?: number
  ) => Promise<void>;
  onEndSession: (stationId: string) => Promise<void>;
  onPauseSession: (stationId: string) => Promise<void>;
  onResumeSession: (stationId: string) => Promise<void>;
  onQuickShop?: () => void;
}

const StationActions: React.FC<StationActionsProps> = ({
  station,
  customers,
  onStartSession,
  onEndSession,
  onPauseSession,
  onResumeSession,
  onQuickShop,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectCustomer } = usePOS();
  const [isLoading, setIsLoading] = useState(false);
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const theme = getStationTheme(station);
  const isPaused = station.currentSession?.isPaused;

  useEffect(() => {
    if (station.isOccupied) prefetchPOS();
  }, [station.isOccupied]);

  const handleStartSession = async (
    customerId: string,
    customerName: string,
    finalRate: number,
    couponCode?: string,
    playerCount?: number,
    perPersonRate?: number
  ) => {
    try {
      setIsLoading(true);
      await onStartSession(station.id, customerId, finalRate, couponCode, playerCount, perPersonRate);
      setIsStartDialogOpen(false);
      toast({
        title: 'Session Started',
        description: `Session started for ${customerName} at ${station.name}`,
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

  const btnBase = 'h-8 flex-1 text-xs font-semibold px-2';

  if (station.isOccupied) {
    return (
      <div className="flex w-full gap-1.5">
        {isPaused ? (
          <Button
            size="sm"
            className={`${btnBase} bg-amber-600 hover:bg-amber-700 text-white`}
            onClick={() => void onResumeSession(station.id)}
            disabled={isLoading}
          >
            <Play className="h-3 w-3 mr-1 fill-current" />
            Resume
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            className={`${btnBase} bg-amber-950/50 text-amber-100 border border-amber-500/25 hover:bg-amber-950/70`}
            onClick={() => void onPauseSession(station.id)}
            disabled={isLoading}
          >
            <Pause className="h-3 w-3 mr-1" />
            Pause
          </Button>
        )}
        <Button
          size="sm"
          className={`${btnBase} bg-emerald-700/80 hover:bg-emerald-700 text-white`}
          onClick={() => onQuickShop?.()}
          disabled={isLoading}
        >
          <ShoppingBag className="h-3 w-3 mr-1" />
          Shop
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className={`${btnBase}`}
          onClick={handleEndSession}
          disabled={isLoading}
        >
          <Square className="h-3 w-3 mr-1 fill-current" />
          End
        </Button>
      </div>
    );
  }

  const defaultPricing = getRateForPlayerCount(station, 1);

  return (
    <>
      <Button
        size="sm"
        className={`w-full h-9 text-sm font-bold text-white bg-gradient-to-r from-cuephoria-purple to-violet-600 hover:opacity-90 ${theme.glow}`}
        disabled={isLoading || customers.length === 0}
        onClick={() => setIsStartDialogOpen(true)}
      >
        <Play className="h-3.5 w-3.5 mr-1.5" />
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
