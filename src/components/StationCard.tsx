import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePOS, Station } from '@/context/POSContext';
import StationInfo from '@/components/station/StationInfo';
import StationTimer from '@/components/station/StationTimer';
import StationActions from '@/components/station/StationActions';
import StationCustomerPanel from '@/components/station/StationCustomerPanel';
import SessionDurationBar from '@/components/station/SessionDurationBar';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, ShoppingBag, Globe, CheckSquare, Square as SquareIcon, ArrowRight, Play } from 'lucide-react';
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
import { runWithMinDuration, SESSION_TRANSITION } from '@/utils/viewTransition';
import type { SessionEndCheckoutMode } from '@/types/pos.types';
import type { PrepaidBookingLink } from '@/types/prepaidBooking.types';
import { isPrepaidSession } from '@/utils/prepaidBooking.utils';
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
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (stationId: string) => void;
}


const StationCard: React.FC<StationCardProps> = ({
  station,
  recentSessions = [],
  intelLoading,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}) => {
  const {
    customers,
    startSession,
    endSession,
    endSessionGroup,
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
      plannedDurationMinutes?: number,
      prepaidBooking?: PrepaidBookingLink
    ) => {
      setPhase('starting');
      void hapticImpact('medium');
      try {
        await runWithMinDuration(
          startSession(
            stationId,
            customerId,
            hourlyRate,
            couponCode,
            playerCount,
            perPersonRate,
            plannedDurationMinutes,
            prepaidBooking
          ),
          SESSION_TRANSITION.startMinMs
        );
        setPhase('live');
      } catch (error) {
        setPhase('idle');
        throw error;
      }
    },
    [startSession]
  );

  const wrappedEndSession = useCallback(
    async (stationId: string): Promise<SessionEndCheckoutMode | void> => {
      setPhase('ending');
      void hapticImpact('heavy');
      try {
        const mode = await runWithMinDuration(
          endSession(stationId),
          SESSION_TRANSITION.endMinMs
        );
        setPhase('idle');
        return mode;
      } catch (error) {
        setPhase('idle');
        throw error;
      }
    },
    [endSession]
  );

  const sessionGroupId = session?.sessionGroupId;
  const groupSize =
    sessionGroupId != null
      ? stations.filter(
          (s) => s.isOccupied && s.currentSession?.sessionGroupId === sessionGroupId
        ).length
      : 0;
  const isPartialGroupEndHint = sessionGroupId != null && groupSize >= 2;
  const isPrepaid = isPrepaidSession(session);
  const prepaidEndNoPosHint = isPrepaid && quickShopCount === 0;

  const wrappedEndSessionGroup = useCallback(
    async (stationId: string): Promise<SessionEndCheckoutMode | void> => {
      setPhase('ending');
      void hapticImpact('heavy');
      try {
        const mode = await runWithMinDuration(endSessionGroup(stationId), SESSION_TRANSITION.endMinMs);
        setPhase('idle');
        return mode;
      } catch (error) {
        setPhase('idle');
        throw error;
      }
    },
    [endSessionGroup]
  );

  const canSelect = selectionMode && !station.isOccupied && phase === 'idle';

  return (
    <>
      <article
        className={`
          group relative overflow-hidden rounded-xl border backdrop-blur-md
          transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${theme.border} ${theme.bg} ${theme.glow}
          ${cardPhaseClass(phase, station.isOccupied)}
          ${cardRingClass(phase, station.isOccupied, theme.liveRing)}
          ${isPrepaid && showSessionBlock ? 'ring-2 ring-teal-400/45 border-teal-500/40' : ''}
          ${urgencyRing}
          ${canSelect && selected ? 'ring-2 ring-cuephoria-purple/70 border-cuephoria-purple/50' : ''}
          ${canSelect ? 'cursor-pointer' : ''}
        `}
        onClick={
          canSelect
            ? (e) => {
                if ((e.target as HTMLElement).closest('button, [role="switch"], a, input')) return;
                onToggleSelect?.(station.id);
              }
            : undefined
        }
      >
        <div className={`pointer-events-none absolute inset-0 ${theme.mesh}`} aria-hidden />

        {phase === 'starting' && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/35 backdrop-blur-[1px] animate-station-phase-in">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-400/50 bg-orange-500/20 shadow-[0_0_24px_rgba(249,115,22,0.35)]">
              <Play className="h-4 w-4 fill-orange-200 text-orange-200" />
            </div>
            <span className="text-sm font-semibold tracking-wide text-orange-100">Starting session</span>
          </div>
        )}

        {phase === 'ending' && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/40 backdrop-blur-[2px] animate-station-phase-in">
            <div
              className={`flex items-center gap-2 rounded-full border px-4 py-2 shadow-[0_0_20px_rgba(16,185,129,0.25)] ${
                isPartialGroupEndHint
                  ? 'border-violet-500/45 bg-violet-950/85'
                  : 'border-emerald-500/45 bg-emerald-950/85'
              }`}
            >
              <span
                className={`text-sm font-semibold ${
                  prepaidEndNoPosHint
                    ? 'text-teal-100'
                    : isPartialGroupEndHint
                      ? 'text-violet-100'
                      : 'text-emerald-100'
                }`}
              >
                {prepaidEndNoPosHint
                  ? 'Completing pre-paid session…'
                  : isPartialGroupEndHint
                    ? 'Saving station bill…'
                    : 'Sending to checkout'}
              </span>
              {!isPartialGroupEndHint && !prepaidEndNoPosHint ? (
                <ArrowRight className="h-4 w-4 text-emerald-400 animate-checkout-nudge" />
              ) : null}
            </div>
          </div>
        )}

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
              <div className="flex items-center gap-2 min-w-0">
                {canSelect && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect?.(station.id);
                    }}
                    className={`flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition-all ${
                      selected
                        ? 'border-cuephoria-purple bg-cuephoria-purple/25 text-white'
                        : 'border-white/15 bg-black/30 text-muted-foreground hover:border-cuephoria-purple/40'
                    }`}
                    aria-label={selected ? 'Deselect station' : 'Select station'}
                  >
                    {selected ? (
                      <CheckSquare className="h-3.5 w-3.5" />
                    ) : (
                      <SquareIcon className="h-3.5 w-3.5" />
                    )}
                    {selected ? 'Selected' : 'Select'}
                  </button>
                )}
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

          {/* Body: intel + prominent timer */}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,220px)] sm:items-stretch">
            <StationCustomerPanel
              station={station}
              customer={customer}
              recentSessions={recentSessions}
              intelLoading={intelLoading}
              theme={theme}
              expanded={!!showSessionBlock}
            />

            <div className="flex min-h-[130px] min-w-0 flex-col gap-2 overflow-hidden">
              {showSessionBlock ? (
                <div key={sessionId} className="flex flex-1 flex-col animate-station-content-in">
                  <StationTimer station={station} theme={theme} prominent />
                  {quickShopCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickShopTab('order');
                        setQuickShopOpen(true);
                      }}
                      className="mt-2 flex w-full items-center justify-between gap-2 rounded-md border border-emerald-500/35 bg-emerald-950/40 px-3 py-2 text-left transition-all hover:bg-emerald-950/60"
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <ShoppingBag className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span className="truncate text-xs text-emerald-200">{quickShopCount} items</span>
                      </div>
                      <CurrencyDisplay amount={quickShopTotal} className="shrink-0 text-sm font-bold text-emerald-300" />
                    </button>
                  )}
                </div>
              ) : phase === 'starting' ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-8 animate-station-phase-in">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-400" />
                  </span>
                  <span className="text-sm font-medium text-orange-200">Warming up…</span>
                </div>
              ) : phase === 'ending' ? (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-8 animate-station-content-out">
                  <span className="text-sm font-medium text-red-200/90">Closing session…</span>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-white/12 bg-black/25 px-4 py-6 min-h-[130px]">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-white/10 ${theme.iconBg}`}
                  >
                    <Play className={`h-5 w-5 fill-current opacity-70 ${theme.accent}`} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground/80">Ready for players</p>
                  <p className="mt-1 text-center text-[11px] text-muted-foreground max-w-[180px]">
                    Use the actions below to add a customer or start a session
                  </p>
                </div>
              )}
            </div>
          </div>

          {!showSessionBlock && phase !== 'starting' && phase !== 'ending' && (
            <>
              {selectionMode && selected ? (
                <p className="text-center text-xs text-cuephoria-lightpurple py-3 border-t border-white/8">
                  Selected for group start
                </p>
              ) : (
                <StationActions
                  station={station}
                  customers={customers}
                  theme={theme}
                  phase={phase}
                  onStartSession={wrappedStartSession}
                  onEndSession={wrappedEndSession}
                  onEndSessionGroup={wrappedEndSessionGroup}
                  groupSize={groupSize}
                  onPauseSession={pauseSession}
                  onResumeSession={resumeSession}
                  onExtendSession={extendSession}
                  onQuickShop={() => {
                    setQuickShopTab('products');
                    setQuickShopOpen(true);
                  }}
                  footerLayout
                />
              )}
            </>
          )}

          {showSessionBlock && (
            <StationActions
              station={station}
              customers={customers}
              theme={theme}
              phase={phase}
              onStartSession={wrappedStartSession}
              onEndSession={wrappedEndSession}
              onEndSessionGroup={wrappedEndSessionGroup}
              groupSize={groupSize}
              onPauseSession={pauseSession}
              onResumeSession={resumeSession}
              onExtendSession={extendSession}
              onQuickShop={() => {
                setQuickShopTab('products');
                setQuickShopOpen(true);
              }}
              footerLayout
            />
          )}
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
