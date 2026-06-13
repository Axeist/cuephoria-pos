import React, { useCallback, useEffect, useState } from 'react';
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
import TournamentDialog from '@/components/tournaments/TournamentDialog';
import TournamentManagement from '@/components/tournaments/TournamentManagement';
import TournamentLeaderboard from '@/components/tournaments/TournamentLeaderboard';
import TournamentHistoryDialog from '@/components/tournaments/TournamentHistoryDialog';
import TournamentImageUpload from '@/components/tournaments/TournamentImageUpload';
import TournamentImageManagement from '@/components/tournaments/TournamentImageManagement';
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

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'manage', label: 'Manage', icon: Trophy },
  { id: 'leaderboard', label: 'Leaderboard', icon: Award },
  { id: 'tv', label: 'TV Mode', icon: Tv },
];

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

  const publicUrl =
    activeLocation?.slug && activeLocationId
      ? buildPublicTournamentUrl({
          branchSlug: activeLocation.slug,
          locationId: activeLocationId,
        })
      : null;

  const tvUrl =
    activeLocation?.slug && activeLocationId
      ? buildPublicTournamentTVUrl({
          branchSlug: activeLocation.slug,
          locationId: activeLocationId,
        })
      : null;

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
      <AmbientTournamentBg />
      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-primary/80 text-xs uppercase tracking-widest font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Tournament hub
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
            <p className="text-muted-foreground mt-1 max-w-lg">
              Brackets, FIFA lap times, leaderboards, and TV displays for your venue.
            </p>
          </div>
          {activeLocation && (
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium',
                activeLocation.slug === 'lite'
                  ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200'
                  : 'border-purple-400/30 bg-purple-500/10 text-purple-200',
              )}
            >
              <MapPin className="h-4 w-4 shrink-0 opacity-80" />
              {activeLocation.name}
            </div>
          )}
        </motion.div>

        {/* Tab bar */}
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border transition-all',
                activeTab === id
                  ? 'bg-primary/15 border-primary/40 text-foreground shadow-[0_0_20px_-4px_var(--brand-primary-hex)]'
                  : 'border-transparent bg-muted/20 text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 'manage' && (
              <div className="space-y-6">
                {managingTournament ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Managing</p>
                        <h3 className="text-base font-semibold">{managingTournament.name}</h3>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setManagingTournament(null)}>
                        Back to list
                      </Button>
                    </div>
                    <TournamentManagement
                      tournament={managingTournament}
                      onSave={async (t) => {
                        const saved = await tournamentOps.saveTournament(t);
                        if (saved) {
                          setManagingTournament(saved);
                          setTournaments((prev) =>
                            prev.map((x) => (x.id === saved.id ? saved : x)),
                          );
                        }
                      }}
                      isLoading={loading}
                      canManage={canManage}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
                      <p className="text-sm text-muted-foreground">
                        {tournaments.length} tournament{tournaments.length === 1 ? '' : 's'} ·{' '}
                        {activeLocation?.name ?? 'this branch'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <TournamentImageUpload
                          tournaments={tournaments}
                          onImageUploaded={() => {
                            void loadTournaments();
                            setImageManagementKey((k) => k + 1);
                          }}
                          iconOnly
                        />
                        {publicUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => window.open(publicUrl, '_blank')}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Public page
                          </Button>
                        )}
                        {canManage && (
                          <Button
                            size="sm"
                            className="gap-1.5 btn-gradient"
                            onClick={() => {
                              setEditingTournament({
                                id: generateId(),
                                name: 'New Tournament',
                                gameType: 'PS5',
                                gameTitle: 'FIFA',
                                date: new Date().toISOString().split('T')[0],
                                players: [],
                                matches: [],
                                lapTimes: [],
                                status: 'upcoming',
                                tournamentFormat: 'knockout',
                                ...(activeLocationId ? { location_id: activeLocationId } : {}),
                              });
                              setDialogOpen(true);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            New tournament
                          </Button>
                        )}
                      </div>
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
                    />
                    <TournamentImageManagement key={imageManagementKey} locationId={activeLocationId} />
                  </>
                )}
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className="space-y-6 glass-card rounded-2xl border border-border/50 p-6">
                <div className="flex flex-wrap justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Rankings from completed tournaments at this branch.
                  </p>
                  {canResetLeaderboard && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-2" disabled={resetting}>
                          <RotateCcw className="h-4 w-4" />
                          {!canResetLeaderboard && <Lock className="h-3 w-3" />}
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
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => window.open(tvUrl, '_blank')}
                    >
                      <Monitor className="h-4 w-4" />
                      Open public TV display
                    </Button>
                  )}
                  <Button
                    className="gap-2 btn-gradient"
                    onClick={() => navigate('/tournaments/tv')}
                  >
                    <Tv className="h-4 w-4" />
                    Open staff TV (fullscreen)
                  </Button>
                </div>
                <TournamentTVDisplay locationId={activeLocationId} branchSlug={activeLocation?.slug} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <TournamentDialog
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
