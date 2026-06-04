import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Station, Customer } from '@/context/POSContext';
import { useToast } from '@/hooks/use-toast';
import { usePOS } from '@/context/POSContext';
import { Pause, Play, Square, ShoppingBag } from 'lucide-react';
import StartSessionDialog from '@/components/StartSessionDialog';
import { getRateForPlayerCount } from '@/utils/stationPricing';
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
  
  const isPoolTable = station.type === '8ball';
  const isVR = station.type === 'vr';
  const isPaused = station.currentSession?.isPaused;

  useEffect(() => {
    if (station.isOccupied) {
      prefetchPOS();
    }
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
      await onStartSession(
        station.id,
        customerId,
        finalRate,
        couponCode,
        playerCount,
        perPersonRate
      );
      
      setIsStartDialogOpen(false);
      
      toast({
        title: "Session Started",
        description: `Session started for ${customerName} at ${station.name}${couponCode ? ` with ${couponCode}` : ''}`,
      });
    } catch (error) {
      console.error("Error starting session:", error);
      toast({
        title: "Error",
        description: "Failed to start session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickShop = () => {
    if (!station.isOccupied || !station.currentSession) return;
    onQuickShop?.();
  };

  const handleEndSession = async () => {
    if (station.isOccupied && station.currentSession) {
      try {
        setIsLoading(true);
        
        const customerId = station.currentSession.customerId;
        console.log('Ending session for station:', station.id, 'customer:', customerId);
        
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          console.log('Auto-selecting customer:', customer.name);
          selectCustomer(customer.id);
        }
        
        await onEndSession(station.id);
        
        toast({
          title: "Session Ended",
          description: "Session and quick shop items are ready in the cart.",
        });
        
        navigate('/pos');
      } catch (error) {
        console.error("Error ending session:", error);
        toast({
          title: "Error",
          description: "Failed to end session. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePauseSession = async () => {
    try {
      setIsLoading(true);
      await onPauseSession(station.id);
    } catch (error) {
      console.error("Error pausing session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeSession = async () => {
    try {
      setIsLoading(true);
      await onResumeSession(station.id);
    } catch (error) {
      console.error("Error resuming session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (station.isOccupied) {
    return (
      <div className="flex w-full flex-col gap-2">
        {isPaused ? (
          <Button
            variant="default"
            className={`
              w-full text-white font-bold py-3 text-lg transition-opacity rounded-lg
              ${isPoolTable
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800'
                : isVR
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90'
              }
            `}
            onClick={handleResumeSession}
            disabled={isLoading}
          >
            <Play className="h-4 w-4 mr-2 fill-current" />
            {isLoading ? "Processing..." : "Resume Session"}
          </Button>
        ) : (
          <Button
            variant="secondary"
            className={`
              w-full font-bold py-3 text-lg transition-opacity rounded-lg border border-amber-500/30
              ${isPoolTable
                ? 'bg-amber-900/40 text-amber-100 hover:bg-amber-900/60'
                : isVR
                  ? 'bg-amber-900/40 text-amber-100 hover:bg-amber-900/60'
                  : 'bg-amber-900/40 text-amber-100 hover:bg-amber-900/60'
              }
            `}
            onClick={handlePauseSession}
            disabled={isLoading}
          >
            <Pause className="h-4 w-4 mr-2" />
            {isLoading ? "Processing..." : "Pause Session"}
          </Button>
        )}

        <Button
          variant="default"
          className={`
            w-full text-white font-bold py-3 text-lg transition-opacity rounded-lg
            ${isPoolTable
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
              : isVR
                ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90'
            }
          `}
          onClick={handleQuickShop}
          disabled={isLoading}
          onMouseEnter={prefetchPOS}
          onFocus={prefetchPOS}
        >
          <ShoppingBag className="h-4 w-4 mr-2" />
          Quick Shop
        </Button>

        <Button 
          variant="destructive" 
          className={`
            w-full text-white font-bold py-3 text-lg transition-opacity rounded-lg
            ${isPoolTable
              ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
              : isVR
                ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
                : 'bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90'
            }
          `}
          onClick={handleEndSession}
          disabled={isLoading}
        >
          <Square className="h-4 w-4 mr-2 fill-current" />
          {isLoading ? "Processing..." : "End Session"}
        </Button>
      </div>
    );
  }

  const defaultPricing = getRateForPlayerCount(station, 1);

  return (
    <>
      <Button 
        variant="default" 
        className={`
          w-full py-3 text-lg font-bold transition-opacity rounded-lg
          ${isPoolTable
            ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
            : isVR
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
              : 'bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:opacity-90'
          }
          text-white shadow-lg
        `}
        disabled={isLoading || customers.length === 0} 
        onClick={() => setIsStartDialogOpen(true)}
      >
        <Play className="h-4 w-4 mr-2" />
        {isLoading ? "Starting..." : customers.length === 0 ? "No Customers Available" : "Start Session"}
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
        onConfirm={handleStartSession}
      />
    </>
  );
};

export default StationActions;
