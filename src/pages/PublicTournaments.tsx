
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Users, Calendar, GamepadIcon, Crown, Medal, Clock, RefreshCcw, Phone, Mail, MapPin, Wifi, Star } from 'lucide-react';
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
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [timeToNextRefresh, setTimeToNextRefresh] = useState(30);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setRefreshing(true);
      await fetchTournaments();
      setTimeout(() => {
        setRefreshing(false);
        setLastRefresh(new Date());
        setTimeToNextRefresh(30);
      }, 300);
    };

    fetchData();
    
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

    // Set up auto-refresh interval
    const refreshInterval = setInterval(fetchData, 30000);
    
    // Set up countdown timer
    const countdownInterval = setInterval(() => {
      setTimeToNextRefresh(prev => {
        if (prev <= 1) return 30;
        return prev - 1;
      });
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
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
    <Card className="w-full bg-gradient-to-br from-cuephoria-dark via-cuephoria-dark to-cuephoria-darkpurple/20 border-cuephoria-lightpurple/30 hover:border-cuephoria-lightpurple/60 transition-all duration-500 hover:shadow-2xl hover:shadow-cuephoria-lightpurple/20 hover:-translate-y-2 hover:scale-[1.02] group overflow-hidden relative">
      {/* Animated glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cuephoria-lightpurple/10 to-transparent animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cuephoria-lightpurple/30 rounded-full animate-float opacity-0 group-hover:opacity-100"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-cuephoria-lightpurple flex items-center gap-2 group-hover:text-white transition-colors">
            <div className="p-2 rounded-lg bg-cuephoria-lightpurple/20 group-hover:bg-cuephoria-lightpurple/40 transition-all group-hover:scale-110">
              {getGameIcon(tournament.game_type)}
            </div>
            {tournament.name}
          </CardTitle>
          <Badge className={`${getStatusColor(tournament.status)} text-white animate-pulse-soft shadow-lg`}>
            {tournament.status.replace('-', ' ')}
          </Badge>
        </div>
        <div className="text-sm text-cuephoria-grey flex items-center gap-2 mt-2">
          {tournament.game_type === 'Pool' && tournament.game_variant && (
            <span className="bg-cuephoria-purple/20 px-2 py-1 rounded-full text-xs">{tournament.game_variant}</span>
          )}
          {tournament.game_type === 'PS5' && tournament.game_title && (
            <span className="bg-cuephoria-blue/20 px-2 py-1 rounded-full text-xs">{tournament.game_title}</span>
          )}
          <div className="flex items-center gap-1 text-cuephoria-lightpurple">
            <Calendar className="h-4 w-4" />
            {formatDate(tournament.date)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 relative z-10">
        {/* Registration Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cuephoria-grey">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">
                {tournament.total_registrations}/{tournament.max_players} registered
              </span>
            </div>
            <div className="text-xs text-cuephoria-lightpurple font-semibold">
              {Math.round((tournament.total_registrations / tournament.max_players) * 100)}%
            </div>
          </div>
          <div className="w-full bg-cuephoria-grey/20 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue h-3 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
              style={{ 
                width: `${Math.min((tournament.total_registrations / tournament.max_players) * 100, 100)}%` 
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
        </div>

        {/* Prize Pool */}
        {tournament.winner_prize && (
          <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-lg p-4 space-y-2">
            <h4 className="text-yellow-400 font-semibold flex items-center gap-2">
              <Star className="h-4 w-4 animate-pulse" />
              Prize Pool
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-yellow-300">
                <Crown className="h-4 w-4" />
                <span className="text-sm">Winner: ₹{tournament.winner_prize}</span>
              </div>
              {tournament.runner_up_prize && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Medal className="h-4 w-4" />
                  <span className="text-sm">Runner-up: ₹{tournament.runner_up_prize}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Winner Display for Completed Tournaments */}
        {tournament.status === 'completed' && tournament.winner && (
          <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border border-yellow-400/40 rounded-lg p-4 animate-pulse-soft">
            <div className="flex items-center gap-2 text-yellow-400 font-semibold">
              <Crown className="h-5 w-5 animate-bounce" />
              <span>Champion: {tournament.winner.name}</span>
            </div>
          </div>
        )}

        {/* Entry Fee Information */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <p className="text-sm text-blue-300 flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Entry Fee: ₹250 (Pay at venue)
          </p>
        </div>

        {/* Registration Button */}
        {canRegister(tournament) && (
          <Dialog open={isDialogOpen && selectedTournament?.id === tournament.id} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="w-full bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue hover:from-cuephoria-lightpurple/90 hover:to-cuephoria-blue/90 text-white font-semibold py-3 transition-all duration-300 hover:shadow-xl hover:shadow-cuephoria-lightpurple/30 hover:scale-[1.02] group"
                onClick={() => setSelectedTournament(tournament)}
              >
                <Trophy className="mr-2 h-4 w-4 group-hover:animate-bounce" />
                Register Now
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-cuephoria-dark border-cuephoria-lightpurple/30 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-cuephoria-lightpurple flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
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
                    className="bg-cuephoria-dark border-cuephoria-grey/30 text-white focus:border-cuephoria-lightpurple"
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-cuephoria-grey">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={registrationForm.customer_phone}
                    onChange={(e) => setRegistrationForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                    className="bg-cuephoria-dark border-cuephoria-grey/30 text-white focus:border-cuephoria-lightpurple"
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
                    className="bg-cuephoria-dark border-cuephoria-grey/30 text-white focus:border-cuephoria-lightpurple"
                    placeholder="Enter your email address"
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-sm text-blue-300">
                    Entry Fee: ₹250 (to be paid at the venue)
                  </p>
                </div>
                
                <Button 
                  onClick={handleRegistration}
                  disabled={isRegistering}
                  className="w-full bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue hover:from-cuephoria-lightpurple/90 hover:to-cuephoria-blue/90"
                >
                  {isRegistering ? 'Registering...' : 'Confirm Registration'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {tournament.status === 'upcoming' && tournament.total_registrations >= tournament.max_players && (
          <Button disabled className="w-full bg-gray-600 text-gray-300">
            Tournament Full
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cuephoria-dark via-black to-cuephoria-darkpurple flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-md flex flex-col items-center justify-center animate-fade-in">
          <div className="w-32 h-32 mb-8 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue opacity-20 animate-ping"></div>
            <img 
              src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" 
              alt="Cuephoria Logo" 
              className="animate-float z-10 relative"
            />
          </div>
          
          <div className="text-center space-y-4 animate-fade-in flex flex-col items-center">
            <div className="relative flex justify-center items-center">
              <div className="w-20 h-20 border-t-4 border-cuephoria-lightpurple border-solid rounded-full animate-spin"></div>
              <div className="w-16 h-16 border-t-4 border-r-4 border-transparent border-solid rounded-full border-r-cuephoria-purple absolute animate-spin-slow"></div>
            </div>
            
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue animate-text-gradient mt-4">
              Loading Tournaments...
            </h2>
            <p className="text-cuephoria-grey">Getting the latest tournament information</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cuephoria-dark via-black to-cuephoria-darkpurple text-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-cuephoria-lightpurple/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${4 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      {/* Header with enhanced design */}
      <header className="relative py-12 px-4 sm:px-6 md:px-8 animate-fade-in">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center mb-12">
            <div className="mb-8 animate-float relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue opacity-30 blur-xl animate-pulse"></div>
              <img 
                src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" 
                alt="Cuephoria Logo" 
                className="h-32 relative z-10 shadow-2xl shadow-cuephoria-lightpurple/40"
              />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-center font-heading bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-lightpurple via-cuephoria-blue to-cuephoria-purple animate-text-gradient mb-4">
              Epic Tournaments
            </h1>
            <p className="text-xl md:text-2xl text-cuephoria-grey max-w-3xl text-center leading-relaxed">
              Join the ultimate gaming experience with high-stakes competitions and amazing prizes
            </p>
            
            {/* Data freshness indicator */}
            <div className="mt-6 bg-black/40 backdrop-blur-md rounded-full px-6 py-3 flex items-center space-x-3 border border-cuephoria-lightpurple/30 shadow-lg shadow-cuephoria-lightpurple/20">
              <div className={`w-3 h-3 rounded-full ${refreshing ? 'bg-orange-400 animate-pulse' : 'bg-green-400'}`}></div>
              <div className="text-sm text-cuephoria-grey flex items-center space-x-2">
                {refreshing ? (
                  <span className="flex items-center">
                    <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                    <span>Refreshing data...</span>
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Auto-refresh in {timeToNextRefresh}s</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Enhanced stats summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 max-w-5xl mx-auto mb-12">
            <div className="bg-gradient-to-br from-cuephoria-purple/40 to-cuephoria-purple/10 backdrop-blur-md p-6 rounded-2xl border border-cuephoria-purple/30 animate-scale-in hover:scale-105 transition-all duration-300" style={{animationDelay: '100ms'}}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-cuephoria-grey">Total Tournaments</div>
                <Trophy className="h-6 w-6 text-cuephoria-lightpurple" />
              </div>
              <div className="text-3xl font-bold text-white">{tournaments.length}</div>
              <div className="text-xs text-green-400 mt-1">Active competitions</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-900/40 to-green-900/10 backdrop-blur-md p-6 rounded-2xl border border-green-800/30 animate-scale-in hover:scale-105 transition-all duration-300" style={{animationDelay: '200ms'}}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-cuephoria-grey">Open for Registration</div>
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white">
                {filterTournaments('upcoming').length}
              </div>
              <div className="text-xs text-green-400 mt-1">Join now!</div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-900/10 backdrop-blur-md p-6 rounded-2xl border border-blue-800/30 animate-scale-in hover:scale-105 transition-all duration-300" style={{animationDelay: '300ms'}}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-cuephoria-grey">Total Prize Pool</div>
                <Crown className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-white">
                ₹{tournaments.reduce((total, t) => total + (t.winner_prize || 0), 0).toLocaleString()}
              </div>
              <div className="text-xs text-yellow-400 mt-1">Win big rewards!</div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content with enhanced transition effects */}
      <main className="py-8 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto transition-all duration-500 ease-in-out relative z-10" 
        style={{ 
          opacity: refreshing ? 0.7 : 1,
          transform: refreshing ? 'scale(0.99)' : 'scale(1)'
        }}>
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-cuephoria-dark/80 backdrop-blur-md border border-cuephoria-lightpurple/30 rounded-xl p-1 mb-8">
            <TabsTrigger 
              value="upcoming" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cuephoria-lightpurple data-[state=active]:to-cuephoria-blue data-[state=active]:text-white rounded-lg transition-all duration-300"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Upcoming ({filterTournaments('upcoming').length})
            </TabsTrigger>
            <TabsTrigger 
              value="in-progress"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cuephoria-lightpurple data-[state=active]:to-cuephoria-blue data-[state=active]:text-white rounded-lg transition-all duration-300"
            >
              <GamepadIcon className="h-4 w-4 mr-2" />
              Live ({filterTournaments('in-progress').length})
            </TabsTrigger>
            <TabsTrigger 
              value="completed"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cuephoria-lightpurple data-[state=active]:to-cuephoria-blue data-[state=active]:text-white rounded-lg transition-all duration-300"
            >
              <Crown className="h-4 w-4 mr-2" />
              Completed ({filterTournaments('completed').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filterTournaments('upcoming').length > 0 ? (
                filterTournaments('upcoming').map((tournament, index) => (
                  <div 
                    key={tournament.id}
                    className="animate-scale-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <TournamentCard tournament={tournament} />
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-cuephoria-grey py-16">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 rounded-full bg-cuephoria-lightpurple/20 animate-ping"></div>
                    <Trophy className="h-20 w-20 mx-auto opacity-50 relative z-10" />
                  </div>
                  <p className="text-2xl font-semibold mb-2">No upcoming tournaments</p>
                  <p className="text-lg">Check back soon for new competitions!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="in-progress" className="mt-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filterTournaments('in-progress').length > 0 ? (
                filterTournaments('in-progress').map((tournament, index) => (
                  <div 
                    key={tournament.id}
                    className="animate-scale-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <TournamentCard tournament={tournament} />
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-cuephoria-grey py-16">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping"></div>
                    <GamepadIcon className="h-20 w-20 mx-auto opacity-50 relative z-10 animate-pulse" />
                  </div>
                  <p className="text-2xl font-semibold mb-2">No live tournaments</p>
                  <p className="text-lg">Tournaments will appear here when they start!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filterTournaments('completed').length > 0 ? (
                filterTournaments('completed').map((tournament, index) => (
                  <div 
                    key={tournament.id}
                    className="animate-scale-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <TournamentCard tournament={tournament} />
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-cuephoria-grey py-16">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 rounded-full bg-yellow-500/20 animate-ping"></div>
                    <Crown className="h-20 w-20 mx-auto opacity-50 relative z-10" />
                  </div>
                  <p className="text-2xl font-semibold mb-2">No completed tournaments</p>
                  <p className="text-lg">Previous tournament results will show here!</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Enhanced Footer with contact details */}
      <footer className="py-12 px-4 sm:px-6 md:px-8 border-t border-cuephoria-lightpurple/20 mt-12 backdrop-blur-md bg-cuephoria-dark/50 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Logo and description */}
            <div className="text-center md:text-left">
              <img 
                src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
                alt="Cuephoria Logo" 
                className="h-12 mb-4 mx-auto md:mx-0" 
              />
              <p className="text-cuephoria-grey text-sm leading-relaxed">
                The ultimate gaming destination offering premium PlayStation 5 gaming and professional pool tables with tournament-level competition.
              </p>
            </div>
            
            {/* Contact Information */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-cuephoria-lightpurple mb-4">Contact Us</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-cuephoria-grey hover:text-white transition-colors">
                  <Phone className="h-4 w-4 text-cuephoria-lightpurple" />
                  <span className="text-sm">+91 98765 43210</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-cuephoria-grey hover:text-white transition-colors">
                  <Mail className="h-4 w-4 text-cuephoria-lightpurple" />
                  <span className="text-sm">tournaments@cuephoria.com</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-cuephoria-grey hover:text-white transition-colors">
                  <MapPin className="h-4 w-4 text-cuephoria-lightpurple" />
                  <span className="text-sm">Gaming District, Tech City</span>
                </div>
              </div>
            </div>
            
            {/* Features */}
            <div className="text-center md:text-right">
              <h3 className="text-lg font-semibold text-cuephoria-lightpurple mb-4">Features</h3>
              <div className="space-y-2 text-sm text-cuephoria-grey">
                <div className="flex items-center justify-center md:justify-end gap-2">
                  <Wifi className="h-4 w-4 text-green-400" />
                  <span>High-Speed Gaming Network</span>
                </div>
                <div className="flex items-center justify-center md:justify-end gap-2">
                  <Trophy className="h-4 w-4 text-yellow-400" />
                  <span>Professional Equipment</span>
                </div>
                <div className="flex items-center justify-center md:justify-end gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span>Real-time Updates</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom footer */}
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-cuephoria-lightpurple/10">
            <p className="text-cuephoria-grey text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} Cuephoria. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center text-cuephoria-grey">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span>Live Updates</span>
              </div>
              <div className="flex items-center text-cuephoria-grey">
                <Clock className="h-4 w-4 mr-1" />
                <span>Auto-refresh: 30s</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicTournaments;
