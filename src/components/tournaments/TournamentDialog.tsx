import React, { useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Form, FormControl, FormField, FormItem, 
  FormLabel, FormMessage 
} from '@/components/ui/form';
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tournament, GameType, Match, MatchStatus, MatchStage } from '@/types/tournament.types';
import { generateId } from '@/utils/pos.utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import TournamentPlayerSection from './TournamentPlayerSection';
import TournamentMatchSection from './TournamentMatchSection';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface TournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tournament: Tournament) => void;
  tournament: Tournament | null;
}

const formSchema = z.object({
  name: z.string().min(1, "Tournament name is required"),
  gameType: z.enum(["PS5", "Pool"]),
  gameVariant: z.enum(["8 Ball", "Snooker"]).optional(),
  gameTitle: z.string().optional(),
  date: z.string(),
  budget: z.string().optional(),
  winnerPrize: z.string().optional(),
  runnerUpPrize: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const TournamentDialog: React.FC<TournamentDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  tournament
}) => {
  const [players, setPlayers] = React.useState<Tournament['players']>([]);
  const [matches, setMatches] = React.useState<Tournament['matches']>([]);
  const [activeTab, setActiveTab] = React.useState('details');
  const [winner, setWinner] = React.useState<Tournament['winner']>();
  const [tournamentStatus, setTournamentStatus] = React.useState<Tournament['status']>('upcoming');
  const [customGameTitle, setCustomGameTitle] = React.useState<boolean>(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      gameType: 'PS5',
      gameTitle: 'FIFA',
      date: new Date().toISOString().split('T')[0],
      budget: '',
      winnerPrize: '',
      runnerUpPrize: '',
    },
  });

  useEffect(() => {
    if (tournament) {
      form.reset({
        name: tournament.name,
        gameType: tournament.gameType,
        gameVariant: tournament.gameVariant,
        gameTitle: tournament.gameTitle,
        date: tournament.date,
        budget: tournament.budget?.toString() || '',
        winnerPrize: tournament.winnerPrize?.toString() || '',
        runnerUpPrize: tournament.runnerUpPrize?.toString() || '',
      });
      setPlayers(tournament.players);
      setMatches(tournament.matches);
      setWinner(tournament.winner);
      setTournamentStatus(tournament.status);
      
      const gameTitle = tournament.gameTitle;
      if (gameTitle && gameTitle !== 'FIFA' && gameTitle !== 'COD') {
        setCustomGameTitle(true);
      } else {
        setCustomGameTitle(false);
      }
    } else {
      form.reset({
        name: '',
        gameType: 'PS5',
        gameTitle: 'FIFA',
        date: new Date().toISOString().split('T')[0],
        budget: '',
        winnerPrize: '',
        runnerUpPrize: '',
      });
      setPlayers([]);
      setMatches([]);
      setWinner(undefined);
      setTournamentStatus('upcoming');
      setCustomGameTitle(false);
    }
  }, [tournament, open]);

  const gameType = form.watch('gameType');
  const gameTitle = form.watch('gameTitle');

  const handleSave = (values: FormValues) => {
    const savedTournament: Tournament = {
      id: tournament?.id || generateId(),
      name: values.name,
      gameType: values.gameType,
      ...(values.gameType === 'PS5' ? { gameTitle: values.gameTitle } : { gameVariant: values.gameVariant }),
      date: values.date,
      players: players,
      matches: matches,
      status: tournamentStatus,
      ...(winner && { winner }),
      ...(values.budget && { budget: parseFloat(values.budget) }),
      ...(values.winnerPrize && { winnerPrize: parseFloat(values.winnerPrize) }),
      ...(values.runnerUpPrize && { runnerUpPrize: parseFloat(values.runnerUpPrize) }),
    };
    
    onSave(savedTournament);
  };

  const generateWeekendDate = (startDate: Date, matchIndex: number): Date => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + matchIndex * 2);
    while (date.getDay() !== 0 && date.getDay() !== 6) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  };

  const generateBracket = () => {
    if (players.length < 2) {
      toast({
        title: "Invalid number of players",
        description: "You need at least 2 players to generate a tournament bracket.",
        variant: "destructive"
      });
      return;
    }
    
    if (players.length % 2 !== 0) {
      toast({
        title: "Invalid number of players",
        description: "Tournament requires an even number of players. Please add or remove a player.",
        variant: "destructive"
      });
      return;
    }
    
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const matchesGenerated: Match[] = [];
    const tournamentDate = new Date(form.getValues().date);
    let matchId = 1;
    
    if (players.length <= 4) {
      const finalMatch: Match = {
        id: `match-${matchId++}`,
        round: 2,
        player1Id: '',
        player2Id: '',
        completed: false,
        scheduledDate: format(generateWeekendDate(tournamentDate, 2), 'yyyy-MM-dd'),
        scheduledTime: '18:00',
        status: 'scheduled',
        stage: 'final'
      };
      matchesGenerated.push(finalMatch);
      
      if (players.length <= 2) {
        finalMatch.player1Id = shuffledPlayers[0].id;
        finalMatch.player2Id = shuffledPlayers[1].id;
      } else {
        const semifinal1: Match = {
          id: `match-${matchId++}`,
          round: 1,
          player1Id: shuffledPlayers[0].id,
          player2Id: shuffledPlayers[1].id,
          completed: false,
          scheduledDate: format(generateWeekendDate(tournamentDate, 0), 'yyyy-MM-dd'),
          scheduledTime: '16:00',
          status: 'scheduled',
          stage: 'semi_final',
          nextMatchId: finalMatch.id
        };
        
        const semifinal2: Match = {
          id: `match-${matchId++}`,
          round: 1,
          player1Id: shuffledPlayers[2].id,
          player2Id: shuffledPlayers[3].id,
          completed: false,
          scheduledDate: format(generateWeekendDate(tournamentDate, 0), 'yyyy-MM-dd'),
          scheduledTime: '17:00',
          status: 'scheduled',
          stage: 'semi_final',
          nextMatchId: finalMatch.id
        };
        
        matchesGenerated.push(semifinal1, semifinal2);
      }
    } else if (players.length <= 8) {
      const finalMatch: Match = {
        id: `match-${matchId++}`,
        round: 3,
        player1Id: '',
        player2Id: '',
        completed: false,
        scheduledDate: format(generateWeekendDate(tournamentDate, 4), 'yyyy-MM-dd'),
        scheduledTime: '18:00',
        status: 'scheduled',
        stage: 'final'
      };
      matchesGenerated.push(finalMatch);
      
      const semifinal1: Match = {
        id: `match-${matchId++}`,
        round: 2,
        player1Id: '',
        player2Id: '',
        completed: false,
        scheduledDate: format(generateWeekendDate(tournamentDate, 2), 'yyyy-MM-dd'),
        scheduledTime: '17:00',
        status: 'scheduled',
        stage: 'semi_final',
        nextMatchId: finalMatch.id
      };
      
      const semifinal2: Match = {
        id: `match-${matchId++}`,
        round: 2,
        player1Id: '',
        player2Id: '',
        completed: false,
        scheduledDate: format(generateWeekendDate(tournamentDate, 2), 'yyyy-MM-dd'),
        scheduledTime: '18:00',
        status: 'scheduled',
        stage: 'semi_final',
        nextMatchId: finalMatch.id
      };
      matchesGenerated.push(semifinal1, semifinal2);
      
      for (let i = 0; i < 4; i++) {
        const quarterFinal: Match = {
          id: `match-${matchId++}`,
          round: 1,
          player1Id: shuffledPlayers[i * 2].id,
          player2Id: shuffledPlayers[i * 2 + 1].id,
          completed: false,
          scheduledDate: format(generateWeekendDate(tournamentDate, 0), 'yyyy-MM-dd'),
          scheduledTime: `${15 + i}:00`,
          status: 'scheduled',
          stage: 'quarter_final',
          nextMatchId: i < 2 ? semifinal1.id : semifinal2.id
        };
        matchesGenerated.push(quarterFinal);
      }
    } else {
      const semifinal1: Match = {
        id: `match-${matchId++}`,
        round: 2,
        player1Id: '',
        player2Id: '',
        completed: false,
        scheduledDate: format(generateWeekendDate(tournamentDate, matchId), 'yyyy-MM-dd'),
        scheduledTime: '17:00',
        status: 'scheduled',
        stage: 'semi_final'
      };
      
      const semifinal2: Match = {
        id: `match-${matchId++}`,
        round: 2,
        player1Id: '',
        player2Id: '',
        completed: false,
        scheduledDate: format(generateWeekendDate(tournamentDate, matchId), 'yyyy-MM-dd'),
        scheduledTime: '18:00',
        status: 'scheduled',
        stage: 'semi_final'
      };
      
      const final: Match = {
        id: `match-${matchId++}`,
        round: 3,
        player1Id: '',
        player2Id: '',
        completed: false,
        scheduledDate: format(generateWeekendDate(tournamentDate, matchId + 1), 'yyyy-MM-dd'),
        scheduledTime: '19:00',
        status: 'scheduled',
        stage: 'final'
      };
      
      semifinal1.nextMatchId = final.id;
      semifinal2.nextMatchId = final.id;
      
      matchesGenerated.push(semifinal1, semifinal2, final);
      
      for (let i = 0; i < shuffledPlayers.length; i++) {
        for (let j = i + 1; j < shuffledPlayers.length; j++) {
          const match: Match = {
            id: `match-${matchId++}`,
            round: 1,
            player1Id: shuffledPlayers[i].id,
            player2Id: shuffledPlayers[j].id,
            completed: false,
            scheduledDate: format(generateWeekendDate(tournamentDate, matchId - 2), 'yyyy-MM-dd'),
            scheduledTime: '18:00',
            status: 'scheduled',
            stage: 'regular'
          };
          matchesGenerated.push(match);
        }
      }
    }
    
    setMatches(matchesGenerated);
    setTournamentStatus('in-progress');
    
    toast({
      title: "Tournament Bracket Generated",
      description: `Created ${matchesGenerated.length} matches for ${players.length} players`,
    });
  };

  const updateMatchResult = (matchId: string, winnerId: string) => {
    const updatedMatches = [...matches];
    const matchIndex = updatedMatches.findIndex(m => m.id === matchId);
    
    if (matchIndex === -1) return;
    
    const match = updatedMatches[matchIndex];
    match.winnerId = winnerId;
    match.completed = true;
    match.status = 'completed';
    
    if (match.nextMatchId) {
      const nextMatchIndex = updatedMatches.findIndex(m => m.id === match.nextMatchId);
      if (nextMatchIndex !== -1) {
        const nextMatch = updatedMatches[nextMatchIndex];
        
        const siblingMatch = updatedMatches.find(m => 
          m.id !== match.id && m.nextMatchId === match.nextMatchId
        );
        
        if (!nextMatch.player1Id || !nextMatch.player2Id) {
          if (!nextMatch.player1Id) {
            nextMatch.player1Id = winnerId;
          } 
          else if (!nextMatch.player2Id) {
            nextMatch.player2Id = winnerId;
          }
          
          if (nextMatch.player1Id && nextMatch.player2Id && 
              (!siblingMatch || siblingMatch.completed)) {
            
            if (nextMatch.stage === 'final' && nextMatch.completed) {
              const winnerPlayer = players.find(p => p.id === nextMatch.winnerId);
              if (winnerPlayer) {
                setWinner(winnerPlayer);
                setTournamentStatus('completed');
              }
            }
          }
        }
      }
    }
    
    setMatches(updatedMatches);
    
    const finalMatches = updatedMatches.filter(m => m.stage === 'final');
    const semifinalMatches = updatedMatches.filter(m => m.stage === 'semi_final');
    
    if (finalMatches.length > 0 && semifinalMatches.length > 0 && 
        semifinalMatches.some(m => !m.player1Id || !m.player2Id)) {
      
      const regularMatches = updatedMatches.filter(m => m.stage === 'regular');
      const allRegularCompleted = regularMatches.every(m => m.completed || m.status === 'cancelled');
      
      if (allRegularCompleted && regularMatches.length > 0) {
        const winCounts: Record<string, number> = {};
        regularMatches.forEach(match => {
          if (match.status === 'completed' && match.winnerId) {
            winCounts[match.winnerId] = (winCounts[match.winnerId] || 0) + 1;
          }
        });
        
        const topPlayers = Object.entries(winCounts)
          .sort(([, winsA], [, winsB]) => winsB - winsA)
          .slice(0, 4)
          .map(([playerId]) => playerId);
        
        if (topPlayers.length >= 2) {
          semifinalMatches.forEach((match, idx) => {
            if (idx === 0) {
              if (!match.player1Id && topPlayers[0]) match.player1Id = topPlayers[0];
              if (!match.player2Id && topPlayers[1]) match.player2Id = topPlayers[1];
            } else if (idx === 1 && topPlayers.length >= 4) {
              if (!match.player1Id && topPlayers[2]) match.player1Id = topPlayers[2];
              if (!match.player2Id && topPlayers[3]) match.player2Id = topPlayers[3];
            }
          });
        }
      }
    }
    
    const completedFinal = updatedMatches.find(m => m.stage === 'final' && m.completed);
    if (completedFinal?.winnerId) {
      const winnerPlayer = players.find(p => p.id === completedFinal.winnerId);
      if (winnerPlayer) {
        setWinner(winnerPlayer);
        setTournamentStatus('completed');
      }
    }
    
    toast({
      title: "Match Result Recorded",
      description: `Winner: ${players.find(p => p.id === winnerId)?.name}`,
      duration: 3000,
    });
  };

  const updateMatchSchedule = (matchId: string, date: string, time: string) => {
    const updatedMatches = matches.map(match => 
      match.id === matchId 
        ? { ...match, scheduledDate: date, scheduledTime: time } 
        : match
    );
    setMatches(updatedMatches);
    toast({
      title: "Schedule Updated",
      description: "Match schedule has been updated successfully.",
    });
  };

  const updateMatchStatus = (matchId: string, status: MatchStatus) => {
    const updatedMatches = matches.map(match => 
      match.id === matchId 
        ? { ...match, status, completed: status === 'completed' } 
        : match
    );
    setMatches(updatedMatches);
    
    if (status === 'cancelled') {
      toast({
        title: "Match Cancelled",
        description: "The match has been cancelled.",
      });
    } else if (status === 'scheduled') {
      toast({
        title: "Match Rescheduled",
        description: "The match has been rescheduled.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tournament ? 'Edit Tournament' : 'Create Tournament'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="players" disabled={!open}>Players</TabsTrigger>
            <TabsTrigger value="matches" disabled={!open || players.length < 2}>Matches</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <Form {...form}>
              <form className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tournament Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter tournament name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="gameType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select game type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PS5">PS5</SelectItem>
                          <SelectItem value="Pool">Pool</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {gameType === 'PS5' && !customGameTitle && (
                  <FormField
                    control={form.control}
                    name="gameTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Game Title</FormLabel>
                        <div className="space-y-2">
                          <Select
                            onValueChange={(value) => {
                              if (value === "custom") {
                                setCustomGameTitle(true);
                                field.onChange("");
                              } else {
                                field.onChange(value);
                              }
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select game title" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FIFA">FIFA</SelectItem>
                              <SelectItem value="COD">Call of Duty (COD)</SelectItem>
                              <SelectItem value="custom">Add Custom Game Title</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                )}
                
                {gameType === 'PS5' && customGameTitle && (
                  <FormField
                    control={form.control}
                    name="gameTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Game Title</FormLabel>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <FormControl className="flex-1">
                              <Input 
                                placeholder="Enter custom game title" 
                                {...field} 
                              />
                            </FormControl>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => {
                                setCustomGameTitle(false);
                                form.setValue("gameTitle", "FIFA");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                )}
                
                {gameType === 'Pool' && (
                  <FormField
                    control={form.control}
                    name="gameVariant"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Game Variant</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select pool game variant" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="8 Ball">8 Ball</SelectItem>
                            <SelectItem value="Snooker">Snooker</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tournament Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-md font-medium mb-4">Tournament Finance</h3>
                  
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tournament Budget (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter budget amount" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="winnerPrize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Winner Prize Money (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter prize for winner" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="runnerUpPrize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Runner-up Prize Money (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter prize for runner-up" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="players">
            <TournamentPlayerSection 
              players={players} 
              setPlayers={setPlayers}
              matchesExist={matches.length > 0} 
            />
          </TabsContent>
          
          <TabsContent value="matches">
            <TournamentMatchSection 
              matches={matches}
              players={players}
              updateMatchResult={updateMatchResult}
              updateMatchSchedule={updateMatchSchedule}
              updateMatchStatus={updateMatchStatus}
              winner={winner}
            />
            
            {matches.length === 0 && (
              <div className="mt-4 text-center">
                <Button 
                  onClick={generateBracket}
                  disabled={players.length < 2 || players.length % 2 !== 0}
                >
                  Generate Tournament Bracket
                </Button>
                {players.length > 0 && players.length % 2 !== 0 && (
                  <p className="text-sm text-amber-500 mt-2">
                    Tournament requires an even number of players. Please add or remove a player.
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={form.handleSubmit(handleSave)}
            disabled={activeTab === 'players' && players.length < 2}
          >
            Save Tournament
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TournamentDialog;
