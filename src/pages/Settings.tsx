
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import StaffManagement from '@/components/admin/StaffManagement';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings as SettingsIcon, Users, Shield, Trophy, Plus } from 'lucide-react';
import TournamentManagement from '@/components/tournaments/TournamentManagement';
import GeneralSettings from '@/components/settings/GeneralSettings';
import { Tournament } from '@/types/tournament.types';
import { generateId } from '@/utils/pos.utils';
import { useTournamentOperations } from '@/services/tournamentService';
import { useToast } from '@/components/ui/use-toast';
import TournamentList from '@/components/tournaments/TournamentList';
import { Button } from '@/components/ui/button';
import TournamentDialog from '@/components/tournaments/TournamentDialog';

const Settings = () => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const [loading, setLoading] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const tournamentOps = useTournamentOperations();
  const { toast } = useToast();
  
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
          {isAdmin && (
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
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
          
          <TournamentList 
            tournaments={tournaments}
            onEdit={handleEditTournament}
            onDelete={handleDeleteTournament}
          />
          
          <TournamentDialog 
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onSave={handleSaveTournament}
            tournament={editingTournament}
          />
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="staff" className="space-y-4">
            <StaffManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;
