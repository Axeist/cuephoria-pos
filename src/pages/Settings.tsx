import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import StaffManagement from '@/components/admin/StaffManagement';
import {
  Settings as SettingsIcon,
  Users,
  Trophy,
  Plus,
  ExternalLink,
  Award,
  RotateCcw,
  Lock,
  Calendar,
  Building2,
  CreditCard,
  MapPin,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import BranchManagementSettings from '@/components/settings/BranchManagementSettings';
import WorkspaceSettingsPanel from '@/components/settings/WorkspaceSettingsPanel';
import TournamentManagement from '@/components/tournaments/TournamentManagement';
import GeneralSettings from '@/components/settings/GeneralSettings';
import PaymentGatewaySettings from '@/components/settings/PaymentGatewaySettings';
import BookingSettings from '@/components/settings/BookingSettings';
import TournamentLeaderboard from '@/components/tournaments/TournamentLeaderboard';
import TournamentHistoryDialog from '@/components/tournaments/TournamentHistoryDialog';
import TournamentImageUpload from '@/components/tournaments/TournamentImageUpload';
import TournamentImageManagement from '@/components/tournaments/TournamentImageManagement';
import SettingsNav, { type SettingsNavGroup, type SettingsTabId } from '@/components/settings/SettingsNav';
import { Tournament } from '@/types/tournament.types';
import { generateId } from '@/utils/pos.utils';
import { useTournamentOperations } from '@/services/tournamentService';
import { useToast } from '@/components/ui/use-toast';
import TournamentList from '@/components/tournaments/TournamentList';
import { Button } from '@/components/ui/button';
import TournamentDialog from '@/components/tournaments/TournamentDialog';
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
import { supabase } from '@/integrations/supabase/client';
import { usePinVerification } from '@/hooks/usePinVerification';
import PinVerificationDialog from '@/components/PinVerificationDialog';
import { useLocation } from '@/context/LocationContext';
import { cn } from '@/lib/utils';

const SETTINGS_TABS: SettingsTabId[] = [
  'general',
  'workspace',
  'branches',
  'booking',
  'payments',
  'team',
  'tournaments',
  'leaderboard',
];

const NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        id: 'general',
        label: 'General',
        description: 'Business info, tax, receipts',
        icon: SettingsIcon,
      },
      {
        id: 'workspace',
        label: 'Workspace',
        description: 'Org name, branding, domain',
        icon: Building2,
        adminOnly: true,
      },
      {
        id: 'branches',
        label: 'Branches',
        description: 'Locations and short codes',
        icon: MapPin,
        adminOnly: true,
      },
      {
        id: 'team',
        label: 'Team',
        description: 'Staff and permissions',
        icon: Users,
        adminOnly: true,
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        id: 'booking',
        label: 'Booking',
        description: 'Coupons, add-ons, popups',
        icon: Calendar,
      },
      {
        id: 'payments',
        label: 'Payments',
        description: 'Razorpay and checkout',
        icon: CreditCard,
        adminOnly: true,
      },
    ],
  },
  {
    label: 'Community',
    items: [
      {
        id: 'tournaments',
        label: 'Tournaments',
        description: 'Brackets and winners',
        icon: Trophy,
      },
      {
        id: 'leaderboard',
        label: 'Leaderboard',
        description: 'Rankings and history',
        icon: Award,
      },
    ],
  },
];

const SECTION_META: Record<SettingsTabId, { title: string; description: string }> = {
  general: {
    title: 'General',
    description: 'Core venue configuration — business details, loyalty, tax, receipts, and POS defaults.',
  },
  workspace: {
    title: 'Workspace',
    description: 'Organization identity, public URLs, and workspace-level preferences.',
  },
  branches: {
    title: 'Branches',
    description: 'Manage locations, slugs, and branch-specific setup.',
  },
  booking: {
    title: 'Booking',
    description: 'Public booking page — coupons, pool add-ons, and promotional popups.',
  },
  payments: {
    title: 'Payments',
    description: 'Connect Razorpay so online bookings pay out to your account.',
  },
  team: {
    title: 'Team',
    description: 'Invite staff, assign roles, and control admin access.',
  },
  tournaments: {
    title: 'Tournaments',
    description: 'Create brackets, manage players, and publish winner galleries.',
  },
  leaderboard: {
    title: 'Leaderboard',
    description: 'Tournament standings and historical results for this branch.',
  },
};

function SettingsSectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-8">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">{description}</p>
    </header>
  );
}

const Settings = () => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const normalizedTab =
    tabParam === 'booking-popups' || tabParam === 'staff' || tabParam === 'cafe'
      ? tabParam === 'booking-popups'
        ? 'booking'
        : tabParam === 'staff'
          ? 'team'
          : 'general'
      : tabParam;
  const activeTab: SettingsTabId =
    normalizedTab && (SETTINGS_TABS as readonly string[]).includes(normalizedTab)
      ? (normalizedTab as SettingsTabId)
      : 'general';
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
  const tournamentOps = useTournamentOperations();
  const { toast } = useToast();
  const { showPinDialog, requestPinVerification, handlePinSuccess, handlePinCancel } = usePinVerification();
  const { activeLocationId, activeLocation } = useLocation();

  const setActiveTab = (tab: SettingsTabId) => {
    setSearchParams(tab === 'general' ? {} : { tab });
  };

  const sectionMeta = SECTION_META[activeTab];

  const handleImageUploaded = () => {
    const loadTournaments = async () => {
      try {
        const fetchedTournaments = await tournamentOps.fetchTournaments(activeLocationId);
        setTournaments(fetchedTournaments);
      } catch (error) {
        console.error('Error loading tournaments:', error);
      }
    };

    loadTournaments();
    setImageManagementKey((prev) => prev + 1);

    toast({
      title: 'Image uploaded successfully!',
      description: 'The tournament winner image has been added to the gallery.',
    });
  };

  const handleImageManagementRefresh = () => {
    setImageManagementKey((prev) => prev + 1);
  };

  useEffect(() => {
    const loadTournaments = async () => {
      setLoading(true);
      try {
        const fetchedTournaments = await tournamentOps.fetchTournaments(activeLocationId);
        setTournaments(fetchedTournaments);
      } catch (error) {
        console.error('Error loading tournaments:', error);
        toast({
          title: 'Error loading tournaments',
          description: 'Could not load tournament data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadTournaments();
  }, [activeLocationId]);

  const handleSaveTournament = async (updatedTournament: Tournament) => {
    setLoading(true);
    try {
      const savedTournament = await tournamentOps.saveTournament(updatedTournament);
      if (savedTournament) {
        setTournaments((prev) => {
          const exists = prev.some((t) => t.id === savedTournament.id);
          if (exists) {
            return prev.map((t) => (t.id === savedTournament.id ? savedTournament : t));
          }
          return [...prev, savedTournament];
        });

        setDialogOpen(false);
        setEditingTournament(null);
        setManagingTournament(savedTournament);
      }
    } catch (error) {
      console.error('Error saving tournament:', error);
      toast({
        title: 'Error saving tournament',
        description: 'Could not save tournament data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditTournament = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setDialogOpen(true);
  };

  const handleManageTournament = (tournament: Tournament) => {
    setManagingTournament(tournament);
  };

  const handleDeleteTournament = async (id: string) => {
    if (confirm('Are you sure you want to delete this tournament?')) {
      setLoading(true);
      try {
        const tournamentToDelete = tournaments.find((t) => t.id === id);
        if (tournamentToDelete) {
          const deleted = await tournamentOps.deleteTournament(id, tournamentToDelete.name);
          if (deleted) {
            setTournaments((prev) => prev.filter((t) => t.id !== id));
            if (managingTournament?.id === id) {
              setManagingTournament(null);
            }

            const refreshed = await tournamentOps.fetchTournaments(activeLocationId);
            setTournaments(refreshed);
          }
        }
      } catch (error) {
        console.error('Error deleting tournament:', error);
        toast({
          title: 'Error deleting tournament',
          description: 'Could not delete tournament. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOpenPublicTournaments = () => {
    window.open('/public/tournaments', '_blank');
  };

  const handleViewHistory = (tournament: Tournament) => {
    setSelectedTournamentForHistory({ id: tournament.id, name: tournament.name });
    setHistoryDialogOpen(true);
  };

  const handleSaveTournamentFromManagement = async (updatedTournament: Tournament) => {
    setLoading(true);
    try {
      const savedTournament = await tournamentOps.saveTournament(updatedTournament);
      if (savedTournament) {
        setTournaments((prev) => prev.map((t) => (t.id === savedTournament.id ? savedTournament : t)));
        setManagingTournament(savedTournament);
      }
    } catch (error) {
      console.error('Error saving tournament:', error);
      toast({
        title: 'Error saving tournament',
        description: 'Could not save tournament data. Please try again.',
        variant: 'destructive',
      });
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

      const { error: historyError } = await historyQuery;
      if (historyError) throw historyError;

      const { error: winnersError } = await winnersQuery;
      if (winnersError) throw winnersError;

      toast({
        title: 'Leaderboard Reset',
        description: 'All leaderboard entries have been cleared successfully.',
      });
    } catch (error) {
      console.error('Error resetting leaderboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset leaderboard. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setResetting(false);
    }
  };

  const handleResetLeaderboardWithPin = () => {
    requestPinVerification(handleResetLeaderboard);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings />;

      case 'workspace':
        return isAdmin ? <WorkspaceSettingsPanel /> : null;

      case 'branches':
        return isAdmin ? <BranchManagementSettings /> : null;

      case 'booking':
        return <BookingSettings />;

      case 'payments':
        return isAdmin ? <PaymentGatewaySettings /> : null;

      case 'team':
        return isAdmin ? <StaffManagement /> : null;

      case 'tournaments':
        return (
          <>
            {managingTournament ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-border/60 bg-card/30 p-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Managing tournament
                    </p>
                    <h3 className="text-lg font-semibold mt-0.5">{managingTournament.name}</h3>
                    <p className="text-sm text-muted-foreground">Add players and generate brackets</p>
                  </div>
                  <Button variant="outline" onClick={() => setManagingTournament(null)}>
                    Back to list
                  </Button>
                </div>

                <TournamentManagement
                  tournament={managingTournament}
                  onSave={handleSaveTournamentFromManagement}
                  isLoading={loading}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {tournaments.length} tournament{tournaments.length === 1 ? '' : 's'} for this branch
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <TournamentImageUpload
                      tournaments={tournaments}
                      onImageUploaded={handleImageUploaded}
                      iconOnly={true}
                    />
                    <Button variant="outline" onClick={handleOpenPublicTournaments} className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Public page
                    </Button>
                    <Button
                      onClick={() => {
                        const defaultTournament: Tournament = {
                          id: generateId(),
                          name: 'New Tournament',
                          gameType: 'Pool',
                          gameVariant: '8 Ball',
                          date: new Date().toISOString().split('T')[0],
                          players: [],
                          matches: [],
                          status: 'upcoming',
                          tournamentFormat: 'knockout',
                          ...(activeLocationId ? { location_id: activeLocationId } : {}),
                        };
                        setEditingTournament(defaultTournament);
                        setDialogOpen(true);
                      }}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      New tournament
                    </Button>
                  </div>
                </div>

                <TournamentList
                  tournaments={tournaments}
                  onEdit={handleEditTournament}
                  onManage={handleManageTournament}
                  onDelete={handleDeleteTournament}
                  onViewHistory={handleViewHistory}
                />

                <TournamentImageManagement key={imageManagementKey} onRefresh={handleImageManagementRefresh} />
              </div>
            )}

            <TournamentDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              onSave={handleSaveTournament}
              tournament={editingTournament}
              locationId={activeLocationId}
            />

            <TournamentHistoryDialog
              open={historyDialogOpen}
              onOpenChange={setHistoryDialogOpen}
              tournamentId={selectedTournamentForHistory?.id || ''}
              tournamentName={selectedTournamentForHistory?.name || ''}
            />
          </>
        );

      case 'leaderboard':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Rankings reflect completed tournaments at this branch.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    disabled={resetting}
                    title={!isAdmin ? 'PIN verification required for staff' : 'Reset leaderboard'}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {!isAdmin && <Lock className="h-3 w-3 text-amber-500" />}
                    {resetting ? 'Resetting…' : 'Reset leaderboard'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Leaderboard</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will permanently delete all leaderboard entries and tournament history.
                      This cannot be undone. Are you sure you want to continue?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={isAdmin ? handleResetLeaderboard : handleResetLeaderboardWithPin}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Reset Leaderboard
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <TournamentLeaderboard />
          </div>
        );

      default:
        return null;
    }
  };

  const mobileNavItems = NAV_GROUPS.flatMap((g) => g.items).filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1 max-w-lg">
              Configure your venue, booking flow, payments, and team in one place.
            </p>
          </div>
          {activeLocation && (
            <div
              className={cn(
                'inline-flex items-center gap-2.5 self-start rounded-xl border px-4 py-2 text-sm font-medium',
                activeLocation.slug === 'lite'
                  ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200'
                  : 'border-purple-400/30 bg-purple-500/10 text-purple-200',
              )}
            >
              <MapPin className="h-4 w-4 shrink-0 opacity-80" />
              <span>
                <span className="text-muted-foreground font-normal">Branch · </span>
                {activeLocation.name}
              </span>
              <span className="font-mono text-[10px] opacity-50">{activeLocation.short_code}</span>
            </div>
          )}
        </div>

        {/* Mobile nav */}
        <div className="lg:hidden mb-6 -mx-1 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1.5 px-1 pb-1 min-w-max">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors border',
                    active
                      ? 'bg-primary/15 border-primary/30 text-foreground'
                      : 'bg-muted/30 border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 shrink-0">
            <SettingsNav
              groups={NAV_GROUPS}
              activeTab={activeTab}
              onSelect={setActiveTab}
              isAdmin={isAdmin}
            />
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <div className="rounded-2xl border border-border/50 bg-card/20 p-6 sm:p-8">
              <SettingsSectionHeader title={sectionMeta.title} description={sectionMeta.description} />
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      <PinVerificationDialog
        open={showPinDialog}
        onOpenChange={handlePinCancel}
        onSuccess={handlePinSuccess}
        title="Admin Verification Required"
        description="Enter the admin PIN to perform this restricted action."
      />
    </div>
  );
};

export default Settings;
