
export type GameType = 'PS5' | 'Pool';
export type PoolGameVariant = '8 Ball' | 'Snooker';
export type PS5GameTitle = 'FIFA' | 'COD' | string;
export type MatchStatus = 'scheduled' | 'completed' | 'cancelled';
export type MatchStage = 'regular' | 'quarter_final' | 'semi_final' | 'final';

export interface Player {
  id: string;
  name: string;
  customerId?: string;
}

export interface Match {
  id: string;
  round: number;
  player1Id: string;
  player2Id: string;
  winnerId?: string;
  completed: boolean;
  scheduledDate: string; // ISO date string
  scheduledTime: string; // 24-hour format "HH:MM"
  status: MatchStatus;
  stage: MatchStage; // New field for match stage
  nextMatchId?: string; // Reference to the next match if this is part of a tournament bracket
}

export interface Tournament {
  id: string;
  name: string;
  gameType: GameType;
  gameVariant?: PoolGameVariant;
  gameTitle?: PS5GameTitle;
  date: string;
  players: Player[];
  matches: Match[];
  winner?: Player;
  status: 'upcoming' | 'in-progress' | 'completed';
  budget?: number;
  winnerPrize?: number;
  runnerUpPrize?: number;
  // Database sync fields
  created_at?: string;
  updated_at?: string;
}

// Database conversion helper functions
export const convertFromSupabaseTournament = (item: any): Tournament => {
  return {
    id: item.id,
    name: item.name,
    gameType: item.game_type,
    gameVariant: item.game_variant || undefined,
    gameTitle: item.game_title || undefined,
    date: item.date,
    players: item.players || [],
    matches: item.matches || [],
    status: item.status,
    budget: item.budget || undefined,
    winnerPrize: item.winner_prize || undefined,
    runnerUpPrize: item.runner_up_prize || undefined,
    winner: item.winner || undefined,
    created_at: item.created_at,
    updated_at: item.updated_at
  };
};

export const convertToSupabaseTournament = (tournament: Tournament): any => {
  // Create a clean object with only defined values
  const cleanObject: any = {
    id: tournament.id,
    name: tournament.name,
    game_type: tournament.gameType,
    date: tournament.date,
    players: tournament.players || [],
    matches: tournament.matches || [],
    status: tournament.status,
  };
  
  // Only add optional fields if they have values
  if (tournament.gameVariant) cleanObject.game_variant = tournament.gameVariant;
  if (tournament.gameTitle) cleanObject.game_title = tournament.gameTitle;
  if (tournament.budget !== undefined) cleanObject.budget = tournament.budget;
  if (tournament.winnerPrize !== undefined) cleanObject.winner_prize = tournament.winnerPrize;
  if (tournament.runnerUpPrize !== undefined) cleanObject.runner_up_prize = tournament.runnerUpPrize;
  if (tournament.winner) cleanObject.winner = tournament.winner;
  
  return cleanObject;
};
