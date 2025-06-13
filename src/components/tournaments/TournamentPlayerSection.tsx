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
  tournamentId?: string;
  maxPlayers?: number; // Add maxPlayers prop
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

interface RegistrationForm {
  customer_phone: string;
  is_existing_customer: boolean;
}

const TournamentPlayerSection: React.FC<TournamentPlayerSectionProps> = ({ 
  players, 
  setPlayers,
  matchesExist,
  updatePlayerName,
  tournamentId,
  maxPlayers = 16 // Default to 16 if not specified
}) => {
  const [playerName, setPlayerName] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [editingPlayer, setEditingPlayer] = useState<EditingPlayer | null>(null);
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>({
    customer_phone: '',
    is_existing_customer: false
  });
  const { toast } = useToast();

  // Fetch customers from Supabase
  useEffect(() => {
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
    
    // Check if maximum players limit is reached
    if (players.length >= maxPlayers) {
      toast({
        title: 'Maximum Players Reached',
        description: `This tournament is limited to ${maxPlayers} players. Cannot add more players.`,
        variant: 'destructive'
      });
      return;
    }
    
    let newPlayer: Player;
    
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (!customer) return;
      
      console.log('Adding existing customer via dropdown:', customer);
      
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
        customerId: selectedCustomerId
      };
      
      console.log('Created player object for existing customer via dropdown:', newPlayer);
      setSelectedCustomerId('');
    } else {
      // Check if this is an existing customer identified by phone number
      const existingCustomer = customers.find(c => c.phone === registrationForm.customer_phone.trim());
      
      if (existingCustomer) {
        console.log('Adding existing customer identified by phone:', existingCustomer);
        
        // Check if this customer is already added as a player
        const existingPlayer = players.find(p => p.customerId === existingCustomer.id);
        if (existingPlayer) {
          toast({
            title: 'Duplicate Player',
            description: `${existingCustomer.name} is already added to this tournament.`,
            variant: 'destructive'
          });
          return;
        }
        
        newPlayer = {
          id: generateId(),
          name: existingCustomer.name,
          customerId: existingCustomer.id
        };
        
        console.log('Created player object for existing customer by phone:', newPlayer);
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
          // No customerId for new players
        };
        
        console.log('Created player object for new player:', newPlayer);
      }
      
      setPlayerName('');
      setRegistrationForm({ customer_phone: '', is_existing_customer: false });
    }
    
    console.log('Adding player to tournament:', newPlayer);
    const updatedPlayers = [...players, newPlayer];
    setPlayers(updatedPlayers);
    
    // Update the tournament's players array in the database
    if (tournamentId) {
      updateTournamentPlayers(updatedPlayers);
    }
    
    toast({
      title: 'Player Added',
      description: `${newPlayer.name} has been added to the tournament as ${newPlayer.customerId ? 'an existing customer' : 'a guest'}.`,
    });
  };

  const updateTournamentPlayers = async (updatedPlayers: Player[]) => {
    if (!tournamentId) return;
    
    try {
      // Convert players to JSON-compatible format
      const jsonPlayers = updatedPlayers.map(player => ({
        id: player.id,
        name: player.name,
        ...(player.customerId && { customerId: player.customerId })
      }));

      const { error } = await supabase
        .from('tournaments')
        .update({ players: jsonPlayers })
        .eq('id', tournamentId);

      if (error) {
        console.error('Error updating tournament players:', error);
      } else {
        console.log('Successfully updated tournament players in database');
      }
    } catch (error) {
      console.error('Unexpected error updating tournament players:', error);
    }
  };

  const removePlayer = async (id: string) => {
    const playerToRemove = players.find(p => p.id === id);
    if (!playerToRemove) return;

    console.log('Removing player:', playerToRemove);
    
    // Remove player from local state
    const updatedPlayers = players.filter(player => player.id !== id);
    setPlayers(updatedPlayers);

    // Update the tournament's players array in the database
    if (tournamentId) {
      updateTournamentPlayers(updatedPlayers);
    }

    // If we have a tournament ID and the player has a customerId, 
    // get the customer's phone number and clean up any registration records
    if (tournamentId && playerToRemove.customerId) {
      try {
        // Get the customer's phone number
        const customer = customers.find(c => c.id === playerToRemove.customerId);
        if (customer && customer.phone) {
          const { error } = await supabase
            .from('tournament_public_registrations')
            .delete()
            .eq('tournament_id', tournamentId)
            .eq('customer_phone', customer.phone);

          if (error) {
            console.error('Error cleaning up registration record:', error);
          } else {
            console.log('Successfully cleaned up registration record for phone:', customer.phone);
          }
        }
      } catch (error) {
        console.error('Unexpected error cleaning up registration:', error);
      }
    }

    toast({
      title: 'Player Removed',
      description: `${playerToRemove.name} has been removed from the tournament.`,
    });
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
    const updatedPlayers = players.map(p => 
      p.id === playerId 
        ? { ...p, name: editingPlayer.name.trim() } 
        : p
    );
    setPlayers(updatedPlayers);

    // Update the tournament's players array in the database
    if (tournamentId) {
      updateTournamentPlayers(updatedPlayers);
    }
    
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

  // Check if we've reached the maximum players limit
  const isMaxPlayersReached = players.length >= maxPlayers;

  return (
    <div className="space-y-4">
      {/* Display player count and limit */}
      <div className="text-sm text-gray-400">
        Players: {players.length} / {maxPlayers}
        {isMaxPlayersReached && (
          <span className="ml-2 text-amber-400">
            (Maximum reached)
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium">Add Existing Customer</label>
          <Select
            value={selectedCustomerId}
            onValueChange={setSelectedCustomerId}
            disabled={matchesExist || isMaxPlayersReached}
          >
            <SelectTrigger>
              <SelectValue placeholder={isMaxPlayersReached ? "Maximum players reached" : "Select a customer"} />
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
              placeholder={isMaxPlayersReached ? "Maximum players reached" : "Enter player name or phone number"}
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                // Check if input looks like a phone number and update registration form
                const value = e.target.value.trim();
                if (value.match(/^\d{10,}$/)) {
                  setRegistrationForm(prev => ({ ...prev, customer_phone: value }));
                } else {
                  setRegistrationForm(prev => ({ ...prev, customer_phone: '' }));
                }
              }}
              onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
              className="mt-1"
              disabled={matchesExist || isMaxPlayersReached}
            />
          </div>
          <div className="pt-6">
            <Button onClick={addPlayer} disabled={matchesExist || isMaxPlayersReached}>
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
                <TableCell>
                  {player.customerId ? 'Customer' : 'Guest'}
                </TableCell>
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
