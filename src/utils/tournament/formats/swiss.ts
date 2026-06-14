import type { Match, Player } from '@/types/tournament.types';
import { computeStandings } from '../standings';

const today = () => new Date().toISOString().split('T')[0];

function havePlayed(aId: string, bId: string, matches: Match[]): boolean {
  return matches.some(
    (m) =>
      m.completed &&
      ((m.player1Id === aId && m.player2Id === bId) || (m.player1Id === bId && m.player2Id === aId)),
  );
}

function pickOpponent(
  player: Player,
  standings: ReturnType<typeof computeStandings>,
  existing: Match[],
  paired: Set<string>,
): Player | undefined {
  const candidates = standings
    .map((row) => row.player)
    .filter((p) => p.id !== player.id && !paired.has(p.id));

  for (const candidate of candidates) {
    if (!havePlayed(player.id, candidate.id, existing)) return candidate;
  }
  return candidates[0];
}

function createSwissRoundMatches(players: Player[], round: number, priorMatches: Match[]): Match[] {
  const standings = computeStandings(priorMatches, players);
  const ordered =
    round === 1
      ? [...players].sort(() => Math.random() - 0.5)
      : standings.map((row) => row.player);

  const paired = new Set<string>();
  const matches: Match[] = [];
  let matchId = priorMatches.filter((m) => m.id.startsWith('swiss-match-')).length + 1;

  for (const player of ordered) {
    if (paired.has(player.id)) continue;

    const opponent = pickOpponent(player, standings, priorMatches, paired);
    if (!opponent) continue;

    paired.add(player.id);
    paired.add(opponent.id);

    matches.push({
      id: `swiss-match-${matchId++}`,
      round,
      swissRound: round,
      player1Id: player.id,
      player2Id: opponent.id,
      completed: false,
      scheduledDate: today(),
      scheduledTime: `${16 + (paired.size % 4)}:00`,
      status: 'scheduled',
      stage: 'regular',
      bracketSide: 'main',
    });
  }

  const unpaired = ordered.find((p) => !paired.has(p.id));
  if (unpaired) {
    matches.push({
      id: `swiss-bye-${round}`,
      round,
      swissRound: round,
      player1Id: unpaired.id,
      player2Id: '',
      completed: true,
      winnerId: unpaired.id,
      scheduledDate: today(),
      scheduledTime: '16:00',
      status: 'completed',
      stage: 'regular',
      bracketSide: 'main',
      bye: true,
    });
  }

  return matches;
}

/** Swiss — round 1 generated upfront; later rounds added when prior round completes. */
export function generateSwissMatches(players: Player[], _rounds = 3): Match[] {
  if (players.length < 2) return [];
  return createSwissRoundMatches(players, 1, []);
}

export function swissRoundMatches(matches: Match[], round: number): Match[] {
  return matches.filter((m) => (m.swissRound ?? m.round) === round);
}

export function isSwissRoundComplete(matches: Match[], round: number): boolean {
  const roundMatches = swissRoundMatches(matches, round);
  const playable = roundMatches.filter((m) => !m.bye && m.player1Id && m.player2Id);
  return playable.length > 0 && playable.every((m) => m.completed);
}

export function maybeAppendNextSwissRound(
  players: Player[],
  matches: Match[],
  totalRounds: number,
): Match[] {
  const maxRound = Math.max(0, ...matches.map((m) => m.swissRound ?? m.round));
  if (maxRound >= totalRounds) return matches;
  if (!isSwissRoundComplete(matches, maxRound)) return matches;
  if (matches.some((m) => (m.swissRound ?? m.round) === maxRound + 1)) return matches;

  return [...matches, ...createSwissRoundMatches(players, maxRound + 1, matches)];
}
