import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import StaffManagement from '@/components/admin/StaffManagement';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings as SettingsIcon, Users, Shield, Trophy, Plus, ExternalLink, History, Award, RotateCcw, Lock, Upload, Calendar, Coffee, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import CafePartnerSettings from '@/components/cafe/CafePartnerSettings';
import TournamentManagement from '@/components/tournaments/TournamentManagement';
import GeneralSettings from '@/components/settings/GeneralSettings';
import BookingSettings from '@/components/settings/BookingSettings';
import TournamentLeaderboard from '@/components/tournaments/TournamentLeaderboard';
import TournamentHistoryDialog from '@/components/tournaments/TournamentHistoryDialog';
import TournamentImageUpload from '@/components/tournaments/TournamentImageUpload';
import TournamentImageManagement from '@/components/tournaments/TournamentImageManagement';
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

const Settings = () => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const [loading, setLoading] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [managingTournament, setManagingTournament] = useState<Tournament | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedTournamentForHistory, setSelectedTournamentForHistory] = useState<{ id: string; name: string } | null>(null);
  const [resetting, setResetting] = useState(false);
  const [imageManagementKey, setImageManagementKey] = useState(0);
  const tournamentOps = useTournamentOperations();
  const { toast } = useToast();
  const { showPinDialog, requestPinVerification, handlePinSuccess, handlePinCancel } = usePinVerification();
  const { activeLocationId, activeLocation } = useLocation();

  const handleImageUploaded = () => {
    // Refresh tournaments list if needed
    const loadTournaments = async () => {
      try {
        const fetchedTournaments = await tournamentOps.fetchTournaments(activeLocationId);
        setTournaments(fetchedTournaments);
      } catch (error) {
        console.error("Error loading tournaments:", error);
      }
    };
    
    loadTournaments();
    
    // Refresh image management component
    setImageManagementKey(prev => prev + 1);
    
    toast({
      title: "Image uploaded successfully!",
      description: "The tournament winner image has been added to the gallery.",
    });
  };

  const handleImageManagementRefresh = () => {
    setImageManagementKey(prev => prev + 1);
  };

  // Load tournaments on component mount
  useEffect(() => {
    const loadTournaments = async () => {
      setLoading(true);
      try {
        const fetchedTournaments = await tournamentOps.fetchTournaments(activeLocationId);
        setTournaments(fetchedTournaments);
      } catch (error) {
        console.error("Error loading tournaments:", error);
        toast({
          title: "Error loading tournaments",
          description: "Could not load tournament data. Please try again.",
          variant: "destructive"
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
        // Update tournaments list if this tournament already exists
        setTournaments(prev => {
          const exists = prev.some(t => t.id === savedTournament.id);
          if (exists) {
            return prev.map(t => t.id === savedTournament.id ? savedTournament : t);
          } else {
            return [...prev, savedTournament];
          }
        });
        
        // Close dialog if it was open
        setDialogOpen(false);
        setEditingTournament(null);
        
        // Open the tournament management for the saved tournament
        setManagingTournament(savedTournament);
      }
    } catch (error) {
      console.error("Error saving tournament:", error);
      toast({
        title: "Error saving tournament",
        description: "Could not save tournament data. Please try again.",
        variant: "destructive"
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
    if (confirm("Are you sure you want to delete this tournament?")) {
      setLoading(true);
      try {
        const tournamentToDelete = tournaments.find(t => t.id === id);
        if (tournamentToDelete) {
          const deleted = await tournamentOps.deleteTournament(id, tournamentToDelete.name);
          if (deleted) {
            setTournaments(prev => prev.filter(t => t.id !== id));
            // Close management if this tournament was being managed
            if (managingTournament?.id === id) {
              setManagingTournament(null);
            }
            
            // Refetch tournaments from server to confirm deletion persisted
            const refreshed = await tournamentOps.fetchTournaments(activeLocationId);
            const remainingSummaries = refreshed.map(t => ({ id: t.id, name: t.name }));
            const stillPresent = remainingSummaries.some(t => t.id === id);
            console.log('Remaining tournaments after delete:', remainingSummaries, 'Deleted ID still present:', stillPresent);
            setTournaments(refreshed);
          }
        }
      } catch (error) {
        console.error("Error deleting tournament:", error);
        toast({
          title: "Error deleting tournament",
          description: "Could not delete tournament. Please try again.",
          variant: "destructive"
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
        // Update tournaments list and managing tournament
        setTournaments(prev => prev.map(t => t.id === savedTournament.id ? savedTournament : t));
        setManagingTournament(savedTournament);
      }
    } catch (error) {
      console.error("Error saving tournament:", error);
      toast({
        title: "Error saving tournament",
        description: "Could not save tournament data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleResetLeaderboard = async () => {
    setResetting(true);
    try {
      console.log('Resetting leaderboard - deleting all entries...');
      
      // Build base queries, scoped to active location when available
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

      // Delete all tournament history entries
      const { error: historyError } = await historyQuery;
        
      if (historyError) {
        console.error('Error deleting tournament history:', historyError);
        throw historyError;
      }
      
      // Delete all tournament winner entries
      const { error: winnersError } = await winnersQuery;
        
      if (winnersError) {
        console.error('Error deleting tournament winners:', winnersError);
        throw winnersError;
      }
      
      console.log('Leaderboard reset completed successfully');
      toast({
        title: "Leaderboard Reset",
        description: "All leaderboard entries have been cleared successfully.",
      });
      
    } catch (error) {
      console.error('Error resetting leaderboard:', error);
      toast({
        title: "Error",
        description: "Failed to reset leaderboard. Please try again.",
        variant: "destructive"
      });
    } finally {
      setResetting(false);
    }
  };

  const handleResetLeaderboardWithPin = () => {
    requestPinVerification(handleResetLeaderboard);
  };
  
  return (
    <div className="container p-4 mx-auto max-w-7xl">
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your application settings and preferences.
            </p>
            <Link
              to="/settings/organization"
              className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary hover:text-primary/80"
            >
              <Building2 className="h-3.5 w-3.5" />
              Workspace &amp; subscription
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          {/* Branch badge */}
          {activeLocation && (
            <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-medium ${
              activeLocation.slug === 'lite'
                ? 'bg-cyan-500/10 border-cyan-400/30 text-cyan-200'
                : 'bg-purple-500/10 border-purple-400/30 text-purple-200'
            }`}>
              <span className={`relative flex h-2 w-2`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${
                  activeLocation.slug === 'lite' ? 'bg-cyan-400' : 'bg-purple-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  activeLocation.slug === 'lite' ? 'bg-cyan-400' : 'bg-purple-400'
                }`} />
              </span>
              Settings for <strong className="ml-1">{activeLocation.name}</strong>
              <span className="font-mono text-[10px] opacity-50 ml-1">[{activeLocation.short_code}]</span>
            </div>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="mb-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="booking" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Booking Settings
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Tournaments
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Leaderboard
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <Shield className="h-3 w-3 text-amber-500" />
              User Management
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="cafe" className="flex items-center gap-2">
              <Coffee className="h-4 w-4" />
              Cafe
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="booking" className="space-y-4">
          <BookingSettings />
        </TabsContent>
        
        <TabsContent value="tournaments" className="space-y-4">
          {managingTournament ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Managing: {managingTournament.name}</h2>
                  <p className="text-sm text-muted-foreground">Add players and generate brackets</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setManagingTournament(null)}
                >
                  Back to Tournament List
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Tournaments</h2>
                <div className="flex gap-2">
                  <TournamentImageUpload 
                    tournaments={tournaments}
                    onImageUploaded={handleImageUploaded}
                    iconOnly={true}
                  />
                  <Button 
                    variant="outline"
                    onClick={handleOpenPublicTournaments}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Public Page
                  </Button>
                  <Button 
                    onClick={() => {
                      const defaultTournament: Tournament = {
                        id: generateId(),
                        name: "New Tournament",
                        gameType: "Pool",
                        gameVariant: "8 Ball",
                        date: new Date().toISOString().split('T')[0],
                        players: [],
                        matches: [],
                        status: "upcoming",
                        tournamentFormat: "knockout",
                        ...(activeLocationId ? { location_id: activeLocationId } : {}),
                      };
                      setEditingTournament(defaultTournament);
                      setDialogOpen(true);
                    }}
                    className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Tournament
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

              <TournamentImageManagement 
                key={imageManagementKey}
                onRefresh={handleImageManagementRefresh}
              />
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
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Tournament Leaderboard</h2>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  className="flex items-center gap-2"
                  disabled={resetting}
                  title={!isAdmin ? "PIN verification required for staff" : "Reset leaderboard"}
                >
                  <RotateCcw className="h-4 w-4" />
                  {!isAdmin && <Lock className="h-3 w-3 text-amber-500" />}
                  {resetting ? 'Resetting...' : 'Reset Leaderboard'}
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
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="staff" className="space-y-4">
            <StaffManagement />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="cafe" className="space-y-4">
            <CafePartnerSettings />
          </TabsContent>
        )}
      </Tabs>

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
