
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
    onSave(match.id, {
      scheduledDate: date.toISOString().split('T')[0],
      scheduledTime: time,
      player1Id,
      player2Id,
      // Reset winner if players changed
      winnerId: (player1Id !== match.player1Id || player2Id !== match.player2Id) ? undefined : match.winnerId,
      completed: (player1Id !== match.player1Id || player2Id !== match.player2Id) ? false : match.completed
    });
  };

  const availablePlayers = players.filter(p => 
    p.id === player1Id || p.id === player2Id || 
    (!player1Id || !player2Id || (p.id !== player1Id && p.id !== player2Id))
  );

  return (
    <div className="space-y-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Edit Match</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Picker */}
        <div className="space-y-2">
          <Label className="text-gray-300">Match Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal border-gray-600 text-gray-300",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => newDate && setDate(newDate)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Input */}
        <div className="space-y-2">
          <Label className="text-gray-300">Match Time</Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="border-gray-600 bg-gray-800 text-white"
          />
        </div>

        {/* Player 1 Select */}
        <div className="space-y-2">
          <Label className="text-gray-300">Player 1</Label>
          <Select value={player1Id} onValueChange={setPlayer1Id}>
            <SelectTrigger className="border-gray-600 bg-gray-800 text-white">
              <SelectValue placeholder="Select Player 1" />
            </SelectTrigger>
            <SelectContent>
              {availablePlayers.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Player 2 Select */}
        <div className="space-y-2">
          <Label className="text-gray-300">Player 2</Label>
          <Select value={player2Id} onValueChange={setPlayer2Id}>
            <SelectTrigger className="border-gray-600 bg-gray-800 text-white">
              <SelectValue placeholder="Select Player 2" />
            </SelectTrigger>
            <SelectContent>
              {availablePlayers.filter(p => p.id !== player1Id).map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default TournamentMatchEditor;
