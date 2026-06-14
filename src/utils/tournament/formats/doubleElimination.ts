import type { Match, Player } from '@/types/tournament.types';
import { generateSingleEliminationMatches } from './singleElimination';

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

const today = () => new Date().toISOString().split('T')[0];

function makeLosersMatch(id: string, round: number, stage: Match['stage'] = 'regular'): Match {
  return {
    id,
    round,
    player1Id: '',
    player2Id: '',
    completed: false,
    scheduledDate: today(),
    scheduledTime: '18:00',
    status: 'scheduled',
    stage,
    bracketSide: 'losers',
  };
}

function losersRoundMatchCount(bracketSize: number, losersRound: number, totalLosersRounds: number): number {
  if (losersRound === totalLosersRounds) return 1;
  return bracketSize / Math.pow(2, Math.ceil(losersRound / 2) + 1);
}

/** Double elimination: winners bracket + losers bracket + grand final. */
export function generateDoubleEliminationMatches(players: Player[]): Match[] {
  if (players.length < 2) return [];

  const bracketSize = nextPowerOfTwo(players.length);
  const wbRounds = Math.log2(bracketSize);

  const winners = generateSingleEliminationMatches(players).map((m) => ({
    ...m,
    bracketSide: 'winners' as const,
  }));

  if (bracketSize === 2) {
    const only = winners[0];
    const grandFinal: Match = {
      id: 'grand-final',
      round: 2,
      player1Id: only.player1Id,
      player2Id: only.player2Id,
      completed: false,
      scheduledDate: today(),
      scheduledTime: '20:00',
      status: 'scheduled',
      stage: 'grand_final',
      bracketSide: 'grand_final',
    };
    only.nextMatchId = grandFinal.id;
    return [only, grandFinal];
  }

  const totalLosersRounds = 2 * wbRounds - 2;
  const losersByRound: Match[][] = [];

  for (let lr = 1; lr <= totalLosersRounds; lr++) {
    const count = losersRoundMatchCount(bracketSize, lr, totalLosersRounds);
    const stage = lr === totalLosersRounds ? 'final' : 'regular';
    losersByRound.push(
      Array.from({ length: count }, (_, i) => makeLosersMatch(`losers-r${lr}-m${i + 1}`, lr, stage)),
    );
  }

  const wByRound: Match[][] = [];
  for (let r = 1; r <= wbRounds; r++) {
    wByRound[r - 1] = winners
      .filter((m) => m.round === r)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  const l1 = losersByRound[0];
  const wR1 = wByRound[0] ?? [];
  for (let i = 0; i < l1.length; i++) {
    const w1 = wR1[i * 2];
    const w2 = wR1[i * 2 + 1];
    if (w1) w1.loserNextMatchId = l1[i].id;
    if (w2) w2.loserNextMatchId = l1[i].id;
  }

  const l2 = losersByRound[1];
  if (l1 && l2) {
    for (let i = 0; i < l1.length; i++) {
      l1[i].nextMatchId = l2[i]?.id;
    }
  }

  for (let wr = 2; wr <= wbRounds; wr++) {
    const lDropIdx = 2 * (wr - 1) - 1;
    const lDrop = losersByRound[lDropIdx];
    const lPrev = losersByRound[lDropIdx - 1];
    const wRound = wByRound[wr - 1] ?? [];
    if (!lDrop) continue;

    for (let i = 0; i < wRound.length; i++) {
      if (lDrop[i]) wRound[i].loserNextMatchId = lDrop[i].id;
      if (lPrev?.[i] && lDrop[i]) {
        lPrev[i].nextMatchId = lDrop[i].id;
      }
    }
  }

  for (let li = 0; li < totalLosersRounds - 1; li++) {
    const src = losersByRound[li];
    const dst = losersByRound[li + 1];
    if (!src || !dst || src.length === dst.length) continue;

    if (dst.length === 1) {
      for (const m of src) {
        if (!m.nextMatchId) m.nextMatchId = dst[0].id;
      }
    } else if (dst.length === src.length / 2) {
      for (let i = 0; i < dst.length; i++) {
        src[i * 2].nextMatchId = dst[i].id;
        src[i * 2 + 1].nextMatchId = dst[i].id;
      }
    }
  }

  const grandFinalRound = wbRounds + totalLosersRounds;
  const grandFinal: Match = {
    id: 'grand-final',
    round: grandFinalRound,
    player1Id: '',
    player2Id: '',
    completed: false,
    scheduledDate: today(),
    scheduledTime: '20:00',
    status: 'scheduled',
    stage: 'grand_final',
    bracketSide: 'grand_final',
  };

  const wFinal = winners.find((m) => m.stage === 'final');
  const losersFinal = losersByRound[totalLosersRounds - 1]?.[0];
  if (wFinal) {
    wFinal.nextMatchId = grandFinal.id;
    if (losersFinal) wFinal.loserNextMatchId = losersFinal.id;
  }
  if (losersFinal) {
    losersFinal.nextMatchId = grandFinal.id;
  }

  return [...winners, ...losersByRound.flat(), grandFinal];
}
