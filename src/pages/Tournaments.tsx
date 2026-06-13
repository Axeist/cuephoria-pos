import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Plus,
  ExternalLink,
  MapPin,
  Award,
  Monitor,
  Sparkles,
  Tv,
  Link2,
  Copy,
  Check,
} from 'lucide-react';
import { useLocation } from '@/context/LocationContext';
import { usePermissions } from '@/context/PermissionsContext';
import { useTournamentOperations } from '@/services/tournamentService';
import { useToast } from '@/components/ui/use-toast';
import { usePinVerification } from '@/hooks/usePinVerification';
import PinVerificationDialog from '@/components/PinVerificationDialog';
import { Tournament } from '@/types/tournament.types';
import { generateId } from '@/utils/pos.utils';
import { buildPublicTournamentUrl, buildPublicTournamentTVUrl } from '@/utils/publicTournamentUrl';
import { supabase } from '@/integrations/supabase/client';
import TournamentList from '@/components/tournaments/TournamentList';
import TournamentWizardDialog from '@/components/tournaments/TournamentWizardDialog';
import TournamentManagement from '@/components/tournaments/TournamentManagement';
import TournamentLeaderboard from '@/components/tournaments/TournamentLeaderboard';
import TournamentHistoryDialog from '@/components/tournaments/TournamentHistoryDialog';
import TournamentImageUpload from '@/components/tournaments/TournamentImageUpload';
import TournamentImageManagement from '@/components/tournaments/TournamentImageManagement';
import TournamentHubStats from '@/components/tournaments/TournamentHubStats';
import { TournamentMotionProvider } from '@/components/tournaments/animations/TournamentMotionProvider';
import { AmbientTournamentBg } from '@/components/tournaments/animations/AmbientTournamentBg';
import TournamentTVDisplay from '@/components/tournaments/TournamentTVDisplay';
import { Button } from '@/components/ui/button';
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
import { RotateCcw, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabId = 'manage' | 'leaderboard' | 'tv';

const TABS: { id: TabId; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'manage', label: 'Events', icon: Trophy, desc: 'Create & run tournaments' },
  { id: 'leaderboard', label: 'Leaderboard', icon: Award, desc: 'Branch rankings' },
  { id: 'tv', label: 'TV Mode', icon: Tv, desc: 'Venue displays' },
];

function newTournamentDraft(locationId?: string | null): Tournament {
  return {
    id: generateId(),
    name: '',
    gameType: 'PS5',
    gameTitle: 'FIFA',
    date: new Date().toISOString().split('T')[0],
    players: [],
    matches: [],
    lapTimes: [],
    status: 'upcoming',
    tournamentFormat: 'time_trial',
    maxPlayers: 16,
    ...(locationId ? { location_id: locationId } : {}),
  };
}

export default function TournamentsPage() {
  const { activeLocationId, activeLocation } = useLocation();
  const { can } = usePermissions();
  const canManage = can('settings.tournaments.manage');
  const canResetLeaderboard = can('settings.leaderboard.reset');
  const tournamentOps = useTournamentOperations();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: TabId =
    tabParam === 'leaderboard' || tabParam === 'tv' ? tabParam : 'manage';

  const { showPinDialog, requestPinVerification, handlePinSuccess, handlePinCancel } =
    usePinVerification();

  const [loading, setLoading] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [managingTournament, setManagingTournament] = useState<Tournament | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedTournamentForHistory, setSelectedTournamentForHistory] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [resetting, setResetting] = useState(false);
  const [imageManagementKey, setImageManagementKey] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const setActiveTab = (tab: TabId) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === 'manage') next.delete('tab');
        else next.set('tab', tab);
        return next;
      },
      { replace: true },
    );
  };

  const publicUrl = useMemo(
    () =>
      activeLocation?.slug && activeLocationId
        ? buildPublicTournamentUrl({
            branchSlug: activeLocation.slug,
            locationId: activeLocationId,
          })
        : null,
    [activeLocation, activeLocationId],
  );

  const tvUrl = useMemo(
    () =>
      activeLocation?.slug && activeLocationId
        ? buildPublicTournamentTVUrl({
            branchSlug: activeLocation.slug,
            locationId: activeLocationId,
          })
        : null,
    [activeLocation, activeLocationId],
  );

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await tournamentOps.fetchTournaments(activeLocationId);
      setTournaments(fetched);
    } catch {
      toast({
        title: 'Error loading tournaments',
        description: 'Could not load tournament data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [activeLocationId, tournamentOps, toast]);

  useEffect(() => {
    void loadTournaments();
  }, [loadTournaments]);

  const openCreateWizard = () => {
    setEditingTournament(newTournamentDraft(activeLocationId));
    setDialogOpen(true);
  };

  const copyPublicUrl = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopiedUrl(true);
    toast({ title: 'Link copied', description: 'Public tournament page URL copied.' });
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSaveTournament = async (updated: Tournament) => {
    if (!canManage) return;
    setLoading(true);
    try {
      const saved = await tournamentOps.saveTournament(updated);
      if (saved) {
        setTournaments((prev) => {
          const exists = prev.some((t) => t.id === saved.id);
          return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved];
        });
        setDialogOpen(false);
        setEditingTournament(null);
        setManagingTournament(saved);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTournament = async (id: string) => {
    if (!canManage || !confirm('Delete this tournament?')) return;
    const t = tournaments.find((x) => x.id === id);
    if (!t) return;
    setLoading(true);
    try {
      const ok = await tournamentOps.deleteTournament(id, t.name);
      if (ok) {
        setTournaments((prev) => prev.filter((x) => x.id !== id));
        if (managingTournament?.id === id) setManagingTournament(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetLeaderboard = async () => {
    setResetting(true);
    try {
      let historyQuery: any = supabase
        .from('tournament_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      let winnersQuery: any = supabase
        .from('tournament_winners')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (activeLocationId) {
        historyQuery = historyQuery.eq('location_id', activeLocationId);
        winnersQuery = winnersQuery.eq('location_id', activeLocationId);
      }
      const { error: hErr } = await historyQuery;
      if (hErr) throw hErr;
      const { error: wErr } = await winnersQuery;
      if (wErr) throw wErr;
      toast({ title: 'Leaderboard reset', description: 'All entries cleared for this branch.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to reset leaderboard.', variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  };

  if (!can('settings.tournaments.view')) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <TournamentMotionProvider intensity="full">
      <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden">
        <AmbientTournamentBg />

        <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 lg:py-8 space-y-6 lg:space-y-8">
          {/* Hero — full width */}
          <motion.header
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6"
          >
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-widest font-semibold text-primary mb-3">
                <Sparkles className="h-3 w-3" />
                Tournament hub
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/60">
                Run events that fill the room
              </h1>
              <p className="text-muted-foreground mt-2 text-base lg:text-lg max-w-xl">
                FIFA lap times, knockout brackets, live TV boards, and public registration — all for{' '}
                <span className="text-foreground font-medium">{activeLocation?.name ?? 'your branch'}</span>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {activeLocation && (
                <div
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium',
                    activeLocation.slug === 'lite'
                      ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200'
                      : 'border-purple-400/30 bg-purple-500/10 text-purple-200',
                  )}
                >
                  <MapPin className="h-4 w-4" />
                  {activeLocation.name}
                </div>
              )}
              {publicUrl && (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(publicUrl, '_blank')}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Public page
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={copyPublicUrl}>
                    {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy link
                  </Button>
                </>
              )}
              {canManage && (
                <Button size="sm" className="btn-gradient gap-1.5 h-10 px-5" onClick={openCreateWizard}>
                  <Plus className="h-4 w-4" />
                  New tournament
                </Button>
              )}
            </div>
          </motion.header>

          {/* Stats insight row */}
          <TournamentHubStats tournaments={tournaments} />

          {/* Full-width tab strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm">
            {TABS.map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  'relative rounded-xl px-4 py-3 text-left transition-all',
                  activeTab === id
                    ? 'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 shadow-[0_0_24px_-8px_var(--brand-primary-hex)]'
                    : 'border border-transparent hover:bg-white/5',
                )}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Icon className={cn('h-4 w-4', activeTab === id ? 'text-primary' : 'text-muted-foreground')} />
                  {label}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">{desc}</p>
              </button>
            ))}
          </div>

          {/* Tab content — full width */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (managingTournament?.id ?? '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              {activeTab === 'manage' && (
                <div className="space-y-6 lg:space-y-8">
                  {managingTournament ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur px-5 py-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Managing event</p>
                          <h3 className="text-xl font-bold">{managingTournament.name}</h3>
                        </div>
                        <Button variant="outline" onClick={() => setManagingTournament(null)}>
                          ← All events
                        </Button>
                      </div>
                      <TournamentManagement
                        tournament={managingTournament}
                        onSave={async (t) => {
                          const saved = await tournamentOps.saveTournament(t);
                          if (saved) {
                            setManagingTournament(saved);
                            setTournaments((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
                          }
                        }}
                        isLoading={loading}
                        canManage={canManage}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 lg:gap-8">
                      <div className="space-y-6 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h2 className="text-lg font-semibold">Your events</h2>
                          <TournamentImageUpload
                            tournaments={tournaments}
                            onImageUploaded={() => {
                              void loadTournaments();
                              setImageManagementKey((k) => k + 1);
                            }}
                            iconOnly
                          />
                        </div>
                        <TournamentList
                          tournaments={tournaments}
                          onEdit={(t) => {
                            setEditingTournament(t);
                            setDialogOpen(true);
                          }}
                          onManage={setManagingTournament}
                          onDelete={handleDeleteTournament}
                          onViewHistory={(t) => {
                            setSelectedTournamentForHistory({ id: t.id, name: t.name });
                            setHistoryDialogOpen(true);
                          }}
                          isLoading={loading}
                          canManage={canManage}
                          onCreateClick={openCreateWizard}
                        />
                      </div>

                      {/* Insight sidebar */}
                      <aside className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
                          <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-primary" />
                            Quick links
                          </h3>
                          {publicUrl && (
                            <div className="rounded-xl bg-black/30 p-3 border border-white/5">
                              <p className="text-[10px] uppercase text-muted-foreground mb-1">Public registration</p>
                              <p className="text-xs font-mono truncate text-emerald-300/90">{publicUrl}</p>
                            </div>
                          )}
                          {tvUrl && (
                            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => window.open(tvUrl, '_blank')}>
                              <Monitor className="h-4 w-4" />
                              Open TV display
                            </Button>
                          )}
                          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/tournaments/tv')}>
                            <Tv className="h-4 w-4" />
                            Staff TV fullscreen
                          </Button>
                        </div>

                        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-transparent p-5">
                          <h3 className="text-sm font-semibold text-emerald-200 mb-2">FIFA time trial tip</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Choose <strong className="text-emerald-300">Time Trial</strong> format, add players, then record lap times on the Lap board tab. Fastest lap wins — perfect for TV.
                          </p>
                        </div>
                      </aside>
                    </div>
                  )}

                  {!managingTournament && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 lg:p-6">
                      <TournamentImageManagement key={imageManagementKey} locationId={activeLocationId} />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'leaderboard' && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur p-6 lg:p-8 space-y-6">
                  <div className="flex flex-wrap justify-between gap-3 items-center">
                    <div>
                      <h2 className="text-xl font-bold">Branch leaderboard</h2>
                      <p className="text-sm text-muted-foreground">Historical winners and rankings</p>
                    </div>
                    {canResetLeaderboard && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="gap-2" disabled={resetting}>
                            <RotateCcw className="h-4 w-4" />
                            Reset
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reset leaderboard?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Permanently deletes all leaderboard entries for this branch.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={
                                canResetLeaderboard
                                  ? handleResetLeaderboard
                                  : () => requestPinVerification(handleResetLeaderboard)
                              }
                            >
                              Reset
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                  <TournamentLeaderboard />
                </div>
              )}

              {activeTab === 'tv' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {tvUrl && (
                      <Button variant="outline" className="gap-2" onClick={() => window.open(tvUrl, '_blank')}>
                        <Monitor className="h-4 w-4" />
                        Public TV (new tab)
                      </Button>
                    )}
                    <Button className="gap-2 btn-gradient" onClick={() => navigate('/tournaments/tv')}>
                      <Tv className="h-4 w-4" />
                      Staff TV fullscreen
                    </Button>
                  </div>
                  <TournamentTVDisplay locationId={activeLocationId} branchSlug={activeLocation?.slug} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <TournamentWizardDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSaveTournament}
          tournament={editingTournament ?? undefined}
          locationId={activeLocationId}
          canManage={canManage}
        />
        <TournamentHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          tournamentId={selectedTournamentForHistory?.id ?? ''}
          tournamentName={selectedTournamentForHistory?.name ?? ''}
        />
        <PinVerificationDialog
          open={showPinDialog}
          onOpenChange={handlePinCancel}
          onSuccess={handlePinSuccess}
        />
      </div>
    </TournamentMotionProvider>
  );
}
