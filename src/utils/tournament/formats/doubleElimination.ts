import type { Match, Player } from '@/types/tournament.types';
import { generateSingleEliminationMatches } from './singleElimination';

const today = () => new Date().toISOString().split('T')[0];

/** Double elimination: winners bracket + simplified losers bracket. */
export function generateDoubleEliminationMatches(players: Player[]): Match[] {
  if (players.length < 2) return [];

  const winners = generateSingleEliminationMatches(players).map((m) => ({
    ...m,
    bracketSide: 'winners' as const,
  }));

  const losersCount = Math.max(1, players.length - 1);
  const losers: Match[] = [];
  for (let i = 0; i < losersCount; i++) {
    losers.push({
      id: `losers-match-${i + 1}`,
      round: Math.floor(i / 2) + 1,
      player1Id: '',
      player2Id: '',
      completed: false,
      scheduledDate: today(),
      scheduledTime: '18:00',
      status: 'scheduled',
      stage: 'regular',
      bracketSide: 'losers',
    });
  }

  const grandFinal: Match = {
    id: 'grand-final',
    round: winners[winners.length - 1]?.round ? winners[winners.length - 1].round + 1 : 99,
    player1Id: '',
    player2Id: '',
    completed: false,
    scheduledDate: today(),
    scheduledTime: '20:00',
    status: 'scheduled',
    stage: 'grand_final',
    bracketSide: 'grand_final',
  };

  const lastWinners = winners.filter((m) => m.stage === 'final')[0];
  if (lastWinners) {
    lastWinners.nextMatchId = grandFinal.id;
    lastWinners.loserNextMatchId = losers[0]?.id;
  }

  return [...winners, ...losers, grandFinal];
}
