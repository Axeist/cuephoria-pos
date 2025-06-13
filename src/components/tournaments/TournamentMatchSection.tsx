
import React from 'react';
import { Match, Player, Tournament, MatchStatus, MatchStage } from '@/types/tournament.types';
import { Button } from '@/components/ui/button';
import { Check, Trophy, Calendar, Clock, AlertTriangle, Flag, Users, Medal, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface TournamentMatchSectionProps {
  matches: Match[];
  players: Player[];
  updateMatchResult: (matchId: string, winnerId: string) => void;
  updateMatchSchedule: (matchId: string, date: string, time: string) => void;
  updateMatchStatus: (matchId: string, status: MatchStatus) => void;
  winner?: Player;
}

const TournamentMatchSection: React.FC<TournamentMatchSectionProps> = ({
  matches,
  players,
  updateMatchResult,
  updateMatchSchedule,
  updateMatchStatus,
  winner
}) => {
  const [selectedMatchId, setSelectedMatchId] = React.useState<string | null>(null);
  const [editDate, setEditDate] = React.useState('');
  const [editTime, setEditTime] = React.useState('');
  
  const getPlayerName = (playerId: string) => {
    return players.find(player => player.id === playerId)?.name || 'Unknown';
  };
  
  const handleOpenScheduleDialog = (match: Match) => {
    setSelectedMatchId(match.id);
    setEditDate(match.scheduledDate || '');
    setEditTime(match.scheduledTime || '');
  };
  
  const handleSaveSchedule = () => {
    if (selectedMatchId && editDate && editTime) {
      updateMatchSchedule(selectedMatchId, editDate, editTime);
      setSelectedMatchId(null);
    }
  };

  const getStatusLabel = (status: MatchStatus) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (status: MatchStatus) => {
    switch (status) {
      case 'scheduled': return <Calendar className="h-4 w-4 mr-1" />;
      case 'completed': return <Check className="h-4 w-4 mr-1" />;
      case 'cancelled': return <AlertTriangle className="h-4 w-4 mr-1" />;
      default: return null;
    }
  };

  const getStageDisplayInfo = (stage: MatchStage) => {
    switch (stage) {
      case 'final':
        return {
          label: 'FINAL',
          color: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white',
          icon: <Trophy className="h-4 w-4 mr-1" />
        };
      case 'semi_final':
        return {
          label: 'SEMI FINAL',
          color: 'bg-gradient-to-r from-purple-600 to-purple-400 text-white',
          icon: <Medal className="h-4 w-4 mr-1" />
        };
      case 'quarter_final':
        return {
          label: 'QUARTER FINAL',
          color: 'bg-gradient-to-r from-blue-600 to-blue-400 text-white',
          icon: <Flag className="h-4 w-4 mr-1" />
        };
      default:
        return {
          label: '',
          color: '',
          icon: null
        };
    }
  };

  // Group matches by stage
  const groupedMatches = React.useMemo(() => {
    // First, separate matches by stage
    const groups: { [key in MatchStage]?: Match[] } = {};
    
    // Make sure final is first, followed by semi-finals, then quarter-finals, then regular matches
    const displayOrder: MatchStage[] = ['final', 'semi_final', 'quarter_final', 'regular'];
    
    // Initialize all groups to ensure proper order
    displayOrder.forEach(stage => {
      groups[stage] = matches.filter(match => match.stage === stage);
    });
    
    return displayOrder.filter(stage => groups[stage]?.length);
  }, [matches]);

  // Show tournament winner announcement if there is one
  const renderWinnerSection = () => {
    if (!winner) return null;
    
    return (
      <div className="p-6 text-center animate-fade-in mb-8">
        <div className="flex justify-center mb-4 animate-scale-in">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-400 rounded-full blur-md opacity-50 animate-pulse-glow"></div>
            <Trophy className="h-20 w-20 text-yellow-500 relative z-10 animate-float" />
          </div>
        </div>
        <h3 className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent">
          Tournament Winner
        </h3>
        <p className="text-2xl font-medium mt-3 animate-fade-in delay-200">{winner.name}</p>
        <p className="text-muted-foreground mt-4 animate-fade-in delay-300">
          Congratulations to {winner.name} for winning the tournament!
        </p>
      </div>
    );
  };

  if (matches.length === 0) {
    return (
      <div className="text-center py-8 animate-fade-in">
        <div className="flex justify-center mb-4">
          <Users className="h-12 w-12 text-muted-foreground opacity-50" />
        </div>
        <p className="text-lg text-muted-foreground">
          No matches generated yet. Click the button below to generate matches.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Always render the winner section if we have a winner */}
      {renderWinnerSection()}
      
      {groupedMatches.map((stage) => {
        const stageMatches = matches.filter(match => match.stage === stage);
        if (stageMatches.length === 0) return null;
        
        const stageInfo = getStageDisplayInfo(stage);
        
        return (
          <div key={stage} className="space-y-4 animate-fade-in">
            {stageInfo.label && (
              <div className="flex items-center justify-center mb-6">
                <Badge className={`text-md px-6 py-2 shadow-lg ${stageInfo.color} animate-scale-in`}>
                  {stageInfo.icon}
                  {stageInfo.label}
                </Badge>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stageMatches.map((match, index) => (
                <Card 
                  key={match.id} 
                  className={`overflow-hidden border-gray-800/50 shadow-lg hover:shadow-xl transition-all duration-300 animate-scale-in ${
                    match.status === 'cancelled' ? 'bg-gray-900/40' : 
                    match.completed ? 'bg-gray-900/20' : ''
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`h-1.5 w-full ${
                    match.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                    match.status === 'cancelled' ? 'bg-gradient-to-r from-red-500 to-rose-600' :
                    'bg-gradient-to-r from-amber-500 to-orange-500'
                  }`}></div>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-center">
                      <div className="font-medium flex items-center gap-2">
                        <span className="bg-gray-800 text-xs rounded-full h-6 w-6 flex items-center justify-center">
                          {match.id.split('-')[1]}
                        </span>
                        {match.stage !== 'regular' && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-800/70">
                            {match.stage.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className={`text-sm flex items-center rounded-full px-2 py-1 ${
                        match.status === 'completed' ? 'bg-green-900/30 text-green-400' : 
                        match.status === 'cancelled' ? 'bg-red-900/30 text-red-400' : 
                        'bg-amber-900/30 text-amber-400'
                      }`}>
                        {getStatusIcon(match.status)}
                        {match.status === 'completed' ? (
                          <span className="font-semibold">
                            Winner: {getPlayerName(match.winnerId || '')}
                          </span>
                        ) : (
                          getStatusLabel(match.status)
                        )}
                      </div>
                    </div>
                    
                    {match.scheduledDate && match.scheduledTime && (
                      <div className="mt-3 flex items-center text-xs text-gray-400 bg-gray-800/30 rounded-md px-2 py-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{format(new Date(match.scheduledDate), 'dd MMM yyyy')}</span>
                        <Clock className="h-3 w-3 ml-3 mr-1" />
                        <span>{match.scheduledTime}</span>
                        {match.status !== 'cancelled' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="ml-1 h-5 text-xs p-0 hover:bg-transparent text-blue-400 hover:text-blue-300"
                            onClick={() => handleOpenScheduleDialog(match)}
                          >
                            (Edit)
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-5 flex justify-between items-center bg-gray-800/20 rounded-md p-3 relative">
                      <div className={`flex-1 text-center p-2 rounded-md transition-all duration-300 ${
                        match.status !== 'cancelled' && match.winnerId === match.player1Id 
                          ? 'bg-gradient-to-r from-green-900/40 to-green-800/20 text-green-400' 
                          : 'hover:bg-gray-800/30'
                      }`}>
                        {getPlayerName(match.player1Id)}
                      </div>
                      
                      <div className="mx-2 flex flex-col items-center justify-center">
                        <span className="text-lg font-semibold text-gray-400">VS</span>
                        <ArrowRight className="h-4 w-4 text-gray-600" />
                      </div>
                      
                      <div className={`flex-1 text-center p-2 rounded-md transition-all duration-300 ${
                        match.status !== 'cancelled' && match.winnerId === match.player2Id 
                          ? 'bg-gradient-to-r from-green-900/40 to-green-800/20 text-green-400' 
                          : 'hover:bg-gray-800/30'
                      }`}>
                        {getPlayerName(match.player2Id)}
                      </div>
                    </div>
                    
                    {match.status === 'scheduled' && !match.completed && (
                      <>
                        {/* Only render the Select when both players are valid */}
                        {match.player1Id && match.player2Id && match.player1Id.trim() !== '' && match.player2Id.trim() !== '' && (
                          <div className="mt-4">
                            <Select
                              onValueChange={(value) => updateMatchResult(match.id, value)}
                            >
                              <SelectTrigger className="bg-gray-800/40 border-gray-700">
                                <SelectValue placeholder="Select winner" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 border-gray-700">
                                {match.player1Id && match.player1Id.trim() !== '' && (
                                  <SelectItem value={match.player1Id}>
                                    {getPlayerName(match.player1Id)}
                                  </SelectItem>
                                )}
                                {match.player2Id && match.player2Id.trim() !== '' && (
                                  <SelectItem value={match.player2Id}>
                                    {getPlayerName(match.player2Id)}
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="mt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full text-red-500 border-red-800/30 hover:bg-red-900/20 hover:text-red-400 transition-colors"
                            onClick={() => updateMatchStatus(match.id, 'cancelled')}
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" /> Cancel Match
                          </Button>
                        </div>
                      </>
                    )}
                    
                    {match.status === 'cancelled' && (
                      <div className="mt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full text-amber-500 border-amber-800/30 hover:bg-amber-900/20 hover:text-amber-400 transition-colors"
                          onClick={() => updateMatchStatus(match.id, 'scheduled')}
                        >
                          <Calendar className="h-4 w-4 mr-2" /> Reschedule Match
                        </Button>
                      </div>
                    )}
                    
                    {match.nextMatchId && (
                      <div className="mt-3 text-xs bg-gray-800/30 text-gray-400 text-center py-1 px-2 rounded">
                        Winner advances to match #{match.nextMatchId.split('-')[1]}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      <Dialog open={!!selectedMatchId} onOpenChange={(open) => !open && setSelectedMatchId(null)}>
        <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-100">Edit Match Schedule</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="date" className="text-right text-gray-300">Date</label>
              <Input
                id="date"
                type="date"
                className="col-span-3 bg-gray-800 border-gray-700 text-gray-100"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="time" className="text-right text-gray-300">Time</label>
              <Input
                id="time"
                type="time"
                className="col-span-3 bg-gray-800 border-gray-700 text-gray-100"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800" onClick={() => setSelectedMatchId(null)}>
              Cancel
            </Button>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600" onClick={handleSaveSchedule}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentMatchSection;
