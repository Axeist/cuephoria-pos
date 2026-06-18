import type { Match, Player } from '@/types/tournament.types';
import { generateSingleEliminationMatches } from './singleElimination';

/** Custom builder starts from single elim template; staff edit pairings in UI. */
export function generateCustomMatches(players: Player[]): Match[] {
  return generateSingleEliminationMatches(players, true).map((m) => ({
    ...m,
    bracketSide: 'main' as const,
  }));
}

export function generateLeagueMatches(players: Player[]): Match[] {
  if (players.length < 2) return [];
  const matches: Match[] = [];
  let matchId = 1;
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      matches.push({
        id: `league-match-${matchId++}`,
        round: 1,
        player1Id: players[i].id,
        player2Id: players[j].id,
        completed: false,
        scheduledDate: today,
        scheduledTime: '18:00',
        status: 'scheduled',
        stage: 'regular',
        bracketSide: 'main',
      });
    }
  }
  return matches;
}
