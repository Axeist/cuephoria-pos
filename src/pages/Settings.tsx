
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import StaffManagement from '@/components/admin/StaffManagement';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings as SettingsIcon, Users, Shield, Trophy, Plus, ExternalLink, History, Award, RotateCcw, Lock } from 'lucide-react';
import TournamentManagement from '@/components/tournaments/TournamentManagement';
import GeneralSettings from '@/components/settings/GeneralSettings';
import TournamentLeaderboard from '@/components/tournaments/TournamentLeaderboard';
import TournamentHistoryDialog from '@/components/tournaments/TournamentHistoryDialog';
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

const Settings = () => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const [loading, setLoading] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedTournamentForHistory, setSelectedTournamentForHistory] = useState<{ id: string; name: string } | null>(null);
  const [resetting, setResetting] = useState(false);
  const tournamentOps = useTournamentOperations();
  const { toast } = useToast();
  const { showPinDialog, requestPinVerification, handlePinSuccess, handlePinCancel } = usePinVerification();
  
  // Load tournaments on component mount
  useEffect(() => {
    const loadTournaments = async () => {
      setLoading(true);
      try {
        const fetchedTournaments = await tournamentOps.fetchTournaments();
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
  }, []);
  
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
  
  const handleDeleteTournament = async (id: string) => {
    if (confirm("Are you sure you want to delete this tournament?")) {
      setLoading(true);
      try {
        const tournamentToDelete = tournaments.find(t => t.id === id);
        if (tournamentToDelete) {
          const deleted = await tournamentOps.deleteTournament(id, tournamentToDelete.name);
          if (deleted) {
            setTournaments(prev => prev.filter(t => t.id !== id));
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
  
  const handleResetLeaderboard = async () => {
    setResetting(true);
    try {
      console.log('Resetting leaderboard - deleting all entries...');
      
      // Delete all tournament history entries
      const { error: historyError } = await supabase
        .from('tournament_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
        
      if (historyError) {
        console.error('Error deleting tournament history:', historyError);
        throw historyError;
      }
      
      // Delete all tournament winner entries
      const { error: winnersError } = await supabase
        .from('tournament_winners')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
        
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences.
        </p>
      </div>
      
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="mb-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            General
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
              Staff Management
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <GeneralSettings />
        </TabsContent>
        
        <TabsContent value="tournaments" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Tournaments</h2>
            <div className="flex gap-2">
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
                    status: "upcoming"
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
            onDelete={handleDeleteTournament}
            onViewHistory={handleViewHistory}
          />
          
          <TournamentDialog 
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onSave={handleSaveTournament}
            tournament={editingTournament}
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
