import React, { useState } from 'react';
import { usePOS, Station } from '@/context/POSContext';
import StationInfo from '@/components/station/StationInfo';
import StationTimer from '@/components/station/StationTimer';
import StationActions from '@/components/station/StationActions';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, ShoppingBag, ChevronRight } from 'lucide-react';
import EditStationDialog from './EditStationDialog';
import StationQuickShopDialog from '@/components/station/StationQuickShopDialog';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStationTheme } from '@/utils/stationTheme';
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
} from '@/components/ui/alert-dialog';

interface StationCardProps {
  station: Station;
}

const StationCard: React.FC<StationCardProps> = ({ station }) => {
  const {
    customers,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    deleteStation,
    updateStation,
    stations,
    setStations,
    getStationQuickShopItems,
  } = usePOS();
  const { toast } = useToast();
  const theme = getStationTheme(station);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);
  const [quickShopOpen, setQuickShopOpen] = useState(false);
  const [quickShopTab, setQuickShopTab] = useState<'products' | 'order'>('products');

  const customer = station.currentSession
    ? customers.find((c) => c.id === station.currentSession!.customerId)
    : null;
  const customerName = customer?.name ?? 'Unknown';
  const session = station.currentSession;
  const sessionId = session?.id ?? '';
  const quickShopItems = sessionId ? getStationQuickShopItems(sessionId) : [];
  const quickShopCount = quickShopItems.reduce((sum, item) => sum + item.quantity, 0);
  const quickShopTotal = quickShopItems.reduce((sum, item) => sum + item.total, 0);
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
      setStations(stations.map((s) => (s.id === station.id ? { ...s, eventEnabled: nextValue } : s)));
    } catch {
      toast({ title: 'Error', description: 'Failed to update booking visibility', variant: 'destructive' });
    } finally {
      setIsTogglingPublic(false);
    }
  };

  return (
    <>
      <article
        className={`relative flex flex-col rounded-xl border backdrop-blur-sm transition-all duration-200 hover:scale-[1.01] ${theme.border} ${theme.bg} ${theme.glow} ${
          station.isOccupied ? 'ring-1 ring-orange-500/25' : ''
        }`}
      >
        {/* Type accent bar */}
        <div
          className={`h-0.5 w-full shrink-0 rounded-t-xl ${
            station.isOccupied
              ? 'bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500'
              : 'bg-gradient-to-r from-transparent via-current to-transparent opacity-40'
          } ${theme.accent}`}
        />

        <div className="flex flex-col gap-2 p-3">
          {/* Header row */}
          <div className="flex gap-1">
            <div className="min-w-0 flex-1">
              <StationInfo station={station} customerName={customerName} customerData={customer} />
            </div>
            <div className="flex shrink-0 flex-col gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                disabled={station.isOccupied}
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={station.isOccupied}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete station?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Delete {station.name}? This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground"
                      onClick={() => void deleteStation(station.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Public booking — compact */}
          <div className="flex items-center justify-between rounded-md bg-black/20 px-2 py-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${isPublicLive ? 'bg-green-400' : 'bg-red-400'}`}
              />
              <span className="text-[10px] text-muted-foreground">
                {isPublicLive ? 'On booking page' : 'Hidden from booking'}
              </span>
            </div>
            <Switch
              className="scale-75"
              checked={!!isPublicLive}
              disabled={isTogglingPublic}
              onCheckedChange={handleTogglePublicBooking}
            />
          </div>

          {station.isOccupied && session && (
            <>
              <StationTimer station={station} />
              {quickShopCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setQuickShopTab('order');
                    setQuickShopOpen(true);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-emerald-500/30 bg-emerald-950/30 px-2 py-1.5 text-left hover:bg-emerald-950/50"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ShoppingBag className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[11px] text-emerald-200">{quickShopCount} items</span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <CurrencyDisplay amount={quickShopTotal} className="text-xs font-bold text-emerald-300" />
                    <ChevronRight className="h-3 w-3 text-emerald-400/60" />
                  </div>
                </button>
              )}
            </>
          )}

          <StationActions
            station={station}
            customers={customers}
            onStartSession={startSession}
            onEndSession={endSession}
            onPauseSession={pauseSession}
            onResumeSession={resumeSession}
            onQuickShop={() => {
              setQuickShopTab('products');
              setQuickShopOpen(true);
            }}
          />
        </div>
      </article>

      {station.isOccupied && session && (
        <StationQuickShopDialog
          open={quickShopOpen}
          onOpenChange={setQuickShopOpen}
          station={station}
          customer={customer}
          sessionId={session.id}
          initialTab={quickShopTab}
        />
      )}

      <EditStationDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        station={station}
        onSave={(id, updates) =>
          updateStation(id, {
            name: updates.name,
            hourlyRate: updates.hourlyRate,
            maxPlayers: updates.maxPlayers,
            occupancyRates: updates.occupancyRates,
            eventEnabled: updates.eventEnabled,
            type: updates.type,
            slotDuration: updates.slotDuration,
            pricingMode: updates.pricingMode,
          })
        }
      />
    </>
  );
};

export default StationCard;
