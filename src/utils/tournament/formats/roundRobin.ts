import type { Match, Player } from '@/types/tournament.types';

const today = () => new Date().toISOString().split('T')[0];

/** Round robin — every player plays every other player once. */
export function generateRoundRobinMatches(players: Player[]): Match[] {
  if (players.length < 2) return [];

  const matches: Match[] = [];
  let matchId = 1;
  let round = 1;

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      matches.push({
        id: `rr-match-${matchId++}`,
        round,
        player1Id: players[i].id,
        player2Id: players[j].id,
        completed: false,
        scheduledDate: today(),
        scheduledTime: `${10 + (matchId % 10)}:00`,
        status: 'scheduled',
        stage: 'regular',
        bracketSide: 'main',
        groupId: 'round_robin',
      });
      if (matchId % 3 === 0) round += 1;
    }
  }

  return matches;
}
