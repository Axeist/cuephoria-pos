import type { Match, Player } from '@/types/tournament.types';

const today = () => new Date().toISOString().split('T')[0];

/** Swiss system — pair players by score each round (initial random pairing). */
export function generateSwissMatches(players: Player[], rounds = 3): Match[] {
  if (players.length < 2) return [];

  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const matches: Match[] = [];
  let matchId = 1;

  for (let r = 1; r <= rounds; r++) {
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      matches.push({
        id: `swiss-match-${matchId++}`,
        round: r,
        swissRound: r,
        player1Id: shuffled[i].id,
        player2Id: shuffled[i + 1].id,
        completed: false,
        scheduledDate: today(),
        scheduledTime: `${16 + (i % 4)}:00`,
        status: 'scheduled',
        stage: 'regular',
        bracketSide: 'main',
      });
    }
    if (shuffled.length % 2 !== 0) {
      const byePlayer = shuffled[shuffled.length - 1];
      matches.push({
        id: `swiss-bye-${r}`,
        round: r,
        swissRound: r,
        player1Id: byePlayer.id,
        player2Id: '',
        completed: true,
        winnerId: byePlayer.id,
        scheduledDate: today(),
        scheduledTime: '16:00',
        status: 'completed',
        stage: 'regular',
        bracketSide: 'main',
        bye: true,
      });
    }
  }

  return matches;
}
