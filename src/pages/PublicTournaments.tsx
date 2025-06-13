
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Calendar, Users, DollarSign, MapPin, Phone, Mail, UserPlus, Loader2, GamepadIcon } from 'lucide-react';
import PublicTournamentActions from '@/components/tournaments/PublicTournamentActions';

interface Tournament {
  id: string;
  name: string;
  game_type: string;
  game_variant?: string;
  game_title?: string;
  date: string;
  status: string;
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
  name: string;
  phone: string;
  email: string;
}

const PublicTournaments: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>({
    name: '',
    phone: '',
    email: ''
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTournaments();
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
          title: 'Error',
          description: 'Failed to load tournaments',
          variant: 'destructive'
        });
        return;
      }

      setTournaments(data || []);
    } catch (error) {
      console.error('Error in fetchTournaments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tournaments',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async (tournament: Tournament) => {
    if (!registrationForm.name.trim() || !registrationForm.phone.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in your name and phone number',
        variant: 'destructive'
      });
      return;
    }

    setIsRegistering(true);
    
    try {
      // Check if customer already exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .or(`phone.eq.${registrationForm.phone},email.eq.${registrationForm.email}`)
        .single();

      let customerId = null;

      if (existingCustomer) {
        // Customer exists, use existing customer
        customerId = existingCustomer.id;
        console.log('Using existing customer:', existingCustomer.name);
      } else {
        // Create new customer marked as created via tournament
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: registrationForm.name,
            phone: registrationForm.phone,
            email: registrationForm.email || null,
            created_via_tournament: true
          })
          .select()
          .single();

        if (customerError) {
          console.error('Error creating customer:', customerError);
          toast({
            title: 'Registration Failed',
            description: 'Failed to create customer record',
            variant: 'destructive'
          });
          return;
        }

        customerId = newCustomer.id;
        console.log('Created new customer via tournament:', newCustomer.name);
      }

      // Check if already registered for this tournament
      const { data: existingRegistration } = await supabase
        .from('tournament_public_registrations')
        .select('*')
        .eq('tournament_id', tournament.id)
        .eq('customer_phone', registrationForm.phone)
        .single();

      if (existingRegistration) {
        toast({
          title: 'Already Registered',
          description: 'You are already registered for this tournament',
          variant: 'destructive'
        });
        return;
      }

      // Register for tournament
      const { error: registrationError } = await supabase
        .from('tournament_public_registrations')
        .insert({
          tournament_id: tournament.id,
          customer_name: registrationForm.name,
          customer_phone: registrationForm.phone,
          customer_email: registrationForm.email || null,
          registration_source: 'public_website'
        });

      if (registrationError) {
        console.error('Error registering for tournament:', registrationError);
        toast({
          title: 'Registration Failed',
          description: 'Failed to register for tournament',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Registration Successful!',
        description: `You have been registered for ${tournament.name}`,
        variant: 'default'
      });

      // Reset form and close dialog
      setRegistrationForm({ name: '', phone: '', email: '' });
      setIsDialogOpen(false);
      
      // Refresh tournaments to update registration count
      fetchTournaments();

    } catch (error) {
      console.error('Error during registration:', error);
      toast({
        title: 'Registration Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'in-progress': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'completed': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isRegistrationOpen = (tournament: Tournament) => {
    return tournament.status === 'upcoming' && tournament.total_registrations < tournament.max_players;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Gaming Tournaments
          </h1>
          <p className="text-xl text-gray-300 mb-6">
            Join the ultimate gaming experience at Cuephoria
          </p>
          <div className="flex items-center justify-center gap-2 text-purple-300">
            <Trophy className="h-6 w-6" />
            <span className="text-lg">Compete • Win • Celebrate</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-8">
          <PublicTournamentActions />
        </div>

        {/* Tournaments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="group overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2 bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-gray-700/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                      {tournament.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <GamepadIcon className="h-4 w-4 text-purple-400" />
                      <span className="text-sm text-gray-300">
                        {tournament.game_type}
                        {tournament.game_variant && ` - ${tournament.game_variant}`}
                        {tournament.game_title && ` - ${tournament.game_title}`}
                      </span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(tournament.status)}>
                    {tournament.status.replace('-', ' ')}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="h-4 w-4 text-purple-400" />
                  <span className="text-sm">{formatDate(tournament.date)}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-300">
                  <Users className="h-4 w-4 text-purple-400" />
                  <span className="text-sm">
                    {tournament.total_registrations} / {tournament.max_players} registered
                  </span>
                </div>

                {(tournament.winner_prize || tournament.runner_up_prize) && (
                  <div className="space-y-2">
                    {tournament.winner_prize && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <DollarSign className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm">Winner: ₹{tournament.winner_prize}</span>
                      </div>
                    )}
                    {tournament.runner_up_prize && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <DollarSign className="h-4 w-4 text-orange-400" />
                        <span className="text-sm">Runner-up: ₹{tournament.runner_up_prize}</span>
                      </div>
                    )}
                  </div>
                )}

                {tournament.winner && (
                  <div className="p-3 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg border border-yellow-500/20">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm text-yellow-300 font-medium">
                        Winner: {tournament.winner.name}
                      </span>
                    </div>
                  </div>
                )}

                {isRegistrationOpen(tournament) && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                        onClick={() => setSelectedTournament(tournament)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Register Now
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-purple-300">
                          Register for {selectedTournament?.name}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label htmlFor="name" className="text-gray-300">Full Name *</Label>
                          <Input
                            id="name"
                            value={registrationForm.name}
                            onChange={(e) => setRegistrationForm(prev => ({ ...prev, name: e.target.value }))}
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="Enter your full name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone" className="text-gray-300">Phone Number *</Label>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 text-sm text-gray-400 bg-gray-800 border border-r-0 border-gray-600 rounded-l-md">
                              +91
                            </span>
                            <Input
                              id="phone"
                              value={registrationForm.phone}
                              onChange={(e) => setRegistrationForm(prev => ({ ...prev, phone: e.target.value }))}
                              className="bg-gray-800 border-gray-600 text-white rounded-l-none"
                              placeholder="Your phone number"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="email" className="text-gray-300">Email (Optional)</Label>
                          <Input
                            id="email"
                            type="email"
                            value={registrationForm.email}
                            onChange={(e) => setRegistrationForm(prev => ({ ...prev, email: e.target.value }))}
                            className="bg-gray-800 border-gray-600 text-white"
                            placeholder="your.email@example.com"
                          />
                        </div>
                        <Button
                          onClick={() => selectedTournament && handleRegistration(selectedTournament)}
                          disabled={isRegistering}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                        >
                          {isRegistering ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Registering...
                            </>
                          ) : (
                            'Complete Registration'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {!isRegistrationOpen(tournament) && tournament.status === 'upcoming' && (
                  <Button disabled className="w-full bg-gray-600 text-gray-400 cursor-not-allowed">
                    Registration Full
                  </Button>
                )}

                {tournament.status !== 'upcoming' && (
                  <Button disabled className="w-full bg-gray-600 text-gray-400 cursor-not-allowed">
                    {tournament.status === 'completed' ? 'Tournament Completed' : 'Tournament In Progress'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {tournaments.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No Tournaments Available</h3>
            <p className="text-gray-500">Check back soon for upcoming tournaments!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicTournaments;
