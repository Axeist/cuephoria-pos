
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Check, X, Clock, Users, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Match, Player } from '@/types/tournament.types';

interface TournamentMatchEditorProps {
  match: Match;
  players: Player[];
  onSave: (matchId: string, updates: Partial<Match>) => void;
  onCancel: () => void;
}

const TournamentMatchEditor: React.FC<TournamentMatchEditorProps> = ({
  match,
  players,
  onSave,
  onCancel
}) => {
  const [date, setDate] = useState<Date>(new Date(match.scheduledDate));
  const [time, setTime] = useState(match.scheduledTime);
  const [player1Id, setPlayer1Id] = useState(match.player1Id);
  const [player2Id, setPlayer2Id] = useState(match.player2Id);

  const handleSave = () => {
    const updates: Partial<Match> = {
      scheduledDate: date.toISOString().split('T')[0],
      scheduledTime: time,
      player1Id,
      player2Id,
    };

    // Reset winner if players changed
    if (player1Id !== match.player1Id || player2Id !== match.player2Id) {
      updates.winnerId = undefined;
      updates.completed = false;
    }

    console.log('Saving match updates:', updates);
    onSave(match.id, updates);
  };

  const availablePlayers = players.filter(p => 
    p.id === player1Id || p.id === player2Id || 
    (!player1Id || !player2Id || (p.id !== player1Id && p.id !== player2Id))
  );

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-950/95 to-gray-900/95 rounded-2xl border border-gray-700/60 backdrop-blur-sm shadow-2xl">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-xl border border-purple-500/40">
            <Sparkles className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">Edit Match Details</h3>
            <p className="text-gray-400 text-sm">Customize match schedule and participants</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg transition-all duration-200 hover:shadow-emerald-500/25"
          >
            <Check className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="border-gray-600/60 bg-gray-800/40 text-gray-300 hover:bg-gray-700/60 hover:border-gray-500/80 px-6 py-2.5 rounded-xl transition-all duration-200"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Date Picker */}
        <div className="space-y-3">
          <Label className="text-gray-200 font-semibold flex items-center gap-3 text-base">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <CalendarIcon className="h-4 w-4 text-blue-400" />
            </div>
            Match Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal border-gray-600/60 bg-gray-800/60 text-gray-200 hover:bg-gray-700/70 hover:border-gray-500/80 rounded-xl px-4 py-4 h-auto transition-all duration-200",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-3 h-5 w-5 text-blue-400" />
                <span className="text-white font-medium">
                  {date ? format(date, "EEEE, MMMM do, yyyy") : "Pick a date"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-900/95 border-gray-700/60 backdrop-blur-sm" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => newDate && setDate(newDate)}
                initialFocus
                className="pointer-events-auto bg-gray-900/95 text-white rounded-xl"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Input */}
        <div className="space-y-3">
          <Label className="text-gray-200 font-semibold flex items-center gap-3 text-base">
            <div className="p-1.5 bg-green-500/20 rounded-lg">
              <Clock className="h-4 w-4 text-green-400" />
            </div>
            Match Time
          </Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="border-gray-600/60 bg-gray-800/60 text-white placeholder-gray-400 focus:border-green-500/80 focus:ring-green-500/20 rounded-xl px-4 py-4 h-auto text-base font-medium transition-all duration-200"
          />
        </div>

        {/* Player 1 Select */}
        <div className="space-y-3">
          <Label className="text-gray-200 font-semibold flex items-center gap-3 text-base">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            </div>
            Player 1
          </Label>
          <Select value={player1Id} onValueChange={setPlayer1Id}>
            <SelectTrigger className="border-gray-600/60 bg-gray-800/60 text-white hover:bg-gray-700/70 focus:border-blue-500/80 rounded-xl px-4 py-4 h-auto transition-all duration-200">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-blue-400" />
                <SelectValue placeholder="Select Player 1" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-gray-900/95 border-gray-700/60 backdrop-blur-sm">
              {availablePlayers.map((player) => (
                <SelectItem 
                  key={player.id} 
                  value={player.id}
                  className="text-white hover:bg-gray-800/80 focus:bg-gray-800/80 rounded-lg m-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    {player.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Player 2 Select */}
        <div className="space-y-3">
          <Label className="text-gray-200 font-semibold flex items-center gap-3 text-base">
            <div className="p-1.5 bg-red-500/20 rounded-lg">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            </div>
            Player 2
          </Label>
          <Select value={player2Id} onValueChange={setPlayer2Id}>
            <SelectTrigger className="border-gray-600/60 bg-gray-800/60 text-white hover:bg-gray-700/70 focus:border-red-500/80 rounded-xl px-4 py-4 h-auto transition-all duration-200">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-red-400" />
                <SelectValue placeholder="Select Player 2" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-gray-900/95 border-gray-700/60 backdrop-blur-sm">
              {availablePlayers.filter(p => p.id !== player1Id).map((player) => (
                <SelectItem 
                  key={player.id} 
                  value={player.id}
                  className="text-white hover:bg-gray-800/80 focus:bg-gray-800/80 rounded-lg m-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    {player.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Match Preview */}
      <div className="p-5 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl border border-gray-700/60 backdrop-blur-sm">
        <h4 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-3">
          <div className="p-1.5 bg-purple-500/20 rounded-lg">
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          Match Preview
        </h4>
        <div className="flex items-center justify-between">
          <div className="text-white font-bold text-lg">
            {players.find(p => p.id === player1Id)?.name || 'Player 1'}
          </div>
          <div className="px-4 py-2 bg-gradient-to-r from-purple-600/30 to-blue-600/30 rounded-full border border-purple-500/40">
            <span className="text-white font-bold text-sm">VS</span>
          </div>
          <div className="text-white font-bold text-lg">
            {players.find(p => p.id === player2Id)?.name || 'Player 2'}
          </div>
        </div>
        <div className="text-center mt-4 p-3 bg-gray-800/40 rounded-lg border border-gray-700/40">
          <div className="text-gray-300 font-medium">
            {date ? format(date, "MMM dd, yyyy") : "No date"} at {time || "No time"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentMatchEditor;
