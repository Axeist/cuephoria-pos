import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Users, Calendar, GamepadIcon, Crown, Medal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Tournament {
  id: string;
  name: string;
  game_type: 'PS5' | 'Pool';
  game_variant?: string;
  game_title?: string;
  date: string;
  status: 'upcoming' | 'in-progress' | 'completed';
  budget?: number;
  winner_prize?: number;
  runner_up_prize?: number;
  players: any[];
  matches: any[];
  winner?: any;
  total_registrations: number;
  max_players: number;
}

interface RegistrationForm {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
}

const PublicTournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>({
    customer_name: '',
    customer_phone: '',
    customer_email: ''
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTournaments();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('tournament-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournaments'
      }, () => {
        fetchTournaments();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tournament_public_registrations'
      }, () => {
        fetchTournaments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_public_view')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching tournaments:', error);
        toast({
          title: "Error",
          description: "Failed to load tournaments. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Transform the data to match our Tournament interface
      const transformedData: Tournament[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        game_type: item.game_type as 'PS5' | 'Pool',
        game_variant: item.game_variant,
        game_title: item.game_title,
        date: item.date,
        status: item.status as 'upcoming' | 'in-progress' | 'completed',
        budget: item.budget,
        winner_prize: item.winner_prize,
        runner_up_prize: item.runner_up_prize,
        players: Array.isArray(item.players) ? item.players : [],
        matches: Array.isArray(item.matches) ? item.matches : [],
        winner: item.winner,
        total_registrations: Number(item.total_registrations) || 0,
        max_players: item.max_players || 8
      }));

      setTournaments(transformedData);
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async () => {
    if (!selectedTournament) return;

    // Validate form
    if (!registrationForm.customer_name.trim() || !registrationForm.customer_phone.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsRegistering(true);

    try {
      const { error } = await supabase
        .from('tournament_public_registrations')
        .insert({
          tournament_id: selectedTournament.id,
          customer_name: registrationForm.customer_name.trim(),
          customer_phone: registrationForm.customer_phone.trim(),
          customer_email: registrationForm.customer_email.trim() || null,
          registration_source: 'public_website',
          status: 'registered'
        });

      if (error) {
        console.error('Registration error:', error);
        toast({
          title: "Registration Failed",
          description: "Failed to register for tournament. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Registration Successful!",
        description: `You have been registered for ${selectedTournament.name}. We'll contact you with more details.`,
      });

      // Reset form and close dialog
      setRegistrationForm({
        customer_name: '',
        customer_phone: '',
        customer_email: ''
      });
      setIsDialogOpen(false);
      setSelectedTournament(null);

      // Refresh tournaments to update registration count
      fetchTournaments();
    } catch (error) {
      console.error('Unexpected registration error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500';
      case 'in-progress': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'PS5': return <GamepadIcon className="h-5 w-5" />;
      case 'Pool': return <Trophy className="h-5 w-5" />;
      default: return <Trophy className="h-5 w-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const canRegister = (tournament: Tournament) => {
    return tournament.status === 'upcoming' && 
           tournament.total_registrations < tournament.max_players;
  };

  const filterTournaments = (status: string) => {
    return tournaments.filter(t => t.status === status);
  };

  const TournamentCard = ({ tournament }: { tournament: Tournament }) => (
    <Card className="w-full bg-cuephoria-dark border-cuephoria-lightpurple/20 hover:border-cuephoria-lightpurple/40 transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-cuephoria-lightpurple flex items-center gap-2">
            {getGameIcon(tournament.game_type)}
            {tournament.name}
          </CardTitle>
          <Badge className={`${getStatusColor(tournament.status)} text-white`}>
            {tournament.status.replace('-', ' ')}
          </Badge>
        </div>
        <div className="text-sm text-cuephoria-grey">
          {tournament.game_type === 'Pool' && tournament.game_variant && (
            <span>{tournament.game_variant} • </span>
          )}
          {tournament.game_type === 'PS5' && tournament.game_title && (
            <span>{tournament.game_title} • </span>
          )}
          <Calendar className="inline h-4 w-4 mr-1" />
          {formatDate(tournament.date)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Registration Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cuephoria-grey">
            <Users className="h-4 w-4" />
            <span className="text-sm">
              {tournament.total_registrations}/{tournament.max_players} registered
            </span>
          </div>
          <div className="w-full max-w-[120px] bg-cuephoria-grey/20 rounded-full h-2 ml-3">
            <div 
              className="bg-cuephoria-lightpurple h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min((tournament.total_registrations / tournament.max_players) * 100, 100)}%` 
              }}
            />
          </div>
        </div>

        {/* Prizes */}
        {tournament.winner_prize && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-yellow-400">
              <Crown className="h-4 w-4" />
              <span>Winner: ₹{tournament.winner_prize}</span>
            </div>
            {tournament.runner_up_prize && (
              <div className="flex items-center gap-2 text-gray-400">
                <Medal className="h-4 w-4" />
                <span>Runner-up: ₹{tournament.runner_up_prize}</span>
              </div>
            )}
          </div>
        )}

        {/* Winner Display for Completed Tournaments */}
        {tournament.status === 'completed' && tournament.winner && (
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-400 font-semibold">
              <Crown className="h-5 w-5" />
              <span>Champion: {tournament.winner.name}</span>
            </div>
          </div>
        )}

        {/* Registration Button */}
        {canRegister(tournament) && (
          <Dialog open={isDialogOpen && selectedTournament?.id === tournament.id} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="w-full bg-cuephoria-lightpurple hover:bg-cuephoria-lightpurple/90 text-white font-semibold"
                onClick={() => setSelectedTournament(tournament)}
              >
                Register Now
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-cuephoria-dark border-cuephoria-lightpurple/20 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-cuephoria-lightpurple">
                  Register for {tournament.name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-cuephoria-grey">Name *</Label>
                  <Input
                    id="name"
                    value={registrationForm.customer_name}
                    onChange={(e) => setRegistrationForm(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="bg-cuephoria-dark border-cuephoria-grey/20 text-white"
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-cuephoria-grey">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={registrationForm.customer_phone}
                    onChange={(e) => setRegistrationForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                    className="bg-cuephoria-dark border-cuephoria-grey/20 text-white"
                    placeholder="Enter your phone number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-cuephoria-grey">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={registrationForm.customer_email}
                    onChange={(e) => setRegistrationForm(prev => ({ ...prev, customer_email: e.target.value }))}
                    className="bg-cuephoria-dark border-cuephoria-grey/20 text-white"
                    placeholder="Enter your email address"
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-sm text-blue-400">
                    Entry Fee: ₹250 (to be paid at the venue)
                  </p>
                </div>
                
                <Button 
                  onClick={handleRegistration}
                  disabled={isRegistering}
                  className="w-full bg-cuephoria-lightpurple hover:bg-cuephoria-lightpurple/90"
                >
                  {isRegistering ? 'Registering...' : 'Confirm Registration'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {tournament.status === 'upcoming' && tournament.total_registrations >= tournament.max_players && (
          <Button disabled className="w-full">
            Tournament Full
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-cuephoria-dark flex items-center justify-center">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cuephoria-dark text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-darkpurple p-6 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Cuephoria Tournaments</h1>
        <p className="text-cuephoria-grey text-lg">Join the ultimate gaming experience</p>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-cuephoria-dark border border-cuephoria-lightpurple/20">
            <TabsTrigger 
              value="upcoming" 
              className="data-[state=active]:bg-cuephoria-lightpurple data-[state=active]:text-white"
            >
              Upcoming ({filterTournaments('upcoming').length})
            </TabsTrigger>
            <TabsTrigger 
              value="in-progress"
              className="data-[state=active]:bg-cuephoria-lightpurple data-[state=active]:text-white"
            >
              Live ({filterTournaments('in-progress').length})
            </TabsTrigger>
            <TabsTrigger 
              value="completed"
              className="data-[state=active]:bg-cuephoria-lightpurple data-[state=active]:text-white"
            >
              Completed ({filterTournaments('completed').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterTournaments('upcoming').length > 0 ? (
                filterTournaments('upcoming').map(tournament => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))
              ) : (
                <div className="col-span-full text-center text-cuephoria-grey py-12">
                  <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-xl">No upcoming tournaments</p>
                  <p className="text-sm mt-2">Check back soon for new tournaments!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="in-progress" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterTournaments('in-progress').length > 0 ? (
                filterTournaments('in-progress').map(tournament => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))
              ) : (
                <div className="col-span-full text-center text-cuephoria-grey py-12">
                  <GamepadIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-xl">No live tournaments</p>
                  <p className="text-sm mt-2">Tournaments will appear here when they start!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterTournaments('completed').length > 0 ? (
                filterTournaments('completed').map(tournament => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))
              ) : (
                <div className="col-span-full text-center text-cuephoria-grey py-12">
                  <Crown className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-xl">No completed tournaments</p>
                  <p className="text-sm mt-2">Previous tournament results will show here!</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PublicTournaments;
