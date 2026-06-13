import type { Match, MatchStage, Player } from '@/types/tournament.types';

const today = () => new Date().toISOString().split('T')[0];

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function stageForRound(round: number, totalRounds: number): MatchStage {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return 'final';
  if (fromEnd === 1) return 'semi_final';
  if (fromEnd === 2) return 'quarter_final';
  return 'regular';
}

/** Single elimination with automatic byes for odd player counts. */
export function generateSingleEliminationMatches(players: Player[], seeded = false): Match[] {
  if (players.length < 2) return [];

  const ordered = seeded ? [...players] : [...players].sort(() => Math.random() - 0.5);
  const bracketSize = nextPowerOfTwo(ordered.length);
  const byes = bracketSize - ordered.length;
  const slots: (Player | null)[] = [
    ...ordered,
    ...Array.from({ length: byes }, () => null),
  ];

  const totalRounds = Math.log2(bracketSize);
  const matches: Match[] = [];
  let matchCounter = 1;
  const roundMatchIds: string[][] = [];

  for (let round = 1; round <= totalRounds; round++) {
    const count = bracketSize / Math.pow(2, round);
    roundMatchIds[round - 1] = [];
    for (let i = 0; i < count; i++) {
      const id = `match-${matchCounter++}`;
      roundMatchIds[round - 1].push(id);
      const nextRoundIds = roundMatchIds[round];
      const nextMatchId = nextRoundIds ? nextRoundIds[Math.floor(i / 2)] : undefined;

      let player1Id = '';
      let player2Id = '';
      let bye = false;

      if (round === 1) {
        const p1 = slots[i * 2];
        const p2 = slots[i * 2 + 1];
        player1Id = p1?.id ?? '';
        player2Id = p2?.id ?? '';
        bye = !p1 || !p2;
      }

      matches.push({
        id,
        round,
        player1Id,
        player2Id,
        completed: bye && !!(player1Id || player2Id),
        winnerId: bye ? player1Id || player2Id : undefined,
        scheduledDate: today(),
        scheduledTime: `${16 + i}:00`.slice(0, 5),
        status: bye ? 'completed' : 'scheduled',
        stage: stageForRound(round, totalRounds),
        nextMatchId,
        bracketSide: 'winners',
        bye,
      });
    }
  }

  return matches;
}
