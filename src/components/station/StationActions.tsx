import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Station, Customer } from '@/context/POSContext';
import { useToast } from '@/hooks/use-toast';
import { usePOS } from '@/context/POSContext';
import { Play, Square } from 'lucide-react';
import StartSessionDialog from '@/components/StartSessionDialog';

interface StationActionsProps {
  station: Station;
  customers: Customer[];
  onStartSession: (stationId: string, customerId: string, hourlyRate?: number, couponCode?: string) => Promise<void>;
  onEndSession: (stationId: string) => Promise<void>;
}

const StationActions: React.FC<StationActionsProps> = ({ 
  station, 
  customers, 
  onStartSession, 
  onEndSession 
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectCustomer } = usePOS();
  const [isLoading, setIsLoading] = useState(false);
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  
  const isPoolTable = station.type === '8ball';
  const isVR = station.type === 'vr';

  const handleStartSession = async (
    customerId: string,
    customerName: string,
    finalRate: number,
    couponCode?: string
  ) => {
    try {
      setIsLoading(true);
      console.log(`Starting session - Station ID: ${station.id}, Customer ID: ${customerId}, Rate: ${finalRate}, Coupon: ${couponCode || 'none'}`);
      
      await onStartSession(station.id, customerId, finalRate, couponCode);
      
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
          description: "Session has been ended and added to cart. Redirecting to checkout...",
        });
        
        setTimeout(() => {
          navigate('/pos');
        }, 1500);
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

  if (station.isOccupied) {
    return (
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
    );
  }

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
        baseRate={station.hourlyRate}
        onConfirm={handleStartSession}
      />
    </>
  );
};

export default StationActions;
