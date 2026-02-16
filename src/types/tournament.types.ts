
export type GameType = 'PS5' | 'Pool';
export type PoolGameVariant = '8 Ball' | 'Snooker';
export type PS5GameTitle = 'FIFA' | 'COD' | string;
export type MatchStatus = 'scheduled' | 'completed' | 'cancelled';
export type MatchStage = 'regular' | 'quarter_final' | 'semi_final' | 'final';
export type TournamentFormat = 'knockout' | 'league';

export interface DiscountCoupon {
  code: string;
  discount_percentage: number;
  description?: string;
}

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
  runnerUp?: Player; // New field for runner-up
  thirdPlace?: Player; // New field for third place
  status: 'upcoming' | 'in-progress' | 'completed';
  budget?: number;
  winnerPrize?: number;
  runnerUpPrize?: number;
  thirdPrize?: number; // New field for third prize
  winnerPrizeText?: string; // Text-based prize for winner (e.g., "Free gold membership")
  runnerUpPrizeText?: string; // Text-based prize for runner-up
  thirdPrizeText?: string; // Text-based prize for third place
  maxPlayers?: number; // Add max_players field
  tournamentFormat: TournamentFormat; // New field for tournament format
  entryFee?: number; // Tournament entry fee
  discountCoupons?: DiscountCoupon[]; // Available discount coupons
  // Database sync fields
  created_at?: string;
  updated_at?: string;
}

// New interfaces for tournament history
export interface TournamentHistoryMatch {
  id: string;
  tournament_id: string;
  match_id: string;
  player1_name: string;
  player2_name: string;
  winner_name: string;
  match_date: string;
  match_stage: MatchStage;
  created_at: string;
}

export interface TournamentWinner {
  id: string;
  tournament_id: string;
  tournament_name: string;
  winner_name: string;
  runner_up_name?: string;
  tournament_date: string;
  game_type: string;
  game_variant?: string;
  created_at: string;
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
    thirdPrize: item.third_prize || undefined,
    winnerPrizeText: item.winner_prize_text || undefined,
    runnerUpPrizeText: item.runner_up_prize_text || undefined,
    thirdPrizeText: item.third_prize_text || undefined,
    winner: item.winner || undefined,
    runnerUp: item.runner_up || undefined,
    thirdPlace: item.third_place || undefined,
    maxPlayers: item.max_players || 16, // Ensure we always have a value
    tournamentFormat: item.tournament_format || 'knockout', // Add tournament format conversion
    entryFee: item.entry_fee || 250, // Default to 250
    discountCoupons: item.discount_coupons || [], // Array of discount coupons
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
    max_players: tournament.maxPlayers || 16, // Always include max_players with a default
    tournament_format: tournament.tournamentFormat || 'knockout', // Add tournament format conversion
    entry_fee: tournament.entryFee || 250, // Default to 250
    discount_coupons: tournament.discountCoupons || [], // Array of discount coupons
  };
  
  // Only add optional fields if they have values
  if (tournament.gameVariant) cleanObject.game_variant = tournament.gameVariant;
  if (tournament.gameTitle) cleanObject.game_title = tournament.gameTitle;
  if (tournament.budget !== undefined) cleanObject.budget = tournament.budget;
  if (tournament.winnerPrize !== undefined) cleanObject.winner_prize = tournament.winnerPrize;
  if (tournament.runnerUpPrize !== undefined) cleanObject.runner_up_prize = tournament.runnerUpPrize;
  if (tournament.thirdPrize !== undefined) cleanObject.third_prize = tournament.thirdPrize;
  if (tournament.winnerPrizeText) cleanObject.winner_prize_text = tournament.winnerPrizeText;
  if (tournament.runnerUpPrizeText) cleanObject.runner_up_prize_text = tournament.runnerUpPrizeText;
  if (tournament.thirdPrizeText) cleanObject.third_prize_text = tournament.thirdPrizeText;
  if (tournament.winner) cleanObject.winner = tournament.winner;
  if (tournament.runnerUp) cleanObject.runner_up = tournament.runnerUp;
  if (tournament.thirdPlace) cleanObject.third_place = tournament.thirdPlace;
  
  return cleanObject;
};
