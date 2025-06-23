
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Check, X } from 'lucide-react';
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
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl border border-gray-700/50 backdrop-blur-sm shadow-2xl">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <CalendarIcon className="h-5 w-5 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Edit Match Details</h3>
        </div>
        <div className="flex gap-3">
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium px-4 py-2 rounded-lg shadow-lg transition-all duration-200"
          >
            <Check className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500 px-4 py-2 rounded-lg transition-all duration-200"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Date Picker */}
        <div className="space-y-3">
          <Label className="text-gray-300 font-medium flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-blue-400" />
            Match Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal border-gray-600 bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 hover:border-gray-500 rounded-lg px-4 py-3 h-auto",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-3 h-4 w-4 text-blue-400" />
                <span className="text-white">
                  {date ? format(date, "EEEE, MMMM do, yyyy") : "Pick a date"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-900 border-gray-700" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => newDate && setDate(newDate)}
                initialFocus
                className="pointer-events-auto bg-gray-900 text-white"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Input */}
        <div className="space-y-3">
          <Label className="text-gray-300 font-medium flex items-center gap-2">
            <svg className="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            Match Time
          </Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="border-gray-600 bg-gray-800/60 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500/20 rounded-lg px-4 py-3 h-auto"
          />
        </div>

        {/* Player 1 Select */}
        <div className="space-y-3">
          <Label className="text-gray-300 font-medium flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            Player 1
          </Label>
          <Select value={player1Id} onValueChange={setPlayer1Id}>
            <SelectTrigger className="border-gray-600 bg-gray-800/60 text-white hover:bg-gray-700/60 focus:border-blue-500 rounded-lg px-4 py-3 h-auto">
              <SelectValue placeholder="Select Player 1" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {availablePlayers.map((player) => (
                <SelectItem 
                  key={player.id} 
                  value={player.id}
                  className="text-white hover:bg-gray-800 focus:bg-gray-800"
                >
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Player 2 Select */}
        <div className="space-y-3">
          <Label className="text-gray-300 font-medium flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            Player 2
          </Label>
          <Select value={player2Id} onValueChange={setPlayer2Id}>
            <SelectTrigger className="border-gray-600 bg-gray-800/60 text-white hover:bg-gray-700/60 focus:border-red-500 rounded-lg px-4 py-3 h-auto">
              <SelectValue placeholder="Select Player 2" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {availablePlayers.filter(p => p.id !== player1Id).map((player) => (
                <SelectItem 
                  key={player.id} 
                  value={player.id}
                  className="text-white hover:bg-gray-800 focus:bg-gray-800"
                >
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Match Preview */}
      <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700/50">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Match Preview</h4>
        <div className="flex items-center justify-between">
          <div className="text-white font-medium">
            {players.find(p => p.id === player1Id)?.name || 'Player 1'}
          </div>
          <div className="text-gray-400 text-sm font-medium px-3 py-1 bg-gray-700/50 rounded-full">
            VS
          </div>
          <div className="text-white font-medium">
            {players.find(p => p.id === player2Id)?.name || 'Player 2'}
          </div>
        </div>
        <div className="text-sm text-gray-400 mt-2 text-center">
          {date ? format(date, "MMM dd, yyyy") : "No date"} at {time || "No time"}
        </div>
      </div>
    </div>
  );
};

export default TournamentMatchEditor;
