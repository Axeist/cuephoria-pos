
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Calendar, GamepadIcon, Phone, Mail, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TournamentRegistrationDialog from '@/components/tournaments/TournamentRegistrationDialog';

interface TournamentData {
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
  total_registrations: number;
  max_players: number;
}

const PublicTournaments: React.FC = () => {
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<TournamentData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch tournaments from the public view
  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_public_view')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching tournaments:', error);
        toast({
          title: "Error loading tournaments",
          description: "Could not load tournament data. Please try again.",
          variant: "destructive"
        });
        return;
      }

      setTournaments(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    fetchTournaments();

    // Subscribe to tournament changes
    const tournamentChannel = supabase
      .channel('tournament-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments'
        },
        () => {
          console.log('Tournament data changed, refreshing...');
          fetchTournaments();
        }
      )
      .subscribe();

    // Subscribe to registration changes
    const registrationChannel = supabase
      .channel('registration-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_public_registrations'
        },
        () => {
          console.log('Registration data changed, refreshing...');
          fetchTournaments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tournamentChannel);
      supabase.removeChannel(registrationChannel);
    };
  }, []);

  const handleRegister = (tournament: TournamentData) => {
    setSelectedTournament(tournament);
    setDialogOpen(true);
  };

  const getGameTypeIcon = (gameType: string) => {
    return gameType === 'PS5' ? <GamepadIcon className="h-5 w-5" /> : <Trophy className="h-5 w-5" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-green-500';
      case 'in-progress': return 'bg-yellow-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isRegistrationFull = (tournament: TournamentData) => {
    return tournament.total_registrations >= tournament.max_players;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading tournaments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header Section */}
      <div className="bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <Trophy className="h-12 w-12 text-yellow-400" />
              <h1 className="text-4xl md:text-6xl font-bold text-white font-heading">
                CuePhoria
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-purple-200 font-medium">
              Gaming Tournaments & Championships
            </p>
            <p className="text-lg text-purple-300 max-w-2xl mx-auto">
              Join exciting tournaments, compete with fellow gamers, and win amazing prizes!
            </p>
          </div>
        </div>
      </div>

      {/* Contact Information Banner */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-8 text-white">
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-purple-300" />
              <span className="text-sm">+91 98765 43210</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-purple-300" />
              <span className="text-sm">tournaments@cuephoria.com</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-purple-300" />
              <span className="text-sm">Gaming Arena, Tech City</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {tournaments.length === 0 ? (
          <div className="text-center text-white space-y-4">
            <Trophy className="h-24 w-24 text-purple-300 mx-auto" />
            <h2 className="text-2xl font-bold">No Active Tournaments</h2>
            <p className="text-purple-200">
              Check back soon for upcoming tournaments and competitions!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Active Tournaments
              </h2>
              <p className="text-purple-200 text-lg">
                Register now and secure your spot in the competition!
              </p>
            </div>

            <div className="grid gap-6 md:gap-8">
              {tournaments.map((tournament) => (
                <Card 
                  key={tournament.id} 
                  className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] shadow-xl"
                >
                  <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                      <div className="space-y-2">
                        <CardTitle className="text-2xl md:text-3xl text-white font-bold flex items-center space-x-3">
                          {getGameTypeIcon(tournament.game_type)}
                          <span>{tournament.name}</span>
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={`${getStatusColor(tournament.status)} text-white`}>
                            {tournament.status.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-purple-200 border-purple-300">
                            {tournament.game_type}
                            {tournament.game_variant && ` - ${tournament.game_variant}`}
                            {tournament.game_title && ` - ${tournament.game_title}`}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-lg font-semibold">
                          <Calendar className="h-5 w-5 inline mr-2" />
                          {formatDate(tournament.date)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Registration Status */}
                    <div className="bg-black/20 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2 text-white">
                          <Users className="h-5 w-5" />
                          <span className="font-medium">Registration Status</span>
                        </div>
                        <div className="text-white font-bold">
                          {tournament.total_registrations} / {tournament.max_players}
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-700 rounded-full h-3 mb-3">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min((tournament.total_registrations / tournament.max_players) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      
                      {isRegistrationFull(tournament) ? (
                        <div className="text-red-400 font-medium text-center">
                          🔒 Registration Full
                        </div>
                      ) : (
                        <div className="text-green-400 font-medium text-center">
                          ✅ {tournament.max_players - tournament.total_registrations} spots remaining
                        </div>
                      )}
                    </div>

                    {/* Prize Information */}
                    {(tournament.winner_prize || tournament.runner_up_prize) && (
                      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-400/30">
                        <h4 className="text-yellow-400 font-bold text-lg mb-3 text-center">
                          🏆 Prize Pool
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {tournament.winner_prize && (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-white">
                                ₹{tournament.winner_prize.toLocaleString()}
                              </div>
                              <div className="text-yellow-300">Winner</div>
                            </div>
                          )}
                          {tournament.runner_up_prize && (
                            <div className="text-center">
                              <div className="text-xl font-bold text-white">
                                ₹{tournament.runner_up_prize.toLocaleString()}
                              </div>
                              <div className="text-yellow-300">Runner-up</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Registration Button */}
                    <div className="flex justify-center">
                      <Button
                        onClick={() => handleRegister(tournament)}
                        disabled={isRegistrationFull(tournament) || tournament.status !== 'upcoming'}
                        className={`
                          w-full md:w-auto px-8 py-3 text-lg font-bold rounded-xl transition-all duration-300
                          ${isRegistrationFull(tournament) || tournament.status !== 'upcoming'
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:scale-105 shadow-lg'
                          }
                        `}
                      >
                        {isRegistrationFull(tournament) 
                          ? 'Registration Full' 
                          : tournament.status !== 'upcoming'
                            ? 'Registration Closed'
                            : 'Register Now'
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-black/40 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-white">
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Trophy className="h-6 w-6 text-yellow-400" />
              <span className="text-xl font-bold">CuePhoria</span>
            </div>
            <p className="text-purple-200">
              The ultimate destination for gaming tournaments and competitions
            </p>
            <div className="text-sm text-purple-300">
              © 2024 CuePhoria. All rights reserved.
            </div>
          </div>
        </div>
      </div>

      {/* Registration Dialog */}
      {selectedTournament && (
        <TournamentRegistrationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          tournament={selectedTournament}
          onRegistrationSuccess={() => {
            fetchTournaments();
            setDialogOpen(false);
            setSelectedTournament(null);
          }}
        />
      )}
    </div>
  );
};

export default PublicTournaments;
