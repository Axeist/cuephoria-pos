import type { Match } from '@/types/tournament.types';

function sameBracketRound(matches: Match[], source: Match): Match[] {
  const side = source.bracketSide ?? 'main';
  return matches
    .filter((m) => m.round === source.round && (m.bracketSide ?? 'main') === side)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function feederSlot(
  feederIndex: number,
  target: Match,
  source: Match,
): 'player1Id' | 'player2Id' {
  if (target.stage === 'grand_final') {
    if (source.bracketSide === 'winners') return 'player1Id';
    if (source.bracketSide === 'losers') return 'player2Id';
  }
  return feederIndex % 2 === 0 ? 'player1Id' : 'player2Id';
}

function placePlayerInTarget(
  matches: Match[],
  targetMatchId: string,
  source: Match,
  playerId: string,
): Match[] {
  if (!playerId) return matches;

  const updated = matches.map((m) => ({ ...m }));
  const targetIndex = updated.findIndex((m) => m.id === targetMatchId);
  if (targetIndex === -1) return updated;

  const peers = sameBracketRound(updated, source);
  const feederIndex = peers.findIndex((m) => m.id === source.id);
  const target = updated[targetIndex];
  const slot = feederSlot(feederIndex, target, source);

  updated[targetIndex] = { ...target, [slot]: playerId };
  return updated;
}

export function advanceWinnerInBracket(
  matches: Match[],
  matchId: string,
  winnerId: string,
  scores?: { score1?: number; score2?: number },
): Match[] {
  const updated = matches.map((m) => ({ ...m }));
  const matchIndex = updated.findIndex((m) => m.id === matchId);
  if (matchIndex === -1) return matches;

  const current = updated[matchIndex];
  const isP1Winner = current.player1Id === winnerId;
  const defaultS1 = scores?.score1 ?? (isP1Winner ? 1 : 0);
  const defaultS2 = scores?.score2 ?? (!isP1Winner ? 1 : 0);

  updated[matchIndex] = {
    ...current,
    winnerId,
    completed: true,
    status: 'completed',
    inProgress: false,
    score1: defaultS1,
    score2: defaultS2,
  };

  const completed = updated[matchIndex];
  let result = updated;

  if (completed.nextMatchId) {
    result = placePlayerInTarget(result, completed.nextMatchId, completed, winnerId);
  }

  const loserId = completed.player1Id === winnerId ? completed.player2Id : completed.player1Id;
  if (loserId && completed.loserNextMatchId) {
    result = placePlayerInTarget(result, completed.loserNextMatchId, completed, loserId);
  }

  return result;
}

/** After generation, push bye winners into their next-round slots. */
export function propagateByeWinners(matches: Match[]): Match[] {
  let updated = matches.map((m) => ({ ...m }));
  const byeMatches = updated.filter((m) => m.bye && m.completed && m.winnerId && m.nextMatchId);

  for (const bye of byeMatches) {
    updated = advanceWinnerInBracket(updated, bye.id, bye.winnerId!, {
      score1: bye.player1Id === bye.winnerId ? 1 : 0,
      score2: bye.player2Id === bye.winnerId ? 1 : 0,
    });
  }
  return updated;
}

export function groupMatchesByRound(matches: Match[]): Record<number, Match[]> {
  return matches.reduce(
    (acc, match) => {
      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    },
    {} as Record<number, Match[]>,
  );
}

export function groupMatchesByBracketSide(matches: Match[]): Record<string, Match[]> {
  return matches.reduce(
    (acc, match) => {
      const side = match.bracketSide ?? 'main';
      if (!acc[side]) acc[side] = [];
      acc[side].push(match);
      return acc;
    },
    {} as Record<string, Match[]>,
  );
}

export function sortRounds(groups: Record<number, Match[]>): number[] {
  return Object.keys(groups)
    .map(Number)
    .sort((a, b) => a - b);
}
