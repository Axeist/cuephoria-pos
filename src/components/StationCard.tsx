import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { usePOS, Station } from '@/context/POSContext';
import StationInfo from '@/components/station/StationInfo';
import StationTimer from '@/components/station/StationTimer';
import StationActions from '@/components/station/StationActions';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, Tag, TrendingDown } from 'lucide-react';
import EditStationDialog from './EditStationDialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Helper function to get rate suffix for display
const getRateSuffix = (station: Station): string => {
  if (station.category === 'nit_event') {
    if (station.slotDuration === 15) {
      return '/15mins';
    } else if (station.slotDuration === 30) {
      return '/30mins';
    }
  }
  if (station.type === 'vr') {
    return '/15mins';
  }
  return '/hr';
};
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface StationCardProps {
  station: Station;
}

const StationCard: React.FC<StationCardProps> = ({ station }) => {
  const { customers, startSession, endSession, deleteStation, updateStation, stations, setStations } = usePOS();
  const { toast } = useToast();
  const isPoolTable = station.type === '8ball';
  const isVR = station.type === 'vr';
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);

  const getCustomer = (id: string) => {
    return customers.find(c => c.id === id);
  };

  const customer = station.currentSession 
    ? getCustomer(station.currentSession.customerId)
    : null;
    
  const customerName = customer ? customer.name : 'Unknown Customer';
  
  // ✅ NEW: Get coupon information from session
  const session = station.currentSession;
  const hasCoupon = session?.couponCode;
  const discountedRate = session?.hourlyRate || station.hourlyRate;
  const originalRate = session?.originalRate || station.hourlyRate;
  const isDiscounted = hasCoupon && discountedRate !== originalRate;
    
  const handleDeleteStation = async () => {
    await deleteStation(station.id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditDialogOpen(true);
  };

  const isPublicLive = station.eventEnabled ?? (station.category ? false : true);

  const handleTogglePublicBooking = async (nextValue: boolean) => {
    if (isTogglingPublic) return;
    setIsTogglingPublic(true);
    try {
      const { error } = await supabase
        .from('stations')
        .update({ event_enabled: nextValue })
        .eq('id', station.id);

      if (error) throw error;

      setStations(
        stations.map((s) => (s.id === station.id ? { ...s, eventEnabled: nextValue } : s))
      );

      toast({
        title: nextValue ? 'Public Booking Enabled' : 'Public Booking Disabled',
        description: `${station.name} ${nextValue ? 'will now appear' : 'will no longer appear'} on public booking.`,
      });
    } catch (error) {
      console.error('Error toggling public booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to update public booking status',
        variant: 'destructive',
      });
    } finally {
      setIsTogglingPublic(false);
    }
  };

  return (
    <>
      <Card 
        className={`
          relative overflow-hidden card-hover animate-scale-in h-full
          ${station.isOccupied 
            ? customer?.isMember 
              ? 'border-green-500 bg-black/80' 
              : hasCoupon
                ? 'border-orange-500 bg-black/80'
                : 'border-cuephoria-orange bg-black/80' 
            : isPoolTable 
              ? 'border-green-500 bg-gradient-to-b from-green-900/30 to-green-950/40' 
              : isVR
                ? 'border-blue-500 bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-cyan-900/40'
                : 'border-cuephoria-purple bg-gradient-to-b from-cuephoria-purple/20 to-black/50'
          }
          ${isPoolTable ? 'rounded-xl' : isVR ? 'rounded-2xl' : 'rounded-lg'}
        `}
      >
        {/* VR Specific Visual Elements */}
        {isVR && (
          <>
            {/* Animated gradient border effect */}
            <div className="absolute inset-0 rounded-2xl opacity-30 pointer-events-none">
              <div className="absolute inset-[-2px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 animate-spin-slow blur-sm"></div>
            </div>
            
            {/* Inner content wrapper for proper z-index */}
            <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-cyan-900/40 pointer-events-none"></div>
            
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-blue-400/30 to-transparent rounded-tl-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-cyan-400/30 to-transparent rounded-br-2xl pointer-events-none"></div>
            
            {/* Floating particles effect */}
            <div className="absolute top-4 left-4 w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse pointer-events-none"></div>
            <div className="absolute top-6 right-8 w-1 h-1 rounded-full bg-cyan-400 animate-pulse delay-75 pointer-events-none"></div>
            <div className="absolute bottom-8 left-6 w-1 h-1 rounded-full bg-purple-400 animate-pulse delay-150 pointer-events-none"></div>
            <div className="absolute bottom-4 right-4 w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse delay-300 pointer-events-none"></div>
            
            {/* Horizontal scan lines */}
            <div className="absolute w-full h-[1px] top-12 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent animate-pulse pointer-events-none"></div>
            <div className="absolute w-full h-[1px] bottom-12 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent animate-pulse delay-200 pointer-events-none"></div>
            
            {/* VR headset icon glow */}
            <div className="absolute top-2 right-2 w-8 h-8 bg-blue-500/20 rounded-full blur-md animate-pulse pointer-events-none"></div>
            
            {/* Corner tech details */}
            <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-blue-400/50 rounded-tl-lg pointer-events-none"></div>
            <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-cyan-400/50 rounded-tr-lg pointer-events-none"></div>
            <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-blue-400/50 rounded-bl-lg pointer-events-none"></div>
            <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-cyan-400/50 rounded-br-lg pointer-events-none"></div>
          </>
        )}

        {/* Pool Table Visual Elements */}
        {isPoolTable && (
          <>
            <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-300"></div>
            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-300"></div>
            <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-300"></div>
            <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-300"></div>
            <div className="absolute w-full h-[1px] top-10 bg-gradient-to-r from-transparent via-green-500/30 to-transparent"></div>
          </>
        )}
        
        {/* PS5 Visual Elements */}
        {!isPoolTable && !isVR && (
          <>
            <div className="absolute right-0 top-0 w-8 h-3 bg-cuephoria-lightpurple/20 rounded-bl-lg"></div>
            <div className="absolute w-full h-[1px] top-10 bg-gradient-to-r from-transparent via-cuephoria-lightpurple/30 to-transparent"></div>
            <div className="absolute left-4 bottom-3 w-1 h-1 rounded-full bg-cuephoria-orange animate-pulse-soft"></div>
            <div className="absolute left-7 bottom-3 w-1 h-1 rounded-full bg-cuephoria-lightpurple animate-pulse-soft delay-100"></div>
          </>
        )}

        {/* ✅ NEW: Coupon Badge (shows when session has coupon) */}
        {station.isOccupied && hasCoupon && (
          <div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
            <Tag className="h-3 w-3" />
            {session.couponCode}
          </div>
        )}

        {/* Membership indicator on top of card */}
        {station.isOccupied && customer && (
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-transparent to-transparent z-20">
            <div className={`h-full ${customer.isMember ? 'bg-green-500' : 'bg-gray-500'} w-2/3 rounded-br-lg`}></div>
          </div>
        )}

        <CardHeader className="pb-2 relative z-10">
          <div className="flex justify-between items-center space-x-2">
            <div className="flex-grow">
              <StationInfo station={station} customerName={customerName} customerData={customer} />
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className={`
                  h-8 w-8 shrink-0 
                  ${isPoolTable 
                    ? 'text-green-300 hover:text-blue-500 hover:bg-green-950/50' 
                    : isVR
                      ? 'text-blue-300 hover:text-cyan-400 hover:bg-blue-950/50'
                      : 'text-cuephoria-lightpurple hover:text-blue-500 hover:bg-cuephoria-purple/20'
                  }
                `}
                disabled={station.isOccupied}
                onClick={handleEditClick}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`
                      h-8 w-8 shrink-0 
                      ${isPoolTable 
                        ? 'text-green-300 hover:text-red-500 hover:bg-green-950/50' 
                        : isVR
                          ? 'text-blue-300 hover:text-red-500 hover:bg-blue-950/50'
                          : 'text-cuephoria-lightpurple hover:text-destructive hover:bg-cuephoria-purple/20'
                      }
                    `}
                    disabled={station.isOccupied}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className={isPoolTable ? 'border-green-500' : isVR ? 'border-blue-500' : 'border-cuephoria-purple'}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Station</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {station.name}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteStation}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Public booking toggle (clean placement under edit controls) */}
          <div className="mt-2 flex items-center justify-end gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isPublicLive ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.35)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.35)]'
              }`}
              aria-hidden="true"
            />
            <span className="text-xs text-muted-foreground">
              {isPublicLive ? 'Live on public booking' : 'Disabled on public booking'}
            </span>
            <Switch
              checked={!!isPublicLive}
              disabled={isTogglingPublic}
              onCheckedChange={handleTogglePublicBooking}
            />
          </div>
        </CardHeader>
        <CardContent className="pb-2 relative z-10">
          <div className="flex flex-col space-y-2">
            {station.isOccupied && station.currentSession && (
              <>
                <StationTimer station={station} />
                
                {/* ✅ NEW: Show discounted rate information */}
                {isDiscounted && (
                  <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-md animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-orange-400">
                        <TrendingDown className="h-3 w-3" />
                        <span className="font-medium">Discounted Rate</span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-sm line-through text-gray-400 indian-rupee">
                        {originalRate}{getRateSuffix(station)}
                      </span>
                      <span className="text-lg font-bold text-orange-400 indian-rupee">
                        {discountedRate}{getRateSuffix(station)}
                      </span>
                      {discountedRate === 0 && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                          FREE
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-orange-300 mt-1">
                      Saving ₹{originalRate - discountedRate}{getRateSuffix(station)}
                    </div>
                  </div>
                )}
                
                {/* ✅ Show regular rate if no coupon */}
                {!isDiscounted && (
                  <div className="mt-2 p-2 bg-cuephoria-purple/10 border border-cuephoria-purple/30 rounded-md">
                    <div className="text-xs text-gray-400">Current Rate</div>
                    <div className="text-lg font-bold text-cuephoria-lightpurple indian-rupee">
                      {station.hourlyRate}{getRateSuffix(station)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col space-y-2 pt-2 relative z-10">
          <StationActions 
            station={station}
            customers={customers}
            onStartSession={startSession}
            onEndSession={endSession}
          />
        </CardFooter>
      </Card>

      {/* Edit Station Dialog */}
      <EditStationDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        station={station}
        onSave={updateStation}
      />
    </>
  );
};

export default StationCard;
