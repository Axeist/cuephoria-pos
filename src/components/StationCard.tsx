import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePOS, Station } from '@/context/POSContext';
import StationInfo from '@/components/station/StationInfo';
import StationTimer from '@/components/station/StationTimer';
import StationActions from '@/components/station/StationActions';
import StationCustomerPanel from '@/components/station/StationCustomerPanel';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, ShoppingBag, Globe } from 'lucide-react';
import EditStationDialog from './EditStationDialog';
import StationQuickShopDialog from '@/components/station/StationQuickShopDialog';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  getStationTheme,
  cardPhaseClass,
  cardRingClass,
  type StationPhase,
} from '@/utils/stationTheme';
import { hapticImpact } from '@/utils/capacitor';
import type { CustomerRecentSession } from '@/hooks/stations/useStationCustomerIntel';
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
  recentSessions?: CustomerRecentSession[];
  intelLoading?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const StationCard: React.FC<StationCardProps> = ({
  station,
  recentSessions = [],
  intelLoading,
}) => {
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
  const [phase, setPhase] = useState<StationPhase>(station.isOccupied ? 'live' : 'idle');
  const prevOccupiedRef = useRef(station.isOccupied);

  useEffect(() => {
    if (station.isOccupied && !prevOccupiedRef.current && phase === 'idle') {
      setPhase('live');
    }
    if (!station.isOccupied && prevOccupiedRef.current && phase !== 'ending') {
      setPhase('idle');
    }
    prevOccupiedRef.current = station.isOccupied;
  }, [station.isOccupied, phase]);

  const customer = station.currentSession
    ? customers.find((c) => c.id === station.currentSession!.customerId)
    : null;
  const session = station.currentSession;
  const sessionId = session?.id ?? '';
  const quickShopItems = sessionId ? getStationQuickShopItems(sessionId) : [];
  const quickShopCount = quickShopItems.reduce((sum, item) => sum + item.quantity, 0);
  const quickShopTotal = quickShopItems.reduce((sum, item) => sum + item.total, 0);
  const isPublicLive = station.eventEnabled ?? (station.category ? false : true);
  const isLive = station.isOccupied || phase === 'live' || phase === 'starting';
  const showSessionBlock = station.isOccupied && session && phase !== 'ending';

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

  const wrappedStartSession = useCallback(
    async (
      stationId: string,
      customerId: string,
      hourlyRate?: number,
      couponCode?: string,
      playerCount?: number,
      perPersonRate?: number
    ) => {
      setPhase('starting');
      void hapticImpact('medium');
      await startSession(stationId, customerId, hourlyRate, couponCode, playerCount, perPersonRate);
      await sleep(400);
      setPhase('live');
    },
    [startSession]
  );

  const wrappedEndSession = useCallback(
    async (stationId: string) => {
      setPhase('ending');
      void hapticImpact('heavy');
      await sleep(480);
      await endSession(stationId);
      setPhase('idle');
    },
    [endSession]
  );

  return (
    <>
      <article
        className={`
          group relative flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border backdrop-blur-md
          transition-all duration-300 ease-out
          ${theme.border} ${theme.bg} ${theme.glow}
          ${cardPhaseClass(phase, station.isOccupied)}
          ${cardRingClass(phase, station.isOccupied, theme.liveRing)}
        `}
      >
        <div className={`pointer-events-none absolute inset-0 ${theme.mesh}`} aria-hidden />

        {isLive && phase !== 'ending' && (
          <div
            className="pointer-events-none absolute inset-0 animate-station-live-glow opacity-25"
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(249,115,22,0.18), transparent 70%)',
            }}
            aria-hidden
          />
        )}

        {theme.showScanLine && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden opacity-40">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scanner" />
          </div>
        )}

        <div
          className={`relative z-10 h-1 w-full shrink-0 ${
            isLive && phase !== 'ending' ? theme.topBarLive : theme.topBarIdle
          }`}
        />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-1.5 p-2.5">
          {/* Header */}
          <div className="flex shrink-0 items-start gap-1">
            <div className="min-w-0 flex-1">
              <StationInfo station={station} phase={phase} compact />
            </div>
            <div className="flex shrink-0 gap-0.5 opacity-70 group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 hover:bg-white/10 ${theme.accent}`}
                disabled={station.isOccupied}
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-red-500/10"
                    disabled={station.isOccupied}
                  >
                    <Trash2 className="h-3 w-3" />
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

          {/* Body — customer intel or idle info */}
          <div className="min-h-0 flex-1 overflow-hidden">
            {phase === 'starting' ? (
              <div className="flex h-full items-center justify-center gap-2 rounded-lg bg-orange-500/10 border border-orange-500/30 animate-pulse-soft">
                <span className="h-2 w-2 rounded-full bg-orange-400 animate-ping" />
                <span className="text-xs font-medium text-orange-200">Starting…</span>
              </div>
            ) : phase === 'ending' ? (
              <div className="flex h-full items-center justify-center rounded-lg bg-red-500/10 border border-red-500/25 animate-station-content-out">
                <span className="text-xs font-medium text-red-200">Ending…</span>
              </div>
            ) : (
              <StationCustomerPanel
                station={station}
                customer={customer}
                recentSessions={recentSessions}
                intelLoading={intelLoading}
                theme={theme}
                variant="tile"
              />
            )}
          </div>

          {/* Timer + quick shop */}
          {showSessionBlock && (
            <div key={sessionId} className="shrink-0 space-y-1 animate-station-content-in">
              <StationTimer station={station} theme={theme} compact />
              {quickShopCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setQuickShopTab('order');
                    setQuickShopOpen(true);
                  }}
                  className="flex w-full items-center justify-between rounded-md border border-emerald-500/35 bg-emerald-950/40 px-2 py-1 text-left hover:bg-emerald-950/60"
                >
                  <div className="flex items-center gap-1">
                    <ShoppingBag className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-200">{quickShopCount} items</span>
                  </div>
                  <CurrencyDisplay amount={quickShopTotal} className="text-[10px] font-bold text-emerald-300" />
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="shrink-0">
            <StationActions
              station={station}
              customers={customers}
              theme={theme}
              phase={phase}
              compact
              onStartSession={wrappedStartSession}
              onEndSession={wrappedEndSession}
              onPauseSession={pauseSession}
              onResumeSession={resumeSession}
              onQuickShop={() => {
                setQuickShopTab('products');
                setQuickShopOpen(true);
              }}
            />
          </div>

          {/* Public booking toggle */}
          <div className="flex shrink-0 items-center justify-between rounded-md border border-white/6 bg-black/25 px-2 py-0.5">
            <div className="flex items-center gap-1">
              <Globe className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">Booking page</span>
            </div>
            <Switch
              className="scale-[0.65] data-[state=checked]:bg-green-600"
              checked={!!isPublicLive}
              disabled={isTogglingPublic}
              onCheckedChange={handleTogglePublicBooking}
            />
          </div>
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
