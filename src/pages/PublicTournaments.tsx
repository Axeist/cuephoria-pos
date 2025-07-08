import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Trophy, 
  Calendar, 
  Users, 
  GamepadIcon, 
  MapPin, 
  Phone, 
  Mail, 
  ExternalLink, 
  Star,
  Crown,
  Medal,
  Award,
  ImageIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import PublicTournamentHistory from '@/components/tournaments/PublicTournamentHistory';
import PublicLeaderboard from '@/components/tournaments/PublicLeaderboard';
import TournamentImageGallery from '@/components/tournaments/TournamentImageGallery';

interface Tournament {
  id: string;
  name: string;
  game_type: string;
  game_variant?: string;
  date: string;
  status: string;
  max_players?: number;
  winner_prize?: number;
  runner_up_prize?: number;
  budget?: number;
  players: any[];
  matches: any[];
  winner?: any;
  runner_up?: any;
  total_registrations?: number;
}

interface RegistrationForm {
  name: string;
  phone: string;
  email: string;
}

const PublicTournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>({
    name: '',
    phone: '',
    email: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_public_view')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching tournaments:', error);
        return;
      }

      // Convert the data to match Tournament interface
      const convertedTournaments: Tournament[] = (data || []).map(item => ({
        id: item.id || '',
        name: item.name || '',
        game_type: item.game_type || '',
        game_variant: item.game_variant || undefined,
        date: item.date || '',
        status: item.status || 'upcoming',
        max_players: item.max_players || undefined,
        winner_prize: item.winner_prize || undefined,
        runner_up_prize: item.runner_up_prize || undefined,
        budget: item.budget || undefined,
        players: Array.isArray(item.players) ? item.players : [],
        matches: Array.isArray(item.matches) ? item.matches : [],
        winner: item.winner || undefined,
        runner_up: item.runner_up || undefined,
        total_registrations: item.total_registrations || undefined
      }));

      setTournaments(convertedTournaments);
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setRegistrationOpen(true);
  };

  const submitRegistration = async () => {
    if (!selectedTournament || !registrationForm.name || !registrationForm.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('tournament_public_registrations')
        .insert({
          tournament_id: selectedTournament.id,
          customer_name: registrationForm.name,
          customer_phone: registrationForm.phone,
          customer_email: registrationForm.email || null,
          entry_fee: 250,
          status: 'registered'
        });

      if (error) {
        console.error('Registration error:', error);
        toast({
          title: "Registration Failed",
          description: "Could not register for the tournament. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Registration Successful!",
        description: "You have been registered for the tournament. We'll contact you soon.",
      });

      setRegistrationOpen(false);
      setRegistrationForm({ name: '', phone: '', email: '' });
      fetchTournaments();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Registration Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-600';
      case 'ongoing': return 'bg-green-600';
      case 'completed': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cuephoria-dark via-cuephoria-darkpurple to-cuephoria-dark text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cuephoria-lightpurple"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cuephoria-dark via-cuephoria-darkpurple to-cuephoria-dark text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-cuephoria-lightpurple/20 to-cuephoria-blue/20 border-b border-cuephoria-lightpurple/30">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue mb-4 relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cuephoria-lightpurple/30 to-cuephoria-blue/30 animate-ping"></div>
              <Trophy className="h-8 w-8 text-white relative z-10" />
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue">
              Cuephoria Tournaments
            </h1>
            <p className="text-xl text-cuephoria-grey max-w-2xl mx-auto">
              Join competitive gaming tournaments and showcase your skills against the best players
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="tournaments" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 bg-cuephoria-dark/50 border border-cuephoria-lightpurple/30">
            <TabsTrigger 
              value="tournaments" 
              className="flex items-center gap-2 data-[state=active]:bg-cuephoria-lightpurple data-[state=active]:text-white"
            >
              <Trophy className="h-4 w-4" />
              Tournaments
            </TabsTrigger>
            <TabsTrigger 
              value="leaderboard" 
              className="flex items-center gap-2 data-[state=active]:bg-cuephoria-lightpurple data-[state=active]:text-white"
            >
              <Award className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger 
              value="gallery" 
              className="flex items-center gap-2 data-[state=active]:bg-cuephoria-lightpurple data-[state=active]:text-white"
            >
              <ImageIcon className="h-4 w-4" />
              Gallery
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="flex items-center gap-2 data-[state=active]:bg-cuephoria-lightpurple data-[state=active]:text-white"
            >
              <Calendar className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tournaments" className="space-y-6">
            {tournaments.length === 0 ? (
              <Card className="bg-cuephoria-dark/80 border-cuephoria-lightpurple/30">
                <CardContent className="p-12 text-center">
                  <Trophy className="h-16 w-16 text-cuephoria-lightpurple mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold text-cuephoria-lightpurple mb-2">No Active Tournaments</h3>
                  <p className="text-cuephoria-grey">
                    New tournaments will be announced soon. Stay tuned!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tournaments.map((tournament) => (
                  <Card 
                    key={tournament.id} 
                    className="bg-gradient-to-br from-cuephoria-dark/90 to-cuephoria-darkpurple/50 border-cuephoria-lightpurple/30 hover:border-cuephoria-lightpurple/60 transition-all duration-300 hover:shadow-2xl hover:shadow-cuephoria-lightpurple/20 hover:-translate-y-1"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-cuephoria-lightpurple text-lg font-bold">
                          {tournament.name}
                        </CardTitle>
                        <Badge className={`${getStatusColor(tournament.status)} text-white text-xs px-2 py-1`}>
                          {tournament.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-cuephoria-grey">
                          <GamepadIcon className="h-4 w-4" />
                          <span className="text-sm">
                            {tournament.game_type} {tournament.game_variant && `• ${tournament.game_variant}`}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-cuephoria-grey">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">{formatDate(tournament.date)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-cuephoria-grey">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">
                            {tournament.total_registrations || 0} / {tournament.max_players || 16} players
                          </span>
                        </div>
                      </div>

                      {(tournament.winner_prize || tournament.runner_up_prize) && (
                        <div className="bg-cuephoria-lightpurple/10 p-3 rounded-lg border border-cuephoria-lightpurple/20">
                          <h4 className="text-cuephoria-lightpurple font-semibold text-sm mb-2">Prize Pool</h4>
                          <div className="space-y-1 text-sm">
                            {tournament.winner_prize && (
                              <div className="flex items-center gap-2">
                                <Crown className="h-3 w-3 text-yellow-400" />
                                <span className="text-cuephoria-grey">Winner: ₹{tournament.winner_prize}</span>
                              </div>
                            )}
                            {tournament.runner_up_prize && (
                              <div className="flex items-center gap-2">
                                <Medal className="h-3 w-3 text-gray-400" />
                                <span className="text-cuephoria-grey">Runner-up: ₹{tournament.runner_up_prize}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {tournament.winner && (
                        <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 p-3 rounded-lg border border-yellow-500/30">
                          <div className="flex items-center gap-2 mb-1">
                            <Crown className="h-4 w-4 text-yellow-400" />
                            <span className="text-yellow-300 font-semibold text-sm">Champion</span>
                          </div>
                          <p className="text-white font-bold">{tournament.winner.name}</p>
                          {tournament.runner_up && (
                            <p className="text-gray-300 text-sm mt-1">
                              Runner-up: {tournament.runner_up.name}
                            </p>
                          )}
                        </div>
                      )}

                      {tournament.status === 'upcoming' && (
                        <Button 
                          onClick={() => handleRegistration(tournament)}
                          className="w-full bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue hover:from-cuephoria-lightpurple/90 hover:to-cuephoria-blue/90 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-cuephoria-lightpurple/30"
                        >
                          Register Now • ₹250
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-6">
            <PublicLeaderboard />
          </TabsContent>

          <TabsContent value="gallery" className="space-y-6">
            <TournamentImageGallery />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <PublicTournamentHistory />
          </TabsContent>
        </Tabs>

        {/* Contact Section */}
        <div className="mt-16 text-center">
          <Card className="bg-cuephoria-dark/80 border-cuephoria-lightpurple/30">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-cuephoria-lightpurple mb-4">Get in Touch</h3>
              <p className="text-cuephoria-grey mb-6">
                Have questions about tournaments or want to organize a private event?
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <div className="flex items-center gap-2 text-cuephoria-grey">
                  <Phone className="h-4 w-4" />
                  <span>+91 12345 67890</span>
                </div>
                <div className="flex items-center gap-2 text-cuephoria-grey">
                  <Mail className="h-4 w-4" />
                  <span>tournaments@cuephoria.in</span>
                </div>
                <div className="flex items-center gap-2 text-cuephoria-grey">
                  <MapPin className="h-4 w-4" />
                  <span>Cuephoria Gaming Arena</span>
                </div>
              </div>
              <div className="mt-6">
                <Button 
                  onClick={() => window.open('https://cuephoria.in/book', '_blank')}
                  className="bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue hover:from-cuephoria-lightpurple/90 hover:to-cuephoria-blue/90 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-cuephoria-lightpurple/30"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Book Your Gaming Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Registration Dialog */}
      <Dialog open={registrationOpen} onOpenChange={setRegistrationOpen}>
        <DialogContent className="bg-cuephoria-dark border-cuephoria-lightpurple/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-cuephoria-lightpurple">
              Register for {selectedTournament?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-cuephoria-grey">Full Name *</Label>
              <Input
                id="name"
                value={registrationForm.name}
                onChange={(e) => setRegistrationForm(prev => ({ ...prev, name: e.target.value }))}
                className="bg-cuephoria-dark border-cuephoria-grey/30 text-white focus:border-cuephoria-lightpurple"
                placeholder="Enter your full name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-cuephoria-grey">Phone Number *</Label>
              <Input
                id="phone"
                value={registrationForm.phone}
                onChange={(e) => setRegistrationForm(prev => ({ ...prev, phone: e.target.value }))}
                className="bg-cuephoria-dark border-cuephoria-grey/30 text-white focus:border-cuephoria-lightpurple"
                placeholder="Enter your phone number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-cuephoria-grey">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={registrationForm.email}
                onChange={(e) => setRegistrationForm(prev => ({ ...prev, email: e.target.value }))}
                className="bg-cuephoria-dark border-cuephoria-grey/30 text-white focus:border-cuephoria-lightpurple"
                placeholder="Enter your email address"
              />
            </div>
            
            <div className="bg-cuephoria-lightpurple/10 p-3 rounded-lg border border-cuephoria-lightpurple/20">
              <p className="text-cuephoria-lightpurple font-semibold">Entry Fee: ₹250</p>
              <p className="text-cuephoria-grey text-sm mt-1">
                Payment can be made at the venue on the tournament day
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setRegistrationOpen(false)}
                className="flex-1 border-cuephoria-grey/30 text-cuephoria-grey hover:bg-cuephoria-grey/10"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={submitRegistration}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue hover:from-cuephoria-lightpurple/90 hover:to-cuephoria-blue/90 text-white font-semibold"
              >
                {submitting ? 'Registering...' : 'Register'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicTournaments;
