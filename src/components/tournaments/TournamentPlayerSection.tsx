import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash, Edit2, Check, X, Search } from 'lucide-react';
import { Player } from '@/types/tournament.types';
import { generateId } from '@/utils/pos.utils';
import { supabase } from '@/integrations/supabase/client';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [tournamentRegistrations, setTournamentRegistrations] = useState<Array<{
    customer_phone: string;
    payment_status: string;
  }>>([]);
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>({
    customer_phone: '',
    is_existing_customer: false
  });
  const { toast } = useToast();

  // Normalize phone number helper
  const normalizePhoneNumber = (phone: string): string => {
    return phone.replace(/\D/g, '');
  };

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

  // Fetch tournament registrations to check payment status
  useEffect(() => {
    const fetchRegistrations = async () => {
      if (!tournamentId) return;
      
      try {
        const { data, error } = await supabase
          .from('tournament_public_registrations')
          .select('customer_phone, payment_status')
          .eq('tournament_id', tournamentId);
          
        if (error) {
          console.error('Error fetching registrations:', error);
          return;
        }
        
        if (data) {
          setTournamentRegistrations(data);
        }
      } catch (error) {
        console.error('Error in fetchRegistrations:', error);
      }
    };
    
    fetchRegistrations();
  }, [tournamentId]);

  // Filter customers based on search query (name or phone)
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers;
    
    const query = customerSearchQuery.toLowerCase().trim();
    const normalizedQuery = normalizePhoneNumber(customerSearchQuery);
    
    return customers.filter(customer => {
      const normalizedPhone = normalizePhoneNumber(customer.phone);
      return (
        customer.name.toLowerCase().includes(query) ||
        normalizedPhone.includes(normalizedQuery) ||
        customer.phone.includes(query)
      );
    });
  }, [customers, customerSearchQuery]);

  const addPlayer = async () => {
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
    
    // Update the tournament's players array in the database immediately
    if (tournamentId) {
      await updateTournamentPlayers(updatedPlayers);
    }
    
    toast({
      title: 'Player Added',
      description: `${newPlayer.name} has been added to the tournament as ${newPlayer.customerId ? 'an existing customer' : 'a guest'}.`,
    });
  };

  const updateTournamentPlayers = async (updatedPlayers: Player[]) => {
    if (!tournamentId) return;
    
    try {
      // Convert players to JSON-compatible format matching the format expected by public page
      const jsonPlayers = updatedPlayers.map(player => ({
        id: player.id,
        name: player.name,
        ...(player.customerId && { customerId: player.customerId, customer_id: player.customerId })
      }));

      const { error } = await supabase
        .from('tournaments')
        .update({ 
          players: jsonPlayers,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId);

      if (error) {
        console.error('Error updating tournament players:', error);
        toast({
          title: 'Error',
          description: 'Failed to save player. Please try again.',
          variant: 'destructive'
        });
      } else {
        console.log('Successfully updated tournament players in database');
      }
    } catch (error) {
      console.error('Unexpected error updating tournament players:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while saving.',
        variant: 'destructive'
      });
    }
  };

  const removePlayer = async (id: string) => {
    const playerToRemove = players.find(p => p.id === id);
    if (!playerToRemove) return;

    console.log('Removing player:', playerToRemove);
    
    // Remove player from local state
    const updatedPlayers = players.filter(player => player.id !== id);
    setPlayers(updatedPlayers);

    // Update the tournament's players array in the database immediately
    if (tournamentId) {
      await updateTournamentPlayers(updatedPlayers);
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
  
  const handleSaveEdit = async (playerId: string) => {
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

    // Update the tournament's players array in the database immediately
    if (tournamentId) {
      await updateTournamentPlayers(updatedPlayers);
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Roster</p>
          <p className="text-lg font-semibold text-white">
            {players.length} <span className="text-muted-foreground font-normal">/ {maxPlayers} players</span>
          </p>
        </div>
        {isMaxPlayersReached && (
          <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10">
            Roster full
          </Badge>
        )}
      </div>

      {!matchesExist && !isMaxPlayersReached && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add player</p>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">From customers</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name or phone…"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={selectedCustomerId}
                onValueChange={(value) => {
                  setSelectedCustomerId(value);
                  setCustomerSearchQuery('');
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={filteredCustomers.length > 0 ? 'Select customer' : 'No matches'} />
                </SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {filteredCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} · {customer.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="w-full"
                onClick={addPlayer}
                disabled={!selectedCustomerId}
              >
                <Plus className="h-4 w-4 mr-1" /> Add customer
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Guest name</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Player name"
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    const value = e.target.value.trim();
                    if (value.match(/^\d{10,}$/)) {
                      setRegistrationForm((prev) => ({ ...prev, customer_phone: value }));
                    } else {
                      setRegistrationForm((prev) => ({ ...prev, customer_phone: '' }));
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                />
                <Button onClick={addPlayer} disabled={!playerName.trim() && !selectedCustomerId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Or pick a customer on the left.</p>
            </div>
          </div>
        </div>
      )}

      {players.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {players.map((player, index) => {
            const customer = player.customerId ? customers.find((c) => c.id === player.customerId) : null;
            const customerPhone = customer?.phone ? normalizePhoneNumber(customer.phone) : null;
            const registration = customerPhone
              ? tournamentRegistrations.find((r) => normalizePhoneNumber(r.customer_phone) === customerPhone)
              : null;
            const paidOnline = registration?.payment_status === 'paid';
            const isEditing = editingPlayer?.id === player.id;

            return (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 hover:border-white/20 transition-colors"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <Input
                      value={editingPlayer.name}
                      onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                      autoFocus
                      className="h-8 text-sm"
                    />
                  ) : (
                    <>
                      <p className="font-medium text-sm truncate">{player.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {paidOnline && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-400/40 text-yellow-300 bg-yellow-500/10">
                            Paid online
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            player.customerId
                              ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
                              : 'border-blue-500/30 text-blue-300 bg-blue-500/10',
                          )}
                        >
                          {player.customerId ? 'Customer' : 'Guest'}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  {isEditing ? (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-400" onClick={() => handleSaveEdit(player.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={handleCancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => handleEditClick(player)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-400"
                        onClick={() => removePlayer(player.id)}
                        disabled={matchesExist}
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 py-10 text-center text-muted-foreground text-sm">
          No players yet. Add customers or guest names above.
        </div>
      )}

      {matchesExist && (
        <p className="text-xs text-amber-400/90 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          Roster locked — you can edit names but not add or remove players.
        </p>
      )}
    </div>
  );
};

export default TournamentPlayerSection;
