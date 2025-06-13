import { supabase, handleSupabaseError } from "@/integrations/supabase/client";
import { Tournament, convertFromSupabaseTournament, convertToSupabaseTournament, Player, Match, MatchStage } from "@/types/tournament.types";
import { useToast } from '@/hooks/use-toast';
import { PostgrestError } from "@supabase/supabase-js";
import { useAuth } from "@/context/AuthContext";
import { generateId } from "@/utils/pos.utils";

// Define a more specific type for Supabase operations with tournaments
// This helps us work around the type limitations without modifying the types.ts file
type SupabaseTournament = {
  id: string;
  name: string;
  game_type: string;
  game_variant?: string;
  game_title?: string;
  date: string;
  players: any[];
  matches: any[];
  status: string;
  budget?: number;
  winner_prize?: number;
  runner_up_prize?: number;
  winner?: any;
  created_at?: string;
  updated_at?: string;
}

// Create a type-safe wrapper for Supabase operations with tournaments
// This prevents TypeScript errors without needing to modify the types.ts file
const tournamentsTable = {
  select: () => supabase.from('tournaments' as any),
  insert: (data: any) => supabase.from('tournaments' as any).insert(data),
  update: (data: any) => supabase.from('tournaments' as any).update(data),
  delete: () => supabase.from('tournaments' as any).delete(),
};

// Function to generate tournament matches from a list of players
export const generateMatches = (players: Player[]): Match[] => {
  if (players.length < 2) {
    return [];
  }
  
  if (players.length % 2 !== 0) {
    console.error("Tournament requires an even number of players");
    return [];
  }
  
  const matches: Match[] = [];
  let matchId = 1;
  const currentDate = new Date();
  
  // For a simple tournament structure, create a single elimination bracket
  if (players.length === 2) {
    // If there are only two players, create a final match directly
    matches.push({
      id: `match-${matchId++}`,
      round: 1,
      player1Id: players[0].id,
      player2Id: players[1].id,
      completed: false,
      scheduledDate: currentDate.toISOString().split('T')[0],
      scheduledTime: '18:00',
      status: 'scheduled',
      stage: 'final'
    });
    
    return matches;
  }

  // Special case for 6 players
  if (players.length === 6) {
    // Create first round with 2 matches (4 players)
    matches.push({
      id: `match-1`,
      round: 1,
      player1Id: players[0].id,
      player2Id: players[1].id,
      completed: false,
      scheduledDate: currentDate.toISOString().split('T')[0],
      scheduledTime: '17:00',
      status: 'scheduled',
      stage: 'quarter_final',
      nextMatchId: `match-4` // Winner goes to first semifinal
    });

    matches.push({
      id: `match-2`,
      round: 1,
      player1Id: players[2].id,
      player2Id: players[3].id,
      completed: false,
      scheduledDate: currentDate.toISOString().split('T')[0],
      scheduledTime: '18:00',
      status: 'scheduled',
      stage: 'quarter_final',
      nextMatchId: `match-4` // Winner goes to first semifinal
    });

    matches.push({
      id: `match-3`,
      round: 1,
      player1Id: players[4].id,
      player2Id: players[5].id,
      completed: false,
      scheduledDate: currentDate.toISOString().split('T')[0],
      scheduledTime: '19:00',
      status: 'scheduled',
      stage: 'quarter_final',
      nextMatchId: `match-5` // Winner goes directly to second semifinal
    });

    // Create semifinal match for players coming from matches 1 and 2
    matches.push({
      id: `match-4`,
      round: 2,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      scheduledTime: '17:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-6`
    });

    // Create semifinal "match" for winner of match 3 (directly goes to semi)
    matches.push({
      id: `match-5`,
      round: 2,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      scheduledTime: '18:00',
      status: 'scheduled',
      stage: 'semi_final',
      nextMatchId: `match-6`
    });

    // Create the final
    matches.push({
      id: `match-6`,
      round: 3,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      scheduledTime: '19:00',
      status: 'scheduled',
      stage: 'final'
    });

    return matches;
  }
  
  // For other player counts, create a proper bracket
  const numPlayers = players.length;
  const numRounds = Math.ceil(Math.log2(numPlayers));
  const totalMatches = numPlayers - 1; // In a single elimination tournament with n players, there are always n-1 matches
  
  // Create empty structure for all matches
  for (let round = 1; round <= numRounds; round++) {
    // Calculate matches in this round
    const matchesInRound = Math.floor(Math.pow(2, numRounds - round));
    
    for (let i = 0; i < matchesInRound; i++) {
      // Determine stage based on round
      let stage: MatchStage = 'regular';
      if (round === numRounds) stage = 'final';
      else if (round === numRounds - 1) stage = 'semi_final';
      else if (round === numRounds - 2) stage = 'quarter_final';
      
      const match: Match = {
        id: `match-${matchId++}`,
        round: round,
        player1Id: '',
        player2Id: '',
        completed: false,
        scheduledDate: new Date(currentDate.getTime() + (round - 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduledTime: `${16 + (i % 8)}:00`,
        status: 'scheduled',
        stage
      };
      
      // Link to next match if it's not the final
      if (round < numRounds) {
        const nextRoundMatchIndex = Math.floor(i / 2);
        match.nextMatchId = `match-${totalMatches - matchesInRound / 2 + nextRoundMatchIndex + 1}`;
      }
      
      matches.push(match);
    }
  }
  
  // Shuffle players for randomized seeding
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  
  // Assign players to first round matches
  const firstRoundMatches = matches.filter(m => m.round === 1);
  let playerIndex = 0;
  
  for (const match of firstRoundMatches) {
    if (playerIndex < shuffledPlayers.length) {
      match.player1Id = shuffledPlayers[playerIndex++].id;
    }
    if (playerIndex < shuffledPlayers.length) {
      match.player2Id = shuffledPlayers[playerIndex++].id;
    }
  }
  
  return matches.sort((a, b) => a.round - b.round || parseInt(a.id.split('-')[1]) - parseInt(b.id.split('-')[1]));
};

// Function to determine tournament winner based on matches
export const determineWinner = (matches: Match[], players: Player[]): Player | undefined => {
  // Find the final match (highest round number or one marked as 'final')
  const finalMatches = matches.filter(m => m.stage === 'final');
  
  if (finalMatches.length === 0) {
    return undefined;
  }
  
  const finalMatch = finalMatches[0];
  
  // If the final match is completed and has a winner, return that player
  if (finalMatch.completed && finalMatch.winnerId) {
    return players.find(p => p.id === finalMatch.winnerId);
  }
  
  return undefined;
};

// Fetch all tournaments from Supabase
export const fetchTournaments = async (): Promise<Tournament[]> => {
  try {
    const { data, error } = await tournamentsTable
      .select()
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching tournaments:', error);
      return [];
    }
    
    return data.map(convertFromSupabaseTournament);
  } catch (error) {
    console.error('Unexpected error fetching tournaments:', error);
    return [];
  }
};

// Format error message from Supabase for tournament operations
const formatTournamentError = (error: PostgrestError): string => {
  if (error.code === '42501') {
    return 'Permission denied. You may not have the required access rights to perform this operation. Only admins can manage tournaments.';
  }
  if (error.message?.includes('auth.uid()')) {
    return 'You need to be authenticated as an admin to perform this operation.';
  }
  return handleSupabaseError(error, 'tournament operation');
};

// Save a tournament to Supabase (create or update)
export const saveTournament = async (tournament: Tournament): Promise<{ data: Tournament | null; error: string | null }> => {
  try {
    // Log the tournament being saved for debugging
    console.log('Saving tournament to Supabase:', tournament);
    
    const supabaseTournament = convertToSupabaseTournament(tournament);
    console.log('Converted to Supabase format:', supabaseTournament);
    
    // Check if the tournament already exists
    const { data: existingTournament, error: checkError } = await tournamentsTable
      .select()
      .select('id')
      .eq('id', tournament.id)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // Not found is not an error in this case
      console.error('Error checking tournament existence:', checkError);
      return { data: null, error: formatTournamentError(checkError) };
    }
      
    let result;
    
    if (existingTournament) {
      // Update existing tournament - set updated_at timestamp
      console.log('Updating existing tournament with ID:', tournament.id);
      const updateData = {
        ...supabaseTournament,
        updated_at: new Date().toISOString()
      };
      
      // Clean up any undefined or malformed values before sending to Supabase
      Object.keys(updateData).forEach(key => {
        const value = updateData[key];
        if (value && typeof value === 'object' && value._type === 'undefined') {
          updateData[key] = null;
        }
      });
      
      const { data, error } = await tournamentsTable
        .update(updateData)
        .eq('id', tournament.id)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating tournament:', error);
        return { data: null, error: formatTournamentError(error) };
      }
      
      result = data;
      console.log('Tournament updated successfully:', result);
    } else {
      // Create new tournament with created_at timestamp
      console.log('Creating new tournament');
      
      // Clean up any undefined or malformed values before sending to Supabase
      const insertData = { ...supabaseTournament, created_at: new Date().toISOString() };
      Object.keys(insertData).forEach(key => {
        const value = insertData[key];
        if (value && typeof value === 'object' && value._type === 'undefined') {
          insertData[key] = null;
        }
      });
      
      const { data, error } = await tournamentsTable
        .insert(insertData)
        .select()
        .single();
        
      if (error) {
        console.error('Error creating tournament:', error);
        return { data: null, error: formatTournamentError(error) };
      }
      
      result = data;
      console.log('Tournament created successfully:', result);
    }
    
    return { data: convertFromSupabaseTournament(result), error: null };
  } catch (error) {
    console.error('Unexpected error saving tournament:', error);
    return { data: null, error: 'An unexpected error occurred while saving the tournament.' };
  }
};

// Delete a tournament from Supabase
export const deleteTournament = async (id: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await tournamentsTable
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting tournament:', error);
      return { success: false, error: formatTournamentError(error) };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected error deleting tournament:', error);
    return { success: false, error: 'An unexpected error occurred while deleting the tournament.' };
  }
};

// Custom hook for tournament operations with toast notifications
export const useTournamentOperations = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  return {
    fetchTournaments: async () => {
      const tournaments = await fetchTournaments();
      if (tournaments.length === 0) {
        console.log("No tournaments found or error occurred");
      }
      return tournaments;
    },
    
    saveTournament: async (tournament: Tournament) => {
      if (!user?.isAdmin) {
        toast({
          title: "Permission denied",
          description: "Only admin users can create or edit tournaments",
          variant: "destructive"
        });
        return null;
      }
      
      const { data, error } = await saveTournament(tournament);
      if (data) {
        toast({
          title: "Success",
          description: `Tournament "${tournament.name}" ${tournament.id === data.id ? "updated" : "created"} successfully`,
        });
        return data;
      } else {
        toast({
          title: "Failed to save tournament",
          description: error || `Could not save tournament "${tournament.name}"`,
          variant: "destructive"
        });
        return null;
      }
    },
    
    deleteTournament: async (id: string, name: string) => {
      if (!user?.isAdmin) {
        toast({
          title: "Permission denied",
          description: "Only admin users can delete tournaments",
          variant: "destructive"
        });
        return false;
      }
      
      const { success, error } = await deleteTournament(id);
      if (success) {
        toast({
          title: "Success",
          description: `Tournament "${name}" deleted successfully`,
        });
        return true;
      } else {
        toast({
          title: "Error",
          description: error || `Failed to delete tournament "${name}"`,
          variant: "destructive"
        });
        return false;
      }
    }
  };
};
