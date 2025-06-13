
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash, Edit2, Check, X } from 'lucide-react';
import { Player } from '@/types/tournament.types';
import { generateId } from '@/utils/pos.utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from "@/integrations/supabase/client";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

interface TournamentPlayerSectionProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  matchesExist: boolean;
  updatePlayerName?: (playerId: string, newName: string) => void;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface EditingPlayer {
  id: string;
  name: string;
}

const TournamentPlayerSection: React.FC<TournamentPlayerSectionProps> = ({ 
  players, 
  setPlayers,
  matchesExist,
  updatePlayerName 
}) => {
  const [playerName, setPlayerName] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [editingPlayer, setEditingPlayer] = useState<EditingPlayer | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch customers from Supabase
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, phone')
          .order('name');
          
        if (error) {
          console.error('Error fetching customers:', error);
          toast({
            title: 'Error',
            description: 'Failed to load customers',
            variant: 'destructive'
          });
          return;
        }
        
        if (data) {
          setCustomers(data);
        }
      } catch (error) {
        console.error('Error in fetchCustomers:', error);
        setCustomers([]);
      }
    };
    
    fetchCustomers();
  }, [toast]);

  const addPlayer = () => {
    if (!playerName.trim() && !selectedCustomerId) return;
    
    let newPlayer: Player;
    
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (!customer) return;
      
      // Check if this customer is already added as a player
      const existingPlayer = players.find(p => p.customerId === selectedCustomerId);
      if (existingPlayer) {
        toast({
          title: 'Duplicate Player',
          description: `${customer.name} is already added to this tournament.`,
          variant: 'destructive'
        });
        return;
      }
      
      newPlayer = {
        id: generateId(),
        name: customer.name,
        customerId: customer.id
      };
      setSelectedCustomerId('');
    } else {
      // Check if a player with this name already exists
      const existingPlayer = players.find(p => p.name.toLowerCase() === playerName.trim().toLowerCase());
      if (existingPlayer) {
        toast({
          title: 'Duplicate Player',
          description: `A player named "${playerName}" is already added to this tournament.`,
          variant: 'destructive'
        });
        return;
      }
      
      newPlayer = {
        id: generateId(),
        name: playerName.trim()
      };
      setPlayerName('');
    }
    
    setPlayers([...players, newPlayer]);
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(player => player.id !== id));
  };
  
  const handleEditClick = (player: Player) => {
    setEditingPlayer({
      id: player.id,
      name: player.name
    });
  };
  
  const handleCancelEdit = () => {
    setEditingPlayer(null);
  };
  
  const handleSaveEdit = (playerId: string) => {
    if (!editingPlayer || editingPlayer.name.trim() === '') return;
    
    // Check if name is duplicate
    const isDuplicate = players.some(p => 
      p.id !== playerId && 
      p.name.toLowerCase() === editingPlayer.name.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      toast({
        title: 'Duplicate Name',
        description: 'Another player with this name already exists.',
        variant: 'destructive'
      });
      return;
    }
    
    // Update player name in the main player list
    setPlayers(players.map(p => 
      p.id === playerId 
        ? { ...p, name: editingPlayer.name.trim() } 
        : p
    ));
    
    // Update matches if the callback is provided
    if (updatePlayerName) {
      updatePlayerName(playerId, editingPlayer.name.trim());
    }
    
    // Reset editing state
    setEditingPlayer(null);
    
    toast({
      title: 'Player Updated',
      description: 'Player name has been updated successfully.',
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium">Add Existing Customer</label>
          <Select
            value={selectedCustomerId}
            onValueChange={setSelectedCustomerId}
            disabled={matchesExist}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map(customer => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name} ({customer.phone})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-sm font-medium">Or Add New Player</label>
            <Input
              placeholder="Enter player name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
              className="mt-1"
              disabled={matchesExist}
            />
          </div>
          <div className="pt-6">
            <Button onClick={addPlayer} disabled={matchesExist}>
              <Plus className="mr-2 h-4 w-4" /> Add Player
            </Button>
          </div>
        </div>
      </div>
      
      {players.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((player) => (
              <TableRow key={player.id}>
                <TableCell>
                  {editingPlayer && editingPlayer.id === player.id ? (
                    <Input 
                      value={editingPlayer.name} 
                      onChange={(e) => setEditingPlayer({...editingPlayer, name: e.target.value})}
                      autoFocus
                    />
                  ) : (
                    player.name
                  )}
                </TableCell>
                <TableCell>{player.customerId ? 'Customer' : 'Guest'}</TableCell>
                <TableCell>
                  {editingPlayer && editingPlayer.id === player.id ? (
                    <div className="flex items-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSaveEdit(player.id)}
                        className="text-green-500"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleCancelEdit}
                        className="text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditClick(player)}
                        className="text-blue-500"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removePlayer(player.id)}
                        disabled={matchesExist}
                        className="text-red-500"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          No players added yet. Add players to create the tournament.
        </div>
      )}
      
      {matchesExist && (
        <div className="text-sm text-amber-600">
          Note: Players cannot be added or removed after matches have been generated, but you can edit their names.
        </div>
      )}
    </div>
  );
};

export default TournamentPlayerSection;
