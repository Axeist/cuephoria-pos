
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import StaffManagement from '@/components/admin/StaffManagement';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Users, Shield, Trophy, Plus, Bell, User } from 'lucide-react';
import TournamentManagement from '@/components/tournaments/TournamentManagement';
import GeneralSettings from '@/components/settings/GeneralSettings';
import { Tournament } from '@/types/tournament.types';
import { generateId } from '@/utils/pos.utils';
import { useTournamentOperations } from '@/services/tournamentService';
import { useToast } from '@/components/ui/use-toast';
import TournamentList from '@/components/tournaments/TournamentList';
import { Button } from '@/components/ui/button';
import TournamentDialog from '@/components/tournaments/TournamentDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { notificationService } from '@/services/notificationService';
import { useCustomerNotifications } from '@/hooks/useCustomerNotifications';
import { useUserPreferences } from '@/hooks/useUserPreferences';

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
  const { preferences } = useUserPreferences();
  
  // Initialize customer notifications
  useCustomerNotifications();
  
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
        
        // Send tournament created notification
        await notificationService.sendNotification('tournament_created', {
          tournament_name: savedTournament.name,
          game_type: savedTournament.gameType
        }, true);
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
            
            // Send tournament deleted notification
            await notificationService.sendNotification('tournament_deleted', {
              tournament_name: tournamentToDelete.name
            }, true);
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
  
  const testNotification = async (type: string) => {
    console.log(`Testing notification: ${type}`);
    
    try {
      let success = false;
      
      switch (type) {
        case 'low_stock':
          success = await notificationService.notifyLowStock('Coca Cola', 3);
          break;
        case 'session_timeout':
          success = await notificationService.notifySessionTimeout('Console 1', 5);
          break;
        case 'new_customer':
          success = await notificationService.notifyNewCustomer('John Doe');
          break;
        case 'product_sold_out':
          success = await notificationService.notifyProductSoldOut('Energy Drink');
          break;
        case 'daily_report':
          success = await notificationService.notifyDailyReport(new Date().toLocaleDateString());
          break;
        default:
          console.error('Unknown notification type:', type);
          break;
      }
      
      if (success) {
        toast({
          title: "Test notification sent!",
          description: `Successfully sent ${type.replace('_', ' ')} notification.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Failed to send notification",
          description: "Please check the console for more details.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing notification:', error);
      toast({
        title: "Error sending notification",
        description: "An error occurred while testing the notification.",
        variant: "destructive"
      });
    }
  };

  const createTestCustomer = async () => {
    try {
      console.log('Creating test customer...');
      const randomName = `Test Customer ${Math.floor(Math.random() * 1000)}`;
      const randomPhone = `+1234567${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      const { data, error } = await require('@/integrations/supabase/client').supabase
        .from('customers')
        .insert([{
          name: randomName,
          phone: randomPhone,
          email: `test${Math.floor(Math.random() * 1000)}@example.com`
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating test customer:', error);
        toast({
          title: "Error creating customer",
          description: "Failed to create test customer.",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        console.log('Test customer created successfully:', data);
        toast({
          title: "Customer created!",
          description: `Test customer "${randomName}" created successfully. You should receive a notification.`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error in createTestCustomer:', error);
      toast({
        title: "Error",
        description: "An error occurred while creating the test customer.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="container p-4 mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences. Current theme: {preferences?.theme || 'loading...'}
        </p>
      </div>
      
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="mb-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Testing
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
        
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Notifications</CardTitle>
              <CardDescription>
                Test different types of notifications to see how they work. These will appear in the notification bell and as toast messages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => testNotification('low_stock')}
                  className="justify-start"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Test Low Stock Alert
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => testNotification('session_timeout')}
                  className="justify-start"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Test Session Timeout
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => testNotification('new_customer')}
                  className="justify-start"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Test New Customer
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => testNotification('product_sold_out')}
                  className="justify-start"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Test Product Sold Out
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => testNotification('daily_report')}
                  className="justify-start"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Test Daily Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Integration Testing</CardTitle>
              <CardDescription>
                Test real application features to verify notifications and integrations are working properly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="default" 
                  onClick={createTestCustomer}
                  className="justify-start"
                >
                  <User className="mr-2 h-4 w-4" />
                  Create Test Customer
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/customers'}
                  className="justify-start"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Go to Customers Page
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/pos'}
                  className="justify-start"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Go to POS System
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/products'}
                  className="justify-start"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Go to Products (Stock Management)
                </Button>
              </div>
            </CardContent>
          </Card>
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
