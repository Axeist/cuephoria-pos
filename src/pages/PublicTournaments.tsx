import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PublicTournament {
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

const PublicTournaments = () => {
  const [tournaments, setTournaments] = useState<PublicTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<PublicTournament | null>(null);
  const [registrationForm, setRegistrationForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: ''
  });
  const [registering, setRegistering] = useState(false);
  const { toast } = useToast();

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching tournaments from public view...');
      const { data, error } = await supabase
        .from('tournament_public_view')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching tournaments:', error);
        return;
      }

      console.log('Raw tournament data:', data);
      
      // Transform the data to ensure proper types
      const transformedData = data.map(item => ({
        id: item.id,
        name: item.name,
        game_type: item.game_type,
        game_variant: item.game_variant,
        game_title: item.game_title,
        date: item.date,
        status: item.status,
        budget: item.budget,
        winner_prize: item.winner_prize,
        runner_up_prize: item.runner_up_prize,
        players: Array.isArray(item.players) ? item.players : [],
        matches: Array.isArray(item.matches) ? item.matches : [],
        winner: item.winner,
        total_registrations: Number(item.total_registrations) || 0,
        max_players: Number(item.max_players) || 16 // Ensure we parse as number with fallback
      }));

      console.log('Fetched tournaments with max_players:', transformedData.map(t => ({ name: t.name, max_players: t.max_players })));
      setTournaments(transformedData);
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-green-500 text-white';
      case 'in-progress':
        return 'bg-yellow-500 text-gray-800';
      case 'completed':
        return 'bg-gray-400 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getGameDisplayName = (tournament: PublicTournament) => {
    if (tournament.game_type === 'PS5') {
      return `PS5 - ${tournament.game_title}`;
    } else if (tournament.game_type === 'Pool') {
      return `Pool - ${tournament.game_variant}`;
    }
    return tournament.game_type;
  };

  const handleRegistration = async (tournament: PublicTournament) => {
    setRegistering(true);
    try {
      const { customerName, customerPhone, customerEmail } = registrationForm;

      // Basic validation
      if (!customerName || !customerPhone) {
        toast({
          title: "Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      // Call Supabase function to register
      const { data, error } = await supabase.functions.invoke('register-tournament', {
        body: {
          tournamentId: tournament.id,
          customerName: customerName,
          customerPhone: customerPhone,
          customerEmail: customerEmail,
        },
      });

      if (error) {
        console.error("Function error:", error);
        toast({
          title: "Registration Failed",
          description: error.message || "Could not register for the tournament.",
          variant: "destructive",
        });
      } else {
        console.log("Function result:", data);
        toast({
          title: "Registration Successful",
          description: "You have successfully registered for the tournament!",
        });
        // Refresh tournaments to update registration counts
        fetchTournaments();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred during registration.",
        variant: "destructive",
      });
    } finally {
      setRegistering(false);
    }
  };

  const renderTournamentCard = (tournament: PublicTournament) => {
    const availableSlots = Math.max(0, tournament.max_players - tournament.total_registrations);
    const isRegistrationFull = tournament.total_registrations >= tournament.max_players;
    
    console.log(`Tournament ${tournament.name}: max_players=${tournament.max_players}, registrations=${tournament.total_registrations}, available=${availableSlots}`);
    
    return (
      <Card key={tournament.id} className="mb-4">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-bold">{tournament.name}</CardTitle>
              <p className="text-gray-600">{getGameDisplayName(tournament)}</p>
              <p className="text-sm text-gray-500">Date: {new Date(tournament.date).toLocaleDateString()}</p>
            </div>
            <Badge className={getStatusColor(tournament.status)}>
              {tournament.status.replace('-', ' ').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="font-semibold">Registration Status:</p>
              <p className="text-lg">
                {tournament.total_registrations}/{tournament.max_players} players registered
              </p>
              {availableSlots > 0 ? (
                <p className="text-green-600">{availableSlots} slots available</p>
              ) : (
                <p className="text-red-600">Tournament is full</p>
              )}
            </div>
            
            {(tournament.winner_prize || tournament.runner_up_prize) && (
              <div>
                <p className="font-semibold">Prizes:</p>
                {tournament.winner_prize && <p>Winner: ₹{tournament.winner_prize}</p>}
                {tournament.runner_up_prize && <p>Runner-up: ₹{tournament.runner_up_prize}</p>}
              </div>
            )}
          </div>

          {tournament.status === 'upcoming' && !isRegistrationFull && (
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => setSelectedTournament(tournament)}
                  className="w-full"
                >
                  Register Now
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register for {tournament.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customerName">Full Name *</Label>
                    <Input
                      id="customerName"
                      value={registrationForm.customerName}
                      onChange={(e) => setRegistrationForm(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Phone Number *</Label>
                    <Input
                      id="customerPhone"
                      value={registrationForm.customerPhone}
                      onChange={(e) => setRegistrationForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="Enter your phone number"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Email (Optional)</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={registrationForm.customerEmail}
                      onChange={(e) => setRegistrationForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                      placeholder="Enter your email"
                    />
                  </div>
                  <div className="pt-4">
                    <p className="text-sm text-gray-600 mb-2">Entry Fee: ₹250</p>
                    <p className="text-sm text-gray-600 mb-4">
                      Available Slots: {availableSlots} of {tournament.max_players}
                    </p>
                    <Button
                      onClick={() => handleRegistration(tournament)}
                      disabled={registering || !registrationForm.customerName || !registrationForm.customerPhone}
                      className="w-full"
                    >
                      {registering ? 'Registering...' : 'Complete Registration'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {isRegistrationFull && tournament.status === 'upcoming' && (
            <Button disabled className="w-full">
              Registration Full
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <p>Loading tournaments...</p>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Public Tournaments</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map(renderTournamentCard)}
      </div>
    </div>
  );
};

export default PublicTournaments;
