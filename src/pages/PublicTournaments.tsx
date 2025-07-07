
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Trophy, Users, MapPin, Phone, Mail, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import Logo from '@/components/Logo';
import TournamentImageGallery from '@/components/tournaments/TournamentImageGallery';

interface Tournament {
  id: string;
  name: string;
  game_type: string;
  game_variant: string | null;
  date: string;
  status: string;
  winner: any;
  runner_up: any;
  winner_prize: number | null;
  runner_up_prize: number | null;
  players: any[];
  matches: any[];
  total_registrations: number;
  max_players: number | null;
}

const PublicTournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

        setTournaments(data || []);
      } catch (error) {
        console.error('Error loading tournaments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'upcoming': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cuephoria-dark via-cuephoria-darker to-cuephoria-dark">
      {/* Header */}
      <div className="bg-cuephoria-darker/80 backdrop-blur-sm border-b border-cuephoria-purple/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Logo />
              <div>
                <h1 className="text-2xl font-bold gradient-text font-heading">Cuephoria Tournaments</h1>
                <p className="text-cuephoria-lightpurple text-sm">Public Tournament Information</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="border-cuephoria-purple hover:bg-cuephoria-purple/20"
              onClick={() => window.open('/', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Main Site
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Tournament Gallery Section */}
        <TournamentImageGallery />

        {/* Tournaments Section */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">Tournament History</h2>
            <p className="text-muted-foreground">Our competitive gaming events</p>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="bg-cuephoria-dark border-cuephoria-purple/20 animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-cuephoria-purple/20 rounded mb-2"></div>
                    <div className="h-4 bg-cuephoria-purple/10 rounded w-2/3"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-4 bg-cuephoria-purple/10 rounded"></div>
                      <div className="h-4 bg-cuephoria-purple/10 rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-cuephoria-purple mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Tournaments Yet</h3>
              <p className="text-muted-foreground">Check back soon for upcoming tournaments!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament) => (
                <Card key={tournament.id} className="bg-cuephoria-dark border-cuephoria-purple/20 hover:border-cuephoria-purple/40 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg text-white">{tournament.name}</CardTitle>
                      <Badge className={`${getStatusColor(tournament.status)} text-white`}>
                        {tournament.status}
                      </Badge>
                    </div>
                    <div className="flex items-center text-cuephoria-lightpurple text-sm">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(tournament.date)}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-cuephoria-blue font-medium">
                        {tournament.game_type}
                        {tournament.game_variant && ` - ${tournament.game_variant}`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Users className="h-4 w-4 mr-1" />
                        {tournament.total_registrations || tournament.players?.length || 0}
                        {tournament.max_players && ` / ${tournament.max_players}`} players
                      </div>
                    </div>

                    {tournament.status === 'completed' && tournament.winner && (
                      <div className="bg-cuephoria-darker rounded-lg p-3 border border-gold/20">
                        <div className="flex items-center text-gold mb-1">
                          <Trophy className="h-4 w-4 mr-1" />
                          <span className="text-sm font-semibold">Champion</span>
                        </div>
                        <p className="text-white font-medium">{tournament.winner.name}</p>
                        {tournament.winner_prize && (
                          <p className="text-xs text-cuephoria-lightpurple">
                            Prize: ₹{tournament.winner_prize}
                          </p>
                        )}
                      </div>
                    )}

                    {tournament.status === 'completed' && tournament.runner_up && (
                      <div className="bg-cuephoria-darker rounded-lg p-3 border border-gray-400/20">
                        <div className="flex items-center text-gray-400 mb-1">
                          <Trophy className="h-4 w-4 mr-1" />
                          <span className="text-sm font-semibold">Runner-up</span>
                        </div>
                        <p className="text-white font-medium">{tournament.runner_up.name}</p>
                        {tournament.runner_up_prize && (
                          <p className="text-xs text-cuephoria-lightpurple">
                            Prize: ₹{tournament.runner_up_prize}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Contact Information */}
        <div className="bg-cuephoria-dark rounded-lg p-8 border border-cuephoria-purple/20">
          <h3 className="text-2xl font-bold mb-6 text-center">Get In Touch</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <MapPin className="h-8 w-8 text-cuephoria-lightpurple mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Visit Us</h4>
              <p className="text-sm text-muted-foreground">
                Your Gaming Destination<br />
                City, State
              </p>
            </div>
            <div>
              <Phone className="h-8 w-8 text-cuephoria-lightpurple mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Call Us</h4>
              <p className="text-sm text-muted-foreground">
                +91 XXXXX XXXXX<br />
                Open 11 AM - 11 PM
              </p>
            </div>
            <div>
              <Mail className="h-8 w-8 text-cuephoria-lightpurple mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Email Us</h4>
              <p className="text-sm text-muted-foreground">
                info@cuephoria.com<br />
                We'll respond quickly!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicTournaments;
