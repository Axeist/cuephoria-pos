import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Trophy, Users, Calendar, GamepadIcon, Crown, Medal, Phone, Mail, MapPin, Clock, Star, Shield, FileText, ExternalLink, UserCheck, ChevronDown, TrendingUp, History, CalendarDays, Globe, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import PublicTournamentHistory from '@/components/tournaments/PublicTournamentHistory';
import PublicLeaderboard from '@/components/tournaments/PublicLeaderboard';
import PromotionalPopup from '@/components/PromotionalPopup';

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
  runner_up?: any;  // Updated to match database field name
  total_registrations: number;
  max_players: number;
}

interface RegistrationForm {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  is_existing_customer: boolean;
  customer_id?: string;
}

interface ExistingCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

const PublicTournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    is_existing_customer: false
  });
  const [existingCustomer, setExistingCustomer] = useState<ExistingCustomer | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchTournaments = useCallback(async () => {
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
        runner_up: item.runner_up,  // Use the correct field name from database
        total_registrations: Number(item.total_registrations) || 0,
        max_players: Number(item.max_players) || 16
      }));

      console.log('Fetched tournaments with runner_up:', transformedData.map(t => ({ name: t.name, runner_up: t.runner_up })));
      setTournaments(transformedData);
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTournaments();
    
    // Set up real-time subscription only
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
  }, [fetchTournaments]);

  // Check for existing customer by phone number and prevent duplicates
  const checkExistingCustomer = useCallback(async (phone: string) => {
    if (!phone.trim() || phone.length < 10) {
      setExistingCustomer(null);
      return;
    }

    setIsCheckingCustomer(true);
    try {
      // Check for existing customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .eq('phone', phone.trim())
        .single();

      if (customerError && customerError.code !== 'PGRST116') {
        console.error('Error checking customer:', customerError);
        return;
      }

      if (customerData) {
        // Check if this customer is already registered for the selected tournament
        if (selectedTournament) {
          const { data: existingRegistration, error: registrationError } = await supabase
            .from('tournament_public_registrations')
            .select('id')
            .eq('tournament_id', selectedTournament.id)
            .eq('customer_phone', phone.trim())
            .single();

          if (registrationError && registrationError.code !== 'PGRST116') {
            console.error('Error checking registration:', registrationError);
          }

          if (existingRegistration) {
            toast({
              title: "Already Registered",
              description: "This phone number is already registered for this tournament.",
              variant: "destructive"
            });
            setExistingCustomer(null);
            setRegistrationForm(prev => ({
              ...prev,
              customer_name: '',
              customer_email: '',
              customer_id: undefined,
              is_existing_customer: false
            }));
            return;
          }
        }

        setExistingCustomer(customerData);
        setRegistrationForm(prev => ({
          ...prev,
          customer_name: customerData.name,
          customer_email: customerData.email || '',
          customer_id: customerData.id,
          is_existing_customer: true
        }));
      } else {
        // Check if phone number is already registered as guest for this tournament
        if (selectedTournament) {
          const { data: guestRegistration, error: guestError } = await supabase
            .from('tournament_public_registrations')
            .select('id')
            .eq('tournament_id', selectedTournament.id)
            .eq('customer_phone', phone.trim())
            .single();

          if (guestError && guestError.code !== 'PGRST116') {
            console.error('Error checking guest registration:', guestError);
          }

          if (guestRegistration) {
            toast({
              title: "Already Registered",
              description: "This phone number is already registered for this tournament.",
              variant: "destructive"
            });
            setRegistrationForm(prev => ({
              ...prev,
              customer_name: '',
              customer_email: '',
              customer_id: undefined,
              is_existing_customer: false
            }));
            return;
          }
        }

        setExistingCustomer(null);
        setRegistrationForm(prev => ({
          ...prev,
          customer_name: '',
          customer_email: '',
          customer_id: undefined,
          is_existing_customer: false
        }));
      }
    } catch (error) {
      console.error('Error checking existing customer:', error);
    } finally {
      setIsCheckingCustomer(false);
    }
  }, [selectedTournament, toast]);

  // Memoized form input handlers to prevent re-renders
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setRegistrationForm(prev => ({ ...prev, customer_name: e.target.value }));
  }, []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const phone = e.target.value;
    setRegistrationForm(prev => ({ ...prev, customer_phone: phone }));
    
    // Check for existing customer when phone number is entered
    if (phone.length >= 10) {
      checkExistingCustomer(phone);
    } else {
      setExistingCustomer(null);
    }
  }, [checkExistingCustomer]);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setRegistrationForm(prev => ({ ...prev, customer_email: e.target.value }));
  }, []);

  const handleExistingCustomerToggle = useCallback((checked: boolean) => {
    setRegistrationForm(prev => ({ 
      ...prev, 
      is_existing_customer: checked,
      customer_name: checked && existingCustomer ? existingCustomer.name : '',
      customer_email: checked && existingCustomer ? existingCustomer.email || '' : ''
    }));
  }, [existingCustomer]);

  const handleRegistration = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
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

    // Double-check for duplicate registration before proceeding
    const { data: duplicateCheck, error: duplicateError } = await supabase
      .from('tournament_public_registrations')
      .select('id')
      .eq('tournament_id', selectedTournament.id)
      .eq('customer_phone', registrationForm.customer_phone.trim())
      .single();

    if (duplicateError && duplicateError.code !== 'PGRST116') {
      console.error('Error checking for duplicates:', duplicateError);
      toast({
        title: "Error",
        description: "Failed to verify registration status. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (duplicateCheck) {
      toast({
        title: "Already Registered",
        description: "This phone number is already registered for this tournament.",
        variant: "destructive"
      });
      return;
    }

    setIsRegistering(true);

    try {
      let customerId = registrationForm.customer_id;

      // Create new customer if not existing
      if (!registrationForm.is_existing_customer || !customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: registrationForm.customer_name.trim(),
            phone: registrationForm.customer_phone.trim(),
            email: registrationForm.customer_email.trim() || null,
            is_member: false,
            loyalty_points: 0,
            total_spent: 0,
            total_play_time: 0,
            created_via_tournament: true
          })
          .select()
          .single();

        if (customerError) {
          console.error('Error creating customer:', customerError);
          toast({
            title: "Customer Creation Failed",
            description: "Failed to create customer record. Please try again.",
            variant: "destructive"
          });
          return;
        }

        customerId = newCustomer.id;
      }

      // Register for tournament
      const { error: registrationError } = await supabase
        .from('tournament_public_registrations')
        .insert({
          tournament_id: selectedTournament.id,
          customer_name: registrationForm.customer_name.trim(),
          customer_phone: registrationForm.customer_phone.trim(),
          customer_email: registrationForm.customer_email.trim() || null,
          registration_source: 'public_website',
          status: 'registered'
        });

      if (registrationError) {
        console.error('Registration error:', registrationError);
        toast({
          title: "Registration Failed",
          description: "Failed to register for tournament. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Add player to tournament players array with proper customer identification
      const updatedPlayers = [
        ...selectedTournament.players,
        {
          id: customerId,
          name: registrationForm.customer_name.trim(),
          phone: registrationForm.customer_phone.trim(),
          email: registrationForm.customer_email.trim() || null,
          registration_date: new Date().toISOString(),
          is_existing_customer: registrationForm.is_existing_customer,
          customer_id: customerId
        }
      ];

      const { error: tournamentUpdateError } = await supabase
        .from('tournaments')
        .update({
          players: updatedPlayers
        })
        .eq('id', selectedTournament.id);

      if (tournamentUpdateError) {
        console.error('Tournament update error:', tournamentUpdateError);
        // Don't fail the registration for this error, just log it
      }

      toast({
        title: "Registration Successful!",
        description: `You have been registered for ${selectedTournament.name}. We'll contact you with more details.`,
      });

      // Reset form and close dialog
      setRegistrationForm({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        is_existing_customer: false
      });
      setExistingCustomer(null);
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
  }, [selectedTournament, registrationForm, toast, fetchTournaments]);

  const resetForm = useCallback(() => {
    setRegistrationForm({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      is_existing_customer: false
    });
    setExistingCustomer(null);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSelectedTournament(null);
      resetForm();
    }
  }, [resetForm]);

  const handleTournamentSelect = useCallback((tournament: Tournament) => {
    setSelectedTournament(tournament);
    setIsDialogOpen(true);
  }, []);

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

  const TournamentCard = React.memo(({ tournament }: { tournament: Tournament }) => {
    const [showHistory, setShowHistory] = useState(false);

    return (
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

          {/* Enhanced Winner Display for Completed Tournaments */}
          {tournament.status === 'completed' && tournament.winner && (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border border-yellow-400/40 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-2">
                  <Crown className="h-5 w-5 animate-bounce" />
                  <span>Champion: {tournament.winner.name}</span>
                </div>
                {tournament.runner_up && (
                  <div className="flex items-center gap-2 text-gray-300 font-medium">
                    <Medal className="h-4 w-4" />
                    <span>Runner-up: {tournament.runner_up.name}</span>
                  </div>
                )}
              </div>

              {/* Tournament History Toggle */}
              <Collapsible open={showHistory} onOpenChange={setShowHistory}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full border-cuephoria-lightpurple/30 text-cuephoria-lightpurple hover:bg-cuephoria-lightpurple/10"
                  >
                    <History className="mr-2 h-4 w-4" />
                    {showHistory ? 'Hide' : 'View'} Tournament History
                    <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <PublicTournamentHistory 
                    tournamentId={tournament.id} 
                    tournamentName={tournament.name}
                  />
                </CollapsibleContent>
              </Collapsible>
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
            <Button 
              className="w-full bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue hover:from-cuephoria-lightpurple/90 hover:to-cuephoria-blue/90 text-white font-semibold py-3 transition-all duration-300 hover:shadow-xl hover:shadow-cuephoria-lightpurple/30 hover:scale-[1.02] group"
              onClick={() => handleTournamentSelect(tournament)}
            >
              <Trophy className="mr-2 h-4 w-4 group-hover:animate-bounce" />
              Register Now
            </Button>
          )}

          {tournament.status === 'upcoming' && tournament.total_registrations >= tournament.max_players && (
            <Button disabled className="w-full bg-gray-600 text-gray-300">
              Tournament Full
            </Button>
          )}
        </CardContent>
      </Card>
    );
  });

  const getTabLabel = (tab: string) => {
    const counts = {
      upcoming: filterTournaments('upcoming').length,
      'in-progress': filterTournaments('in-progress').length,
      completed: filterTournaments('completed').length,
      leaderboard: ''
    };

    const labels = {
      upcoming: `Upcoming (${counts.upcoming})`,
      'in-progress': `Live (${counts['in-progress']})`,
      completed: `Completed (${counts.completed})`,
      leaderboard: 'Leaderboard'
    };

    return labels[tab as keyof typeof labels];
  };

  const getTabIcon = (tab: string) => {
    const icons = {
      upcoming: Trophy,
      'in-progress': GamepadIcon,
      completed: Crown,
      leaderboard: TrendingUp
    };
    
    const IconComponent = icons[tab as keyof typeof icons];
    return IconComponent ? <IconComponent className="h-4 w-4 mr-2" /> : null;
  };

  const renderTabContent = (tabValue: string) => {
    if (tabValue === 'leaderboard') {
      return (
        <div className="max-w-4xl mx-auto">
          <PublicLeaderboard />
        </div>
      );
    }

    const tournamentsToShow = filterTournaments(tabValue);
    
    if (tournamentsToShow.length > 0) {
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tournamentsToShow.map((tournament, index) => (
            <div 
              key={tournament.id}
              className="animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <TournamentCard tournament={tournament} />
            </div>
          ))}
        </div>
      );
    } else {
      const emptyStateContent = {
        upcoming: {
          icon: Trophy,
          title: "No upcoming tournaments",
          description: "Check back soon for new competitions!"
        },
        'in-progress': {
          icon: GamepadIcon,
          title: "No live tournaments",
          description: "Tournaments will appear here when they start!"
        },
        completed: {
          icon: Crown,
          title: "No completed tournaments",
          description: "Previous tournament results will show here!"
        }
      };

      const content = emptyStateContent[tabValue as keyof typeof emptyStateContent];
      const IconComponent = content?.icon || Trophy;

      return (
        <div className="col-span-full text-center text-cuephoria-grey py-16">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 rounded-full bg-cuephoria-lightpurple/20 animate-ping"></div>
            <IconComponent className="h-20 w-20 mx-auto opacity-50 relative z-10" />
          </div>
          <p className="text-2xl font-semibold mb-2">{content?.title}</p>
          <p className="text-lg">{content?.description}</p>
        </div>
      );
    }
  };

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
      {/* Promotional Popup */}
      <PromotionalPopup />

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
                ₹{tournaments.reduce((total, t) => {
                  const winnerPrize = t.winner_prize || 0;
                  const runnerUpPrize = t.runner_up_prize || 0;
                  return total + winnerPrize + runnerUpPrize;
                }, 0).toLocaleString()}
              </div>
              <div className="text-xs text-yellow-400 mt-1">Win big rewards!</div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="py-8 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto relative z-10">
        {/* Desktop Tabs */}
        {!isMobile && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-cuephoria-dark/80 backdrop-blur-md border border-cuephoria-lightpurple/30 rounded-xl p-1 mb-8">
              <TabsTrigger 
                value="upcoming" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cuephoria-lightpurple data-[state=active]:to-cuephoria-blue data-[state=active]:text-white rounded-lg transition-all duration-300"
              >
                {getTabIcon('upcoming')}
                Upcoming ({filterTournaments('upcoming').length})
              </TabsTrigger>
              <TabsTrigger 
                value="in-progress"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cuephoria-lightpurple data-[state=active]:to-cuephoria-blue data-[state=active]:text-white rounded-lg transition-all duration-300"
              >
                {getTabIcon('in-progress')}
                Live ({filterTournaments('in-progress').length})
              </TabsTrigger>
              <TabsTrigger 
                value="completed"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cuephoria-lightpurple data-[state=active]:to-cuephoria-blue data-[state=active]:text-white rounded-lg transition-all duration-300"
              >
                {getTabIcon('completed')}
                Completed ({filterTournaments('completed').length})
              </TabsTrigger>
              <TabsTrigger 
                value="leaderboard"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cuephoria-lightpurple data-[state=active]:to-cuephoria-blue data-[state=active]:text-white rounded-lg transition-all duration-300"
              >
                {getTabIcon('leaderboard')}
                Leaderboard
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-8">
              {renderTabContent('upcoming')}
            </TabsContent>

            <TabsContent value="in-progress" className="mt-8">
              {renderTabContent('in-progress')}
            </TabsContent>

            <TabsContent value="completed" className="mt-8">
              {renderTabContent('completed')}
            </TabsContent>

            <TabsContent value="leaderboard" className="mt-8">
              {renderTabContent('leaderboard')}
            </TabsContent>
          </Tabs>
        )}

        {/* Mobile Dropdown */}
        {isMobile && (
          <div className="w-full mb-8">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between bg-cuephoria-dark/80 backdrop-blur-md border-cuephoria-lightpurple/30 text-white hover:bg-cuephoria-lightpurple/10 hover:border-cuephoria-lightpurple/60"
                >
                  <div className="flex items-center">
                    {getTabIcon(activeTab)}
                    {getTabLabel(activeTab)}
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-full bg-cuephoria-dark border-cuephoria-lightpurple/30 backdrop-blur-md"
                align="start"
              >
                <DropdownMenuItem 
                  onClick={() => setActiveTab('upcoming')}
                  className={`text-white hover:bg-cuephoria-lightpurple/20 ${activeTab === 'upcoming' ? 'bg-cuephoria-lightpurple/10' : ''}`}
                >
                  {getTabIcon('upcoming')}
                  {getTabLabel('upcoming')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveTab('in-progress')}
                  className={`text-white hover:bg-cuephoria-lightpurple/20 ${activeTab === 'in-progress' ? 'bg-cuephoria-lightpurple/10' : ''}`}
                >
                  {getTabIcon('in-progress')}
                  {getTabLabel('in-progress')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveTab('completed')}
                  className={`text-white hover:bg-cuephoria-lightpurple/20 ${activeTab === 'completed' ? 'bg-cuephoria-lightpurple/10' : ''}`}
                >
                  {getTabIcon('completed')}
                  {getTabLabel('completed')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveTab('leaderboard')}
                  className={`text-white hover:bg-cuephoria-lightpurple/20 ${activeTab === 'leaderboard' ? 'bg-cuephoria-lightpurple/10' : ''}`}
                >
                  {getTabIcon('leaderboard')}
                  {getTabLabel('leaderboard')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Content */}
            <div className="mt-8">
              {renderTabContent(activeTab)}
            </div>
          </div>
        )}
      </main>
      
      {/* Enhanced Footer with contact details, legal links, and action buttons */}
      <footer className="py-12 px-4 sm:px-6 md:px-8 border-t border-cuephoria-lightpurple/20 mt-12 backdrop-blur-md bg-cuephoria-dark/50 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Action Buttons Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Button
              onClick={() => window.open('https://cuephoria.in/book', '_blank')}
              className="bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue hover:from-cuephoria-lightpurple/90 hover:to-cuephoria-blue/90 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-cuephoria-lightpurple/30 group"
            >
              <CalendarDays className="mr-3 h-5 w-5 group-hover:animate-bounce" />
              <div className="text-left">
                <div className="text-lg font-bold">Book A Slot</div>
                <div className="text-sm opacity-90">Reserve your gaming time</div>
              </div>
              <ExternalLink className="ml-auto h-4 w-4" />
            </Button>

            <Button
              onClick={() => window.open('https://cuephoria.in', '_blank')}
              className="bg-gradient-to-r from-cuephoria-purple to-cuephoria-darkpurple hover:from-cuephoria-purple/90 hover:to-cuephoria-darkpurple/90 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-cuephoria-purple/30 group"
            >
              <Globe className="mr-3 h-5 w-5 group-hover:animate-spin" />
              <div className="text-left">
                <div className="text-lg font-bold">Official Website</div>
                <div className="text-sm opacity-90">Visit our main site</div>
              </div>
              <ExternalLink className="ml-auto h-4 w-4" />
            </Button>

            <Button
              onClick={() => window.open('https://admin.cuephoria.in/public/stations', '_blank')}
              className="bg-gradient-to-r from-cuephoria-blue to-cuephoria-lightpurple hover:from-cuephoria-blue/90 hover:to-cuephoria-lightpurple/90 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-cuephoria-blue/30 group"
            >
              <Activity className="mr-3 h-5 w-5 group-hover:animate-pulse" />
              <div className="text-left">
                <div className="text-lg font-bold">Live Session Status</div>
                <div className="text-sm opacity-90">Check station availability</div>
              </div>
              <ExternalLink className="ml-auto h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Logo and description */}
            <div className="text-center md:text-left">
              <img 
                src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
                alt="Cuephoria Logo" 
                className="h-12 mb-4 mx-auto md:mx-0" 
              />
              <p className="text-cuephoria-grey text-sm leading-relaxed mb-4">
                The ultimate gaming destination offering premium PlayStation 5 gaming and professional pool tables with tournament-level competition.
              </p>
              <div className="flex justify-center md:justify-start space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTermsDialogOpen(true)}
                  className="border-cuephoria-lightpurple/30 text-cuephoria-lightpurple hover:bg-cuephoria-lightpurple/10"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Terms & Conditions
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPrivacyDialogOpen(true)}
                  className="border-cuephoria-lightpurple/30 text-cuephoria-lightpurple hover:bg-cuephoria-lightpurple/10"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Privacy Policy
                </Button>
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-cuephoria-lightpurple mb-4">Contact Us</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-cuephoria-grey hover:text-white transition-colors">
                  <Phone className="h-4 w-4 text-cuephoria-lightpurple" />
                  <span className="text-sm">+91 86376 25155</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-cuephoria-grey hover:text-white transition-colors">
                  <Mail className="h-4 w-4 text-cuephoria-lightpurple" />
                  <span className="text-sm">contact@cuephoria.in</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-cuephoria-grey hover:text-white transition-colors">
                  <Clock className="h-4 w-4 text-cuephoria-lightpurple" />
                  <span className="text-sm">11:00 AM - 11:00 PM</span>
                </div>
                <a
                  href="https://maps.app.goo.gl/oBUVebkaFMWa7EPk8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-cuephoria-grey hover:text-cuephoria-lightpurple transition-colors group"
                >
                  <MapPin className="h-4 w-4 text-cuephoria-lightpurple" />
                  <span className="text-sm group-hover:underline">Find Us on Maps</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            
            {/* Features */}
            <div className="text-center md:text-right">
              <h3 className="text-lg font-semibold text-cuephoria-lightpurple mb-4">Features</h3>
              <div className="space-y-2 text-sm text-cuephoria-grey">
                <div className="flex items-center justify-center md:justify-end gap-2">
                  <GamepadIcon className="h-4 w-4 text-green-400" />
                  <span>PlayStation 5 Gaming</span>
                </div>
                <div className="flex items-center justify-center md:justify-end gap-2">
                  <Trophy className="h-4 w-4 text-yellow-400" />
                  <span>Professional Pool Tables</span>
                </div>
                <div className="flex items-center justify-center md:justify-end gap-2">
                  <Crown className="h-4 w-4 text-blue-400" />
                  <span>Tournament Competition</span>
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
            </div>
          </div>
        </div>
      </footer>

      {/* Registration Dialog - Fixed to prevent page refresh */}
      <Dialog open={isDialogOpen && selectedTournament !== null} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="bg-cuephoria-dark border-cuephoria-lightpurple/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-cuephoria-lightpurple flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Register for {selectedTournament?.name}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleRegistration} className="space-y-4">
            {/* Phone Number Field (First) */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-cuephoria-grey">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={registrationForm.customer_phone}
                onChange={handlePhoneChange}
                className="bg-cuephoria-dark border-cuephoria-grey/30 text-white focus:border-cuephoria-lightpurple"
                placeholder="Enter your phone number"
                autoComplete="tel"
              />
              {isCheckingCustomer && (
                <p className="text-xs text-cuephoria-grey">Checking for existing customer...</p>
              )}
            </div>

            {/* Existing Customer Indicator */}
            {existingCustomer && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <UserCheck className="h-4 w-4" />
                  <span className="text-sm font-medium">Existing Customer Found!</span>
                </div>
                <p className="text-xs text-green-300">
                  Welcome back, {existingCustomer.name}! Your details have been auto-filled. You will be registered as an existing customer.
                </p>
              </div>
            )}

            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-cuephoria-grey">Name *</Label>
              <Input
                id="name"
                type="text"
                value={registrationForm.customer_name}
                onChange={handleNameChange}
                className="bg-cuephoria-dark border-cuephoria-grey/30 text-white focus:border-cuephoria-lightpurple"
                placeholder="Enter your full name"
                autoComplete="name"
                disabled={!!existingCustomer}
              />
            </div>
            
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-cuephoria-grey">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={registrationForm.customer_email}
                onChange={handleEmailChange}
                className="bg-cuephoria-dark border-cuephoria-grey/30 text-white focus:border-cuephoria-lightpurple"
                placeholder="Enter your email address"
                autoComplete="email"
                disabled={!!existingCustomer}
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                Entry Fee: ₹250 (to be paid at the venue)
              </p>
            </div>
            
            <Button 
              type="submit"
              disabled={isRegistering || isCheckingCustomer}
              className="w-full bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue hover:from-cuephoria-lightpurple/90 hover:to-cuephoria-blue/90"
            >
              {isRegistering ? 'Registering...' : 'Confirm Registration'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Terms & Conditions Dialog */}
      <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
        <DialogContent className="bg-cuephoria-dark border-cuephoria-lightpurple/30 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-cuephoria-lightpurple flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Terms & Conditions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-cuephoria-grey leading-relaxed">
            <div>
              <h4 className="text-white font-semibold mb-2">1. Tournament Registration</h4>
              <p>By registering for any tournament, you agree to abide by all tournament rules and regulations. Entry fees are non-refundable once paid.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">2. Payment Terms</h4>
              <p>Entry fees must be paid at the venue before the tournament begins. We accept cash and digital payments.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">3. Code of Conduct</h4>
              <p>All participants must maintain respectful behavior. Unsportsmanlike conduct may result in disqualification without refund.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">4. Equipment Rules</h4>
              <p>All gaming equipment will be provided by Cuephoria. Personal equipment is not permitted during tournaments.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">5. Dispute Resolution</h4>
              <p>Tournament organizers' decisions are final. Any disputes must be raised immediately during the event.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">6. Liability</h4>
              <p>Cuephoria is not responsible for any personal injury or loss of personal items during events.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={privacyDialogOpen} onOpenChange={setPrivacyDialogOpen}>
        <DialogContent className="bg-cuephoria-dark border-cuephoria-lightpurple/30 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-cuephoria-lightpurple flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy Policy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-cuephoria-grey leading-relaxed">
            <div>
              <h4 className="text-white font-semibold mb-2">Information We Collect</h4>
              <p>We collect personal information such as name, phone number, and email address when you register for tournaments.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">How We Use Your Information</h4>
              <p>Your information is used solely for tournament organization, communication, and improving our services.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Data Security</h4>
              <p>We implement appropriate security measures to protect your personal information against unauthorized access.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Information Sharing</h4>
              <p>We do not sell, trade, or share your personal information with third parties without your consent.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Data Retention</h4>
              <p>We retain your information only as long as necessary for tournament purposes and legal requirements.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Your Rights</h4>
              <p>You have the right to access, update, or delete your personal information. Contact us at contact@cuephoria.in for any requests.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Contact Us</h4>
              <p>If you have any questions about this Privacy Policy, please contact us at contact@cuephoria.in or +91 86376 25155.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicTournaments;
