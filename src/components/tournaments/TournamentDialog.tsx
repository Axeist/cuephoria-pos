import React, { useState, useEffect } from 'react';
import { Tournament, GameType, PoolGameVariant, PS5GameTitle, TournamentFormat } from '@/types/tournament.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { generateId } from '@/utils/pos.utils';
import { Separator } from '@/components/ui/separator';
import TournamentFormatSelector from './TournamentFormatSelector';

interface TournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament?: Tournament;
  onSave: (tournament: Tournament) => void;
}

const TournamentDialog: React.FC<TournamentDialogProps> = ({
  open,
  onOpenChange,
  tournament,
  onSave
}) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [gameType, setGameType] = useState<GameType>('PS5');
  const [gameVariant, setGameVariant] = useState<PoolGameVariant | undefined>(undefined);
  const [gameTitle, setGameTitle] = useState('');
  
  const [tournamentFormat, setTournamentFormat] = useState<TournamentFormat>('knockout');
  
  const [maxPlayers, setMaxPlayers] = useState(16);
  const [budget, setBudget] = useState('');
  const [winnerPrize, setWinnerPrize] = useState('');
  const [runnerUpPrize, setRunnerUpPrize] = useState('');

  // Reset form when dialog opens/closes or tournament changes
  useEffect(() => {
    if (tournament) {
      setName(tournament.name);
      setDate(tournament.date);
      setGameType(tournament.gameType);
      setGameVariant(tournament.gameVariant);
      setGameTitle(tournament.gameTitle);
      setMaxPlayers(tournament.maxPlayers || 16);
      setBudget(tournament.budget?.toString() || '');
      setWinnerPrize(tournament.winnerPrize?.toString() || '');
      setRunnerUpPrize(tournament.runnerUpPrize?.toString() || '');
      setTournamentFormat(tournament.tournamentFormat || 'knockout');
    } else {
      // Reset form
      setName('');
      setDate('');
      setGameType('PS5');
      setGameVariant(undefined);
      setGameTitle('');
      setMaxPlayers(16);
      setBudget('');
      setWinnerPrize('');
      setRunnerUpPrize('');
      setTournamentFormat('knockout');
    }
  }, [tournament, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !date) {
      return;
    }

    const tournamentData: Tournament = {
      id: tournament?.id || generateId(),
      name,
      date,
      gameType,
      gameVariant,
      gameTitle: gameType === 'PS5' ? gameTitle : undefined,
      players: tournament?.players || [],
      matches: tournament?.matches || [],
      status: tournament?.status || 'upcoming',
      maxPlayers,
      budget: budget ? parseFloat(budget) : undefined,
      winnerPrize: winnerPrize ? parseFloat(winnerPrize) : undefined,
      runnerUpPrize: runnerUpPrize ? parseFloat(runnerUpPrize) : undefined,
      tournamentFormat, // Add tournament format to the data
      winner: tournament?.winner,
      runnerUp: tournament?.runnerUp,
    };

    onSave(tournamentData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tournament ? 'Edit Tournament' : 'Create New Tournament'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Tournament Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter tournament name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="date">Tournament Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="maxPlayers">Maximum Players</Label>
              <Input
                id="maxPlayers"
                type="number"
                min="2"
                max="64"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 16)}
                placeholder="16"
              />
            </div>
          </div>

          <Separator />

          {/* Tournament Format Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Tournament Format</h3>
            <TournamentFormatSelector
              selectedFormat={tournamentFormat}
              onFormatChange={setTournamentFormat}
              maxPlayers={maxPlayers}
            />
          </div>

          <Separator />

          {/* Game Configuration Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Game Configuration</h3>
            
            <div>
              <Label htmlFor="gameType">Game Type *</Label>
              <Select value={gameType} onValueChange={(value: GameType) => setGameType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select game type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PS5">PlayStation 5</SelectItem>
                  <SelectItem value="Pool">Pool/Billiards</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {gameType === 'Pool' && (
              <div>
                <Label htmlFor="gameVariant">Pool Variant</Label>
                <Select value={gameVariant || ''} onValueChange={(value: PoolGameVariant) => setGameVariant(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pool variant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8 Ball">8 Ball</SelectItem>
                    <SelectItem value="Snooker">Snooker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {gameType === 'PS5' && (
              <div>
                <Label htmlFor="gameTitle">Game Title</Label>
                <Input
                  id="gameTitle"
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  placeholder="e.g., FIFA, COD, etc."
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Budget and Prizes Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Budget & Prizes</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="budget">Total Budget (₹)</Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="winnerPrize">Winner Prize (₹)</Label>
                <Input
                  id="winnerPrize"
                  type="number"
                  min="0"
                  step="0.01"
                  value={winnerPrize}
                  onChange={(e) => setWinnerPrize(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="runnerUpPrize">Runner-up Prize (₹)</Label>
                <Input
                  id="runnerUpPrize"
                  type="number"
                  min="0"
                  step="0.01"
                  value={runnerUpPrize}
                  onChange={(e) => setRunnerUpPrize(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </form>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            {tournament ? 'Update Tournament' : 'Create Tournament'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TournamentDialog;
