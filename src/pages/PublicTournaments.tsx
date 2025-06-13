
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trophy, Calendar, Users, Crown, Medal, ChevronDown, ChevronUp, Gamepad2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tournament } from '@/types/tournament.types';
import { convertFromSupabaseTournament } from '@/types/tournament.types';
import { toast } from 'sonner';
import PublicTournamentHistory from '@/components/tournaments/PublicTournamentHistory';

const PublicTournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [registrationData, setRegistrationData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: ''
  });

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

      const convertedTournaments = data.map(convertFromSupabaseTournament);
      setTournaments(convertedTournaments);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!selectedTournament || !registrationData.customerName || !registrationData.customerPhone) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('tournament_public_registrations')
        .insert({
          tournament_id: selectedTournament.id,
          customer_name: registrationData.customerName,
          customer_phone: registrationData.customerPhone,
          customer_email: registrationData.customerEmail || null,
          entry_fee: 250,
          registration_source: 'public_website'
        });

      if (error) {
        console.error('Registration error:', error);
        toast.error('Failed to register for tournament');
        return;
      }

      toast.success('Successfully registered for the tournament!');
      setRegisterDialogOpen(false);
      setRegistrationData({ customerName: '', customerPhone: '', customerEmail: '' });
      setSelectedTournament(null);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register for tournament');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'in-progress': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'completed': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const calculateTotalPrizePool = (tournament: Tournament) => {
    let total = 0;
    if (tournament.winnerPrize) total += tournament.winnerPrize;
    if (tournament.runnerUpPrize) total += tournament.runnerUpPrize;
    return total;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cuephoria-dark via-gray-900 to-black p-4">
        <div className="container mx-auto max-w-6xl">
          <div className="animate-pulse space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-cuephoria-grey/20 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cuephoria-dark via-gray-900 to-black p-4">
      <div className="container mx-auto max-w-6xl space-y-6">
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-purple bg-clip-text text-transparent">
            Tournament Central
          </h1>
          <p className="text-cuephoria-grey text-lg md:text-xl max-w-2xl mx-auto">
            Join the ultimate gaming competitions and prove your skills against the best players.
          </p>
        </div>

        {tournaments.length === 0 ? (
          <Card className="bg-cuephoria-dark/80 border-cuephoria-lightpurple/30">
            <CardContent className="p-12 text-center">
              <Trophy className="h-16 w-16 text-cuephoria-lightpurple mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">No Tournaments Available</h3>
              <p className="text-cuephoria-grey">Check back soon for upcoming tournaments!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {tournaments.map((tournament) => (
              <Card key={tournament.id} className="bg-cuephoria-dark/80 border-cuephoria-lightpurple/30 hover:border-cuephoria-lightpurple/60 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-cuephoria-lightpurple text-xl md:text-2xl">
                          {tournament.name}
                        </CardTitle>
                        <Badge className={`${getStatusColor(tournament.status)} border`}>
                          {tournament.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-cuephoria-grey">
                        <div className="flex items-center gap-1">
                          <Gamepad2 className="h-4 w-4" />
                          <span>{tournament.gameType} - {tournament.gameVariant}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(tournament.date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{tournament.players.length}/{tournament.maxPlayers || 16} registered</span>
                        </div>
                      </div>
                    </div>
                    
                    {tournament.status === 'upcoming' && (
                      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            className="bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:from-cuephoria-lightpurple hover:to-cuephoria-purple transition-all duration-300"
                            onClick={() => setSelectedTournament(tournament)}
                          >
                            Register Now
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-cuephoria-dark border-cuephoria-lightpurple/30">
                          <DialogHeader>
                            <DialogTitle className="text-cuephoria-lightpurple">Register for Tournament</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="name" className="text-white">Full Name *</Label>
                              <Input
                                id="name"
                                value={registrationData.customerName}
                                onChange={(e) => setRegistrationData({...registrationData, customerName: e.target.value})}
                                className="bg-cuephoria-grey/20 border-cuephoria-lightpurple/30 text-white"
                                placeholder="Enter your full name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="phone" className="text-white">Phone Number *</Label>
                              <Input
                                id="phone"
                                value={registrationData.customerPhone}
                                onChange={(e) => setRegistrationData({...registrationData, customerPhone: e.target.value})}
                                className="bg-cuephoria-grey/20 border-cuephoria-lightpurple/30 text-white"
                                placeholder="Enter your phone number"
                              />
                            </div>
                            <div>
                              <Label htmlFor="email" className="text-white">Email (Optional)</Label>
                              <Input
                                id="email"
                                type="email"
                                value={registrationData.customerEmail}
                                onChange={(e) => setRegistrationData({...registrationData, customerEmail: e.target.value})}
                                className="bg-cuephoria-grey/20 border-cuephoria-lightpurple/30 text-white"
                                placeholder="Enter your email address"
                              />
                            </div>
                            <div className="bg-cuephoria-grey/10 p-3 rounded-lg">
                              <div className="flex items-center gap-2 text-green-400">
                                <MapPin className="h-4 w-4" />
                                <span className="font-medium">Entry Fee: ₹250 (Pay at venue)</span>
                              </div>
                            </div>
                            <Button 
                              onClick={handleRegister}
                              className="w-full bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:from-cuephoria-lightpurple hover:to-cuephoria-purple"
                            >
                              Confirm Registration
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(tournament.winnerPrize || tournament.runnerUpPrize) && (
                      <div className="bg-gradient-to-r from-yellow-900/40 to-yellow-800/20 p-4 rounded-lg border border-yellow-400/40">
                        <div className="flex items-center gap-2 mb-3">
                          <Trophy className="h-5 w-5 text-yellow-400" />
                          <span className="font-semibold text-yellow-400">Prize Pool</span>
                        </div>
                        <div className="space-y-2">
                          {tournament.winnerPrize && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4 text-yellow-400" />
                                <span className="text-white">Winner:</span>
                              </div>
                              <span className="font-bold text-yellow-400">₹{tournament.winnerPrize.toLocaleString()}</span>
                            </div>
                          )}
                          {tournament.runnerUpPrize && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Medal className="h-4 w-4 text-gray-400" />
                                <span className="text-white">Runner-up:</span>
                              </div>
                              <span className="font-bold text-gray-400">₹{tournament.runnerUpPrize.toLocaleString()}</span>
                            </div>
                          )}
                          {(tournament.winnerPrize || tournament.runnerUpPrize) && (
                            <div className="border-t border-yellow-400/20 pt-2 mt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-yellow-400 font-semibold">Total Pool:</span>
                                <span className="font-bold text-yellow-400 text-lg">₹{calculateTotalPrizePool(tournament).toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {tournament.winner && (
                      <div className="bg-gradient-to-r from-green-900/40 to-green-800/20 p-4 rounded-lg border border-green-400/40">
                        <div className="flex items-center gap-2 mb-3">
                          <Crown className="h-5 w-5 text-green-400" />
                          <span className="font-semibold text-green-400">Tournament Results</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-yellow-400" />
                            <span className="text-white">Champion:</span>
                            <span className="font-bold text-yellow-400">{tournament.winner.name}</span>
                          </div>
                          {tournament.runnerUp && (
                            <div className="flex items-center gap-2">
                              <Medal className="h-4 w-4 text-gray-400" />
                              <span className="text-white">Runner-up:</span>
                              <span className="font-bold text-gray-400">{tournament.runnerUp.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {tournament.matches.length > 0 && (
                    <div className="border-t border-cuephoria-lightpurple/20 pt-4">
                      <Button
                        variant="ghost"
                        onClick={() => setExpandedTournament(expandedTournament === tournament.id ? null : tournament.id)}
                        className="w-full text-cuephoria-lightpurple hover:text-white hover:bg-cuephoria-lightpurple/20"
                      >
                        <span>View Tournament History</span>
                        {expandedTournament === tournament.id ? (
                          <ChevronUp className="ml-2 h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                      
                      {expandedTournament === tournament.id && (
                        <div className="mt-4">
                          <PublicTournamentHistory 
                            tournamentId={tournament.id}
                            tournamentName={tournament.name}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicTournaments;
