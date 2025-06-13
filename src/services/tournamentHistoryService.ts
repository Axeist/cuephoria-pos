
import { supabase } from "@/integrations/supabase/client";
import { TournamentHistoryMatch, TournamentWinner, Tournament, Player, Match, MatchStage } from "@/types/tournament.types";

// Save tournament history when a tournament is completed
export const saveTournamentHistory = async (tournament: Tournament): Promise<void> => {
  if (tournament.status !== 'completed' || !tournament.winner) {
    return;
  }

  try {
    // Check if history already exists for this tournament
    const { data: existingHistory } = await supabase
      .from('tournament_history')
      .select('id')
      .eq('tournament_id', tournament.id)
      .limit(1);

    // If history already exists, don't save again
    if (existingHistory && existingHistory.length > 0) {
      console.log('Tournament history already exists for tournament:', tournament.id);
      return;
    }

    // Determine runner-up if not already set
    let runnerUp = tournament.runnerUp;
    if (!runnerUp) {
      runnerUp = determineRunnerUp(tournament.matches, tournament.players);
    }

    // Save individual match results to tournament_history
    const historyRecords: Omit<TournamentHistoryMatch, 'id' | 'created_at'>[] = [];
    
    tournament.matches.forEach(match => {
      if (match.completed && match.winnerId) {
        const player1 = tournament.players.find(p => p.id === match.player1Id);
        const player2 = tournament.players.find(p => p.id === match.player2Id);
        const winner = tournament.players.find(p => p.id === match.winnerId);
        
        if (player1 && player2 && winner) {
          historyRecords.push({
            tournament_id: tournament.id,
            match_id: match.id,
            player1_name: player1.name,
            player2_name: player2.name,
            winner_name: winner.name,
            match_date: tournament.date,
            match_stage: match.stage
          });
        }
      }
    });

    // Insert match history
    if (historyRecords.length > 0) {
      const { error: historyError } = await supabase
        .from('tournament_history')
        .insert(historyRecords);
      
      if (historyError) {
        console.error('Error saving tournament history:', historyError);
      }
    }

    // Save tournament winner record
    const winnerRecord: Omit<TournamentWinner, 'id' | 'created_at'> = {
      tournament_id: tournament.id,
      tournament_name: tournament.name,
      winner_name: tournament.winner.name,
      runner_up_name: runnerUp?.name,
      tournament_date: tournament.date,
      game_type: tournament.gameType,
      game_variant: tournament.gameVariant
    };

    const { error: winnerError } = await supabase
      .from('tournament_winners')
      .insert([winnerRecord]);
    
    if (winnerError) {
      console.error('Error saving tournament winner:', winnerError);
    }

    // Update tournament with runner-up if it wasn't set (convert Player to Json-compatible format)
    if (!tournament.runnerUp && runnerUp) {
      const runnerUpJson = {
        id: runnerUp.id,
        name: runnerUp.name,
        customerId: runnerUp.customerId
      };

      const { error: updateError } = await supabase
        .from('tournaments')
        .update({ runner_up: runnerUpJson })
        .eq('id', tournament.id);
        
      if (updateError) {
        console.error('Error updating tournament with runner-up:', updateError);
      }
    }
  } catch (error) {
    console.error('Unexpected error saving tournament history:', error);
  }
};

// Fetch tournament history for a specific tournament
export const fetchTournamentHistory = async (tournamentId: string): Promise<TournamentHistoryMatch[]> => {
  try {
    const { data, error } = await supabase
      .from('tournament_history')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tournament history:', error);
      return [];
    }

    // Cast the data to ensure proper typing, with validation
    return (data || []).map(item => ({
      ...item,
      match_stage: item.match_stage as MatchStage
    }));
  } catch (error) {
    console.error('Unexpected error fetching tournament history:', error);
    return [];
  }
};

// NEW: Fetch tournament history from tournament data directly if not available in history table
export const fetchTournamentHistoryFromData = async (tournamentId: string): Promise<TournamentHistoryMatch[]> => {
  try {
    // First try to get from tournament_history table
    const historyFromTable = await fetchTournamentHistory(tournamentId);
    if (historyFromTable.length > 0) {
      return historyFromTable;
    }

    // If no history in table, get from tournament data
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (error || !tournament) {
      console.error('Error fetching tournament data:', error);
      return [];
    }

    // Type guard and cast for matches and players from Json to proper arrays
    const matches = Array.isArray(tournament.matches) ? (tournament.matches as unknown as Match[]) : [];
    const players = Array.isArray(tournament.players) ? (tournament.players as unknown as Player[]) : [];

    // Convert tournament matches to history format
    const historyRecords: TournamentHistoryMatch[] = [];

    matches.forEach((match: Match) => {
      if (match.completed && match.winnerId) {
        const player1 = players.find((p: Player) => p.id === match.player1Id);
        const player2 = players.find((p: Player) => p.id === match.player2Id);
        const winner = players.find((p: Player) => p.id === match.winnerId);
        
        if (player1 && player2 && winner) {
          historyRecords.push({
            id: `temp-${match.id}`, // Temporary ID for display
            tournament_id: tournamentId,
            match_id: match.id,
            player1_name: player1.name,
            player2_name: player2.name,
            winner_name: winner.name,
            match_date: tournament.date,
            match_stage: match.stage as MatchStage,
            created_at: new Date().toISOString()
          });
        }
      }
    });

    // If we have matches and it's a completed tournament, save to history table for future use
    if (historyRecords.length > 0 && tournament.status === 'completed') {
      console.log('Saving tournament history retroactively for tournament:', tournamentId);
      // Convert tournament data to proper format and save
      const tournamentConverted: Tournament = {
        id: tournament.id,
        name: tournament.name,
        gameType: tournament.game_type as any, // Cast to GameType
        gameVariant: tournament.game_variant as any, // Cast to PoolGameVariant
        gameTitle: tournament.game_title,
        date: tournament.date,
        players: players,
        matches: matches,
        winner: tournament.winner ? (tournament.winner as unknown as Player) : undefined,
        runnerUp: tournament.runner_up ? (tournament.runner_up as unknown as Player) : undefined,
        status: tournament.status as 'completed',
        budget: tournament.budget,
        winnerPrize: tournament.winner_prize,
        runnerUpPrize: tournament.runner_up_prize,
        maxPlayers: tournament.max_players
      };
      
      await saveTournamentHistory(tournamentConverted);
    }

    return historyRecords;
  } catch (error) {
    console.error('Unexpected error fetching tournament history from data:', error);
    return [];
  }
};

// Fetch leaderboard data
export const fetchTournamentLeaderboard = async (): Promise<{ 
  player: string; 
  wins: number; 
  tournaments: string[];
}[]> => {
  try {
    const { data, error } = await supabase
      .from('tournament_winners')
      .select('winner_name, tournament_name')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    // Group by winner and count wins
    const leaderboard = (data || []).reduce((acc, record) => {
      const existing = acc.find(item => item.player === record.winner_name);
      if (existing) {
        existing.wins += 1;
        existing.tournaments.push(record.tournament_name);
      } else {
        acc.push({
          player: record.winner_name,
          wins: 1,
          tournaments: [record.tournament_name]
        });
      }
      return acc;
    }, [] as { player: string; wins: number; tournaments: string[]; }[]);

    // Sort by wins (descending)
    return leaderboard.sort((a, b) => b.wins - a.wins);
  } catch (error) {
    console.error('Unexpected error fetching leaderboard:', error);
    return [];
  }
};

// Determine runner-up from tournament matches
export const determineRunnerUp = (matches: Match[], players: Player[]): Player | undefined => {
  // Find the final match
  const finalMatch = matches.find(m => m.stage === 'final' && m.completed);
  
  if (!finalMatch || !finalMatch.winnerId) {
    return undefined;
  }
  
  // The runner-up is the player who lost in the final
  const runnerUpId = finalMatch.player1Id === finalMatch.winnerId 
    ? finalMatch.player2Id 
    : finalMatch.player1Id;
    
  return players.find(p => p.id === runnerUpId);
};
