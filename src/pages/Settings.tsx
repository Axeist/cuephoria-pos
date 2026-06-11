import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/context/PermissionsContext';
import { SETTINGS_TAB_PERMISSIONS } from '@/constants/permissionCatalog';
import TeamManagement from '@/components/admin/TeamManagement';
import {
  Store,
  Users,
  Trophy,
  Plus,
  ExternalLink,
  Award,
  RotateCcw,
  Lock,
  CalendarCheck,
  CreditCard,
  MapPin,
  Palette,
  ShieldCheck,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import BranchManagementSettings from '@/components/settings/BranchManagementSettings';
import WorkspaceBrandingPanel from '@/components/settings/WorkspaceBrandingPanel';
import WorkspaceSubscriptionPanel from '@/components/settings/WorkspaceSubscriptionPanel';
import OrganizationSettings from '@/pages/OrganizationSettings';
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
  'branding',
  'subscription',
  'branches',
  'booking',
  'payments',
  'team',
  'tournaments',
  'leaderboard',
];

const LEGACY_TAB_ALIASES: Record<string, SettingsTabId> = {
  workspace: 'branding',
  organization: 'branding',
};

const NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: 'Your venue',
    items: [
      {
        id: 'general',
        label: 'Business & POS',
        description: 'Company info, receipts, tax, loyalty',
        icon: Store,
      },
      {
        id: 'branches',
        label: 'Locations',
        description: 'Branches and short codes',
        icon: MapPin,
        permissionKey: 'settings.branches.view',
      },
      {
        id: 'booking',
        label: 'Online booking',
        description: 'Coupons, add-ons, popups',
        icon: CalendarCheck,
        permissionKey: 'bookings.view',
      },
    ],
  },
  {
    label: 'Account & billing',
    items: [
      {
        id: 'branding',
        label: 'Branding',
        description: 'Logo, colors, public look',
        icon: Palette,
        permissionKey: 'settings.branding.view',
      },
      {
        id: 'subscription',
        label: 'Subscription',
        description: 'Plan and billing cycle',
        icon: ShieldCheck,
        permissionKey: 'settings.subscription.view',
      },
      {
        id: 'payments',
        label: 'Payments',
        description: 'Razorpay for online checkout',
        icon: CreditCard,
        permissionKey: 'settings.payments.view',
      },
    ],
  },
  {
    label: 'People',
    items: [
      {
        id: 'team',
        label: 'Team members',
        description: 'Staff logins and access',
        icon: Users,
        permissionKey: 'settings.team.view',
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
        permissionKey: 'settings.tournaments.view',
      },
      {
        id: 'leaderboard',
        label: 'Leaderboard',
        description: 'Rankings and history',
        icon: Award,
        permissionKey: 'settings.tournaments.view',
      },
    ],
  },
];

const SECTION_META: Record<SettingsTabId, { title: string; description: string }> = {
  general: {
    title: 'Business & POS',
    description: 'Company identity plus branch settings for receipts, tax, loyalty, and in-store payments.',
  },
  branding: {
    title: 'Branding',
    description: 'Logo, colors, and display name on login, receipts, and your public booking page.',
  },
  subscription: {
    title: 'Subscription',
    description: 'Your Cuetronix plan, trial status, and billing cycle.',
  },
  branches: {
    title: 'Locations',
    description: 'Add and manage physical branches. Each location has its own booking link and settings.',
  },
  booking: {
    title: 'Online booking',
    description: 'Coupons, pool add-ons, and promotional popups on your public booking page.',
  },
  payments: {
    title: 'Payments',
    description: 'Connect Razorpay so online bookings pay out to your account.',
  },
  team: {
    title: 'Team members',
    description: 'Invite staff, assign branches, and manage admin access.',
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
    <header className="mb-6">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">{description}</p>
    </header>
  );
}

const Settings = () => {
  const { user } = useAuth();
  const { can, bypass } = usePermissions();
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
      : tabParam && LEGACY_TAB_ALIASES[tabParam]
        ? LEGACY_TAB_ALIASES[tabParam]
        : tabParam;
  const activeTab: SettingsTabId =
    normalizedTab && (SETTINGS_TABS as readonly string[]).includes(normalizedTab)
      ? (normalizedTab as SettingsTabId)
      : 'general';

  const setActiveTab = (tab: SettingsTabId) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true },
    );
  };

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

  const canAccessSettingsItem = (item: { adminOnly?: boolean; permissionKey?: string; id: SettingsTabId }) => {
    if (bypass) return true;
    const key = item.permissionKey ?? SETTINGS_TAB_PERMISSIONS[item.id];
    if (key) return can(key);
    if (item.adminOnly) return isAdmin;
    return true;
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
    if (!canAccessSettingsItem({ id: activeTab, label: '', icon: Store })) {
      return (
        <p className="text-sm text-muted-foreground">
          You do not have permission to view this settings section.
        </p>
      );
    }

    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6 -mt-2">
            {can('settings.branding.view') && <OrganizationSettings embedded section="identity" />}
            <GeneralSettings />
          </div>
        );

      case 'branding':
        return can('settings.branding.view') ? <WorkspaceBrandingPanel /> : null;

      case 'subscription':
        return can('settings.subscription.view') ? <WorkspaceSubscriptionPanel /> : null;

      case 'branches':
        return can('settings.branches.view') ? <BranchManagementSettings /> : null;

      case 'booking':
        return can('bookings.view') ? <BookingSettings /> : null;

      case 'payments':
        return can('settings.payments.view') ? <PaymentGatewaySettings /> : null;

      case 'team':
        return can('settings.team.view') ? <TeamManagement /> : null;

      case 'tournaments':
        return can('settings.tournaments.view') ? (
          <div className="space-y-6 -mt-2">
            {managingTournament ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Managing
                    </p>
                    <h3 className="text-base font-semibold">{managingTournament.name}</h3>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setManagingTournament(null)}>
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
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    {tournaments.length} tournament{tournaments.length === 1 ? '' : 's'} ·{' '}
                    {activeLocation?.name ?? 'this branch'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <TournamentImageUpload
                      tournaments={tournaments}
                      onImageUploaded={handleImageUploaded}
                      iconOnly={true}
                    />
                    <Button variant="outline" size="sm" onClick={handleOpenPublicTournaments} className="gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Public page
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
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
                    >
                      <Plus className="h-3.5 w-3.5" />
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

                <details className="rounded-xl border border-border/60 bg-background/40 group">
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium flex items-center justify-between">
                    Winner gallery
                    <span className="text-xs text-muted-foreground font-normal group-open:hidden">Expand</span>
                  </summary>
                  <div className="border-t border-border/50 p-4">
                    <TournamentImageManagement
                      key={imageManagementKey}
                      onRefresh={handleImageManagementRefresh}
                    />
                  </div>
                </details>
              </>
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
          </div>
        ) : null;

      case 'leaderboard':
        return can('settings.tournaments.view') ? (
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
                    title={!canResetLeaderboard ? 'PIN verification required for staff' : 'Reset leaderboard'}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {!canResetLeaderboard && <Lock className="h-3 w-3 text-amber-500" />}
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
                      onClick={canResetLeaderboard ? handleResetLeaderboard : handleResetLeaderboardWithPin}
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
        ) : null;

      default:
        return null;
    }
  };

  const canResetLeaderboard = can('settings.leaderboard.reset');

  const mobileNavItems = NAV_GROUPS.flatMap((g) => g.items).filter((item) =>
    canAccessSettingsItem(item),
  );

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1 max-w-lg">
              Everything for your venue, team, and online checkout — organized by what you need to do.
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
              canAccess={canAccessSettingsItem}
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
