import { useCallback, useMemo } from "react";
import { supabase, handleSupabaseError } from "@/integrations/supabase/client";
import { Tournament, convertFromSupabaseTournament, convertToSupabaseTournament, Player, Match, MatchStage, TournamentFormat, FormatOptions } from "@/types/tournament.types";
import { useToast } from '@/hooks/use-toast';
import { PostgrestError } from "@supabase/supabase-js";
import { usePermissions } from '@/context/PermissionsContext';
import { useLocation } from "@/context/LocationContext";
import { generateId } from "@/utils/pos.utils";
import { determineRunnerUp, saveTournamentHistory } from "@/services/tournamentHistoryService";
import { generateTournamentMatches } from "@/utils/tournamentMatchGeneration";
import { standingsChampion } from "@/utils/tournament/standings";

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

// Function to generate tournament matches from a list of players (updated to use new utility)
export const generateMatches = (
  players: Player[],
  format: TournamentFormat = 'knockout',
  options?: FormatOptions,
): Match[] => {
  return generateTournamentMatches(players, format, options);
};

// Function to determine tournament winner based on matches
export const determineWinner = (
  matches: Match[],
  players: Player[],
  format?: TournamentFormat,
): Player | undefined => {
  const grandFinal = matches.find((m) => m.stage === 'grand_final' && m.completed && m.winnerId);
  if (grandFinal?.winnerId) {
    return players.find((p) => p.id === grandFinal.winnerId);
  }

  const standingsWinner = standingsChampion(matches, players, format);
  if (standingsWinner) return standingsWinner;

  const finalMatch = matches.find((m) => m.stage === 'final');
  if (finalMatch?.completed && finalMatch.winnerId) {
    return players.find((p) => p.id === finalMatch.winnerId);
  }

  return undefined;
};

// Fetch all tournaments from Supabase, scoped to a location when provided
export const fetchTournaments = async (locationId?: string | null): Promise<Tournament[]> => {
  try {
    let query = tournamentsTable
      .select()
      .select('*')
      .neq('status', 'archived')
      .order('created_at', { ascending: false });

    if (locationId) {
      query = (query as any).eq('location_id', locationId);
    }

    const { data, error } = await query;
      
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
  if (error.code === '23514' || error.message?.includes('check_tournament_format')) {
    return 'This tournament format is not supported by the database yet. Apply the latest Supabase migrations, or choose Knockout/League and try again.';
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
    
    // Save history when manually completed (bracket or time trial)
    if (tournament.status === 'completed' && tournament.winner) {
      if (!tournament.runnerUp && tournament.matches.length > 0) {
        tournament.runnerUp = determineRunnerUp(
          tournament.matches,
          tournament.players,
          tournament.tournamentFormat,
        );
      }

      saveTournamentHistory(tournament).catch(error => {
        console.error('Error saving tournament history:', error);
      });
    }
    
    const supabaseTournament = convertToSupabaseTournament(tournament);
    console.log('Converted to Supabase format:', supabaseTournament);
    
    // Ensure max_players is always set with a proper value
    if (!supabaseTournament.max_players || supabaseTournament.max_players < 2) {
      supabaseTournament.max_players = 16; // Default fallback
    }
    
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
      
      console.log('Update data with max_players:', updateData.max_players);
      
      const { data, error } = await tournamentsTable
        .update(updateData)
        .eq('id', tournament.id)
        .select()
        .maybeSingle();
        
      if (error) {
        console.error('Error updating tournament:', error);
        // If update returned no rows (e.g., archived/deleted), fall back to insert
        if ((error as any).code === 'PGRST116') {
          console.warn('Update returned no rows, falling back to insert for tournament:', tournament.id);
          const { data: insertAfterUpdate, error: insertAfterUpdateError } = await tournamentsTable
            .insert({ ...supabaseTournament, created_at: new Date().toISOString() })
            .select()
            .single();
          if (insertAfterUpdateError) {
            console.error('Insert after update fallback failed:', insertAfterUpdateError);
            return { data: null, error: formatTournamentError(insertAfterUpdateError) };
          }
          result = insertAfterUpdate;
        } else {
          return { data: null, error: formatTournamentError(error) };
        }
      } else if (!data) {
        // No error but also no data (edge case) - insert fallback
        console.warn('Update returned no data, falling back to insert for tournament:', tournament.id);
        const { data: insertAfterUpdate, error: insertAfterUpdateError } = await tournamentsTable
          .insert({ ...supabaseTournament, created_at: new Date().toISOString() })
          .select()
          .single();
        if (insertAfterUpdateError) {
          console.error('Insert after update fallback failed:', insertAfterUpdateError);
          return { data: null, error: formatTournamentError(insertAfterUpdateError) };
        }
        result = insertAfterUpdate;
      } else {
        result = data;
        console.log('Tournament updated successfully:', result);
      }
    } else {
      // Create new tournament with created_at timestamp
      console.log('Creating new tournament with max_players:', supabaseTournament.max_players);
      
      // Clean up any undefined or malformed values before sending to Supabase
      const insertData = { ...supabaseTournament, created_at: new Date().toISOString() };
      Object.keys(insertData).forEach(key => {
        const value = insertData[key];
        if (value && typeof value === 'object' && value._type === 'undefined') {
          insertData[key] = null;
        }
      });
      
      console.log('Insert data with max_players:', insertData.max_players);
      
      const { data, error } = await tournamentsTable
        .insert(insertData)
        .select()
        .single();
        
      if (error) {
        console.error('Error creating tournament:', error);
        return { data: null, error: formatTournamentError(error) };
      }
      
      result = data;
      console.log('Tournament created successfully with max_players:', result.max_players);
    }
    
    const convertedResult = convertFromSupabaseTournament(result);
    console.log('Final converted tournament max_players:', convertedResult.maxPlayers);
    
    return { data: convertedResult, error: null };
  } catch (error) {
    console.error('Unexpected error saving tournament:', error);
    return { data: null, error: 'An unexpected error occurred while saving the tournament.' };
  }
};

// Delete a tournament from Supabase
export const deleteTournament = async (id: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    console.log('Starting tournament deletion for ID:', id);
    
    // Clean up public registrations tied to this tournament
    const { error: registrationsError } = await supabase
      .from('tournament_public_registrations')
      .delete()
      .eq('tournament_id', id);
    if (registrationsError) {
      console.error('Error deleting tournament public registrations:', registrationsError);
      return { success: false, error: formatTournamentError(registrationsError) };
    }
    
    // Clean up winner images tied to this tournament
    const { error: winnerImagesError } = await supabase
      .from('tournament_winner_images')
      .delete()
      .eq('tournament_id', id);
    if (winnerImagesError) {
      console.error('Error deleting tournament winner images:', winnerImagesError);
      return { success: false, error: formatTournamentError(winnerImagesError) };
    }
    
    // First, delete related tournament history entries
    const { error: historyError } = await supabase
      .from('tournament_history')
      .delete()
      .eq('tournament_id', id);
      
    if (historyError) {
      console.error('Error deleting tournament history:', historyError);
      return { success: false, error: formatTournamentError(historyError) };
    }
    
    // Delete related tournament winner entries
    const { error: winnersError } = await supabase
      .from('tournament_winners')
      .delete()
      .eq('tournament_id', id);
      
    if (winnersError) {
      console.error('Error deleting tournament winners:', winnersError);
      return { success: false, error: formatTournamentError(winnersError) };
    }
    
    // Finally, delete the tournament itself
    // Attempt hard delete and verify affected rows using returning select
    const { data: deletedRows, error: hardDeleteError } = await tournamentsTable
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    
    if (hardDeleteError) {
      console.error('Error deleting tournament (hard delete):', hardDeleteError);
    }
    
    if (!hardDeleteError && deletedRows?.id === id) {
      console.log('Tournament and all related entries deleted successfully');
      return { success: true, error: null };
    }
    
    // If hard delete failed or affected 0 rows, fall back to soft-delete (archive)
    console.warn('Hard delete did not remove the tournament, applying soft-delete (archive) fallback');
    const { data: archivedRow, error: archiveError } = await tournamentsTable
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, status')
      .maybeSingle();
    
    if (archiveError) {
      console.error('Soft-delete (archive) failed:', archiveError);
      return { success: false, error: formatTournamentError(archiveError) };
    }
    
    if (!archivedRow || archivedRow.id !== id) {
      console.error('Soft-delete (archive) did not affect any row for ID:', id);
      return { success: false, error: 'Could not delete or archive the tournament. Please check your permissions.' };
    }
    
    console.log('Tournament archived successfully as a fallback:', archivedRow);
    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected error deleting tournament:', error);
    return { success: false, error: 'An unexpected error occurred while deleting the tournament.' };
  }
};

// Custom hook for tournament operations with toast notifications
export const useTournamentOperations = () => {
  const { toast } = useToast();
  const { can } = usePermissions();
  const { activeLocationId } = useLocation();
  const canManage = can('settings.tournaments.manage');

  const fetchTournamentsOp = useCallback(async (locationId?: string | null) => {
    const tournaments = await fetchTournaments(locationId);
    if (tournaments.length === 0) {
      console.log("No tournaments found or error occurred");
    }
    return tournaments;
  }, []);

  const saveTournamentOp = useCallback(async (tournament: Tournament) => {
    if (!canManage) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to manage tournaments",
        variant: "destructive"
      });
      return null;
    }

    const locationId = tournament.location_id ?? activeLocationId ?? undefined;
    if (!locationId) {
      toast({
        title: "Branch required",
        description: "Could not determine which branch this tournament belongs to. Select a branch in the header or reload the page.",
        variant: "destructive"
      });
      return null;
    }
    const tournamentWithLocation: Tournament = { ...tournament, location_id: locationId };

    const { data, error } = await saveTournament(tournamentWithLocation);
    if (data) {
      toast({
        title: "Success",
        description: `Tournament "${tournamentWithLocation.name}" ${tournament.id === data.id ? "updated" : "created"} successfully`,
      });
      return data;
    }

    toast({
      title: "Failed to save tournament",
      description: error || `Could not save tournament "${tournamentWithLocation.name}"`,
      variant: "destructive"
    });
    return null;
  }, [activeLocationId, canManage, toast]);

  const deleteTournamentOp = useCallback(async (id: string, name: string) => {
    if (!canManage) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to delete tournaments",
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
    }

    toast({
      title: "Error",
      description: error || `Failed to delete tournament "${name}"`,
      variant: "destructive"
    });
    return false;
  }, [canManage, toast]);

  return useMemo(
    () => ({
      fetchTournaments: fetchTournamentsOp,
      saveTournament: saveTournamentOp,
      deleteTournament: deleteTournamentOp,
    }),
    [deleteTournamentOp, fetchTournamentsOp, saveTournamentOp],
  );
};
