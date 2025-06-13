
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, TrophyIcon, UsersIcon, GamepadIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface Tournament {
  id: string;
  name: string;
  game_type: string;
  game_variant?: string;
  game_title?: string;
  date: string;
  status: string;
  winner_prize?: number;
  runner_up_prize?: number;
  max_players?: number;
  total_registrations?: number;
}

const registrationSchema = z.object({
  customer_name: z.string().min(2, 'Name must be at least 2 characters'),
  customer_phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  customer_email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const PublicTournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_email: '',
    },
  });

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
          title: "Error",
          description: "Failed to load tournaments",
          variant: "destructive"
        });
        return;
      }

      console.log('Fetched tournaments:', data);
      setTournaments(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setRegistrationOpen(true);
    form.reset();
  };

  const onSubmit = async (data: RegistrationFormData) => {
    if (!selectedTournament) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('tournament_public_registrations')
        .insert([
          {
            tournament_id: selectedTournament.id,
            customer_name: data.customer_name,
            customer_phone: data.customer_phone,
            customer_email: data.customer_email || null,
            registration_source: 'public_website',
            status: 'registered',
            entry_fee: 250
          }
        ]);

      if (error) {
        console.error('Registration error:', error);
        toast({
          title: "Registration Failed",
          description: "There was an error processing your registration. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Registration Successful!",
        description: `You have been registered for ${selectedTournament.name}. We'll contact you with further details.`,
      });

      setRegistrationOpen(false);
      setSelectedTournament(null);
      fetchTournaments(); // Refresh to update registration count
    } catch (error) {
      console.error('Unexpected error during registration:', error);
      toast({
        title: "Registration Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-500';
      case 'in-progress':
        return 'bg-orange-500';
      case 'completed':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatGameDisplay = (tournament: Tournament) => {
    if (tournament.game_type === 'PS5') {
      return `PS5 - ${tournament.game_title || 'Unknown Game'}`;
    } else if (tournament.game_type === 'Pool') {
      return `Pool - ${tournament.game_variant || 'Unknown Variant'}`;
    }
    return tournament.game_type;
  };

  // Function to get the maximum player count, with proper fallback
  const getMaxPlayers = (tournament: Tournament): number => {
    // Use max_players if available, otherwise fall back to 16
    return tournament.max_players || 16;
  };

  // Function to get current registrations, with proper fallback
  const getCurrentRegistrations = (tournament: Tournament): number => {
    return tournament.total_registrations || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading tournaments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">🏆 Gaming Tournaments</h1>
          <p className="text-gray-300 text-lg">Join exciting gaming tournaments and compete for amazing prizes!</p>
        </div>

        {tournaments.length === 0 ? (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 max-w-md mx-auto">
              <TrophyIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Tournaments Available</h3>
              <p className="text-gray-300">Check back later for upcoming tournaments!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => {
              const maxPlayers = getMaxPlayers(tournament);
              const currentRegistrations = getCurrentRegistrations(tournament);
              const isRegistrationFull = currentRegistrations >= maxPlayers;
              
              return (
                <Card key={tournament.id} className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/15 transition-all duration-300">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-xl font-bold">{tournament.name}</CardTitle>
                      <Badge className={`${getStatusColor(tournament.status)} text-white`}>
                        {tournament.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <GamepadIcon className="h-4 w-4" />
                      <span className="text-sm">{formatGameDisplay(tournament)}</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-300">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{new Date(tournament.date).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-300">
                      <UsersIcon className="h-4 w-4" />
                      <span>
                        {currentRegistrations}/{maxPlayers} Players
                        {isRegistrationFull && <span className="text-red-400 ml-2">(Full)</span>}
                      </span>
                    </div>
                    
                    {tournament.winner_prize && (
                      <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-lg p-3">
                        <div className="text-yellow-400 font-semibold">Prize Pool</div>
                        <div className="text-white">Winner: ₹{tournament.winner_prize}</div>
                        {tournament.runner_up_prize && (
                          <div className="text-gray-300">Runner-up: ₹{tournament.runner_up_prize}</div>
                        )}
                      </div>
                    )}
                    
                    {tournament.status === 'upcoming' && !isRegistrationFull && (
                      <Button 
                        onClick={() => handleRegister(tournament)}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                      >
                        Register Now - ₹250
                      </Button>
                    )}
                    
                    {tournament.status === 'upcoming' && isRegistrationFull && (
                      <Button disabled className="w-full bg-gray-600 text-gray-300">
                        Registration Full
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={registrationOpen} onOpenChange={setRegistrationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register for {selectedTournament?.name}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="customer_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="customer_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Entry Fee:</strong> ₹250 per participant
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Payment will be collected at the venue before the tournament starts.
                </p>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRegistrationOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Registering...' : 'Register'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicTournaments;
