
import { supabase } from "@/integrations/supabase/client";
import { TournamentHistoryMatch, TournamentWinner, Tournament, Player, Match, MatchStage } from "@/types/tournament.types";

// Save tournament history when a tournament is completed
export const saveTournamentHistory = async (tournament: Tournament): Promise<void> => {
  if (tournament.status !== 'completed' || !tournament.winner) {
    return;
  }

  try {
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
      runner_up_name: tournament.runnerUp?.name,
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

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching tournament history:', error);
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
