import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePOS, Station } from '@/context/POSContext';
import StationInfo from '@/components/station/StationInfo';
import StationTimer from '@/components/station/StationTimer';
import StationActions from '@/components/station/StationActions';
import StationCustomerPanel from '@/components/station/StationCustomerPanel';
import SessionDurationBar from '@/components/station/SessionDurationBar';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, ShoppingBag, ChevronRight, Globe } from 'lucide-react';
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
import {
  getSessionDurationState,
  getUrgencyRingClass,
} from '@/utils/sessionDuration.utils';
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
    extendSession,
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
  const [durationTick, setDurationTick] = useState(0);
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
  const customerName = customer?.name ?? 'Unknown';
  const session = station.currentSession;
  const sessionId = session?.id ?? '';

  useEffect(() => {
    if (!session?.plannedDurationMinutes) return;
    const id = window.setInterval(() => setDurationTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [session?.plannedDurationMinutes, sessionId]);

  const quickShopItems = sessionId ? getStationQuickShopItems(sessionId) : [];
  const quickShopCount = quickShopItems.reduce((sum, item) => sum + item.quantity, 0);
  const quickShopTotal = quickShopItems.reduce((sum, item) => sum + item.total, 0);
  const isPublicLive = station.eventEnabled ?? (station.category ? false : true);
  const isLive = station.isOccupied || phase === 'live' || phase === 'starting';
  const showSessionBlock = station.isOccupied && session && phase !== 'ending';
  void durationTick;
  const durationState = session ? getSessionDurationState(session) : null;
  const urgencyRing = durationState ? getUrgencyRingClass(durationState.urgency) : '';

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
      perPersonRate?: number,
      plannedDurationMinutes?: number
    ) => {
      setPhase('starting');
      void hapticImpact('medium');
      await startSession(
        stationId,
        customerId,
        hourlyRate,
        couponCode,
        playerCount,
        perPersonRate,
        plannedDurationMinutes
      );
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
          group relative overflow-hidden rounded-xl border backdrop-blur-md
          transition-all duration-300 ease-out
          ${theme.border} ${theme.bg} ${theme.glow}
          ${cardPhaseClass(phase, station.isOccupied)}
          ${cardRingClass(phase, station.isOccupied, theme.liveRing)}
          ${urgencyRing}
        `}
      >
        <div className={`pointer-events-none absolute inset-0 ${theme.mesh}`} aria-hidden />

        {isLive && phase !== 'ending' && (
          <div
            className="pointer-events-none absolute inset-0 rounded-xl animate-station-live-glow opacity-30"
            style={{
              background: `radial-gradient(circle at 50% 0%, rgba(249,115,22,0.15), transparent 70%)`,
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
          className={`relative z-10 w-full shrink-0 ${
            durationState ? '' : `h-1 ${isLive && phase !== 'ending' ? theme.topBarLive : theme.topBarIdle}`
          }`}
        >
          {durationState && session && (
            <SessionDurationBar session={session} className="px-3 pt-2" />
          )}
        </div>

        <div className="relative z-10 space-y-3 p-3 sm:p-4">
          {/* Header: identity + compact controls */}
          <div className="space-y-2">
            <StationInfo
              station={station}
              customerName={customerName}
              phase={phase}
            />
            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-black/25 px-2.5 py-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Globe className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate text-[11px] text-muted-foreground">On booking page</span>
                <Switch
                  className="ml-1 scale-90 data-[state=checked]:bg-green-600"
                  checked={!!isPublicLive}
                  disabled={isTogglingPublic}
                  onCheckedChange={handleTogglePublicBooking}
                />
              </div>
              <div className="flex shrink-0 gap-0.5 opacity-80 group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 hover:bg-white/10 ${theme.accent}`}
                  disabled={station.isOccupied}
                  onClick={() => setEditDialogOpen(true)}
                  title="Edit station"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-red-500/10"
                      disabled={station.isOccupied}
                      title="Delete station"
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
          </div>

          {/* Body: intel + session side by side */}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <StationCustomerPanel
              station={station}
              customer={customer}
              recentSessions={recentSessions}
              intelLoading={intelLoading}
              theme={theme}
            />

            <div className="flex min-w-[148px] flex-col gap-2 sm:w-[148px]">
              {showSessionBlock ? (
                <div key={sessionId} className="space-y-1.5 animate-station-content-in">
                  <StationTimer station={station} theme={theme} compact />
                  {quickShopCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickShopTab('order');
                        setQuickShopOpen(true);
                      }}
                      className="flex w-full items-center justify-between gap-1.5 rounded-md border border-emerald-500/35 bg-emerald-950/40 px-2 py-1.5 text-left transition-all hover:bg-emerald-950/60"
                    >
                      <div className="flex min-w-0 items-center gap-1">
                        <ShoppingBag className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span className="truncate text-[11px] text-emerald-200">{quickShopCount} items</span>
                      </div>
                      <CurrencyDisplay amount={quickShopTotal} className="shrink-0 text-xs font-bold text-emerald-300" />
                    </button>
                  )}
                </div>
              ) : phase === 'starting' ? (
                <div className="flex items-center justify-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-4 animate-pulse-soft">
                  <span className="h-2 w-2 rounded-full bg-orange-400 animate-ping" />
                  <span className="text-xs font-medium text-orange-200">Starting…</span>
                </div>
              ) : phase === 'ending' ? (
                <div className="flex items-center justify-center rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-4 animate-station-content-out">
                  <span className="text-xs font-medium text-red-200">Ending…</span>
                </div>
              ) : null}

              <StationActions
                station={station}
                customers={customers}
                theme={theme}
                phase={phase}
                onStartSession={wrappedStartSession}
                onEndSession={wrappedEndSession}
                onPauseSession={pauseSession}
                onResumeSession={resumeSession}
                onExtendSession={extendSession}
                onQuickShop={() => {
                  setQuickShopTab('products');
                  setQuickShopOpen(true);
                }}
              />
            </div>
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
