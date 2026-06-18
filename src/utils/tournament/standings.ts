import type { Match, Player, TournamentFormat } from '@/types/tournament.types';

const STANDINGS_FORMATS: TournamentFormat[] = ['league', 'round_robin', 'swiss'];

export function isStandingsFormat(format?: TournamentFormat): boolean {
  return !!format && STANDINGS_FORMATS.includes(format);
}

export function playableMatches(matches: Match[]): Match[] {
  return matches.filter((m) => !m.bye && m.player1Id && m.player2Id);
}

export function allPlayableMatchesComplete(matches: Match[]): boolean {
  const playable = playableMatches(matches);
  return playable.length > 0 && playable.every((m) => m.completed);
}

export type StandingRow = { player: Player; wins: number };

export function computeStandings(matches: Match[], players: Player[]): StandingRow[] {
  const wins: Record<string, number> = {};
  for (const player of players) wins[player.id] = 0;

  for (const match of matches) {
    if (match.completed && match.winnerId && match.player1Id && match.player2Id) {
      wins[match.winnerId] = (wins[match.winnerId] ?? 0) + 1;
    }
  }

  return players
    .map((player) => ({ player, wins: wins[player.id] ?? 0 }))
    .sort((a, b) => b.wins - a.wins || a.player.name.localeCompare(b.player.name));
}

export function standingsChampion(matches: Match[], players: Player[], format?: TournamentFormat): Player | undefined {
  if (!isStandingsFormat(format) || !allPlayableMatchesComplete(matches)) return undefined;

  const standings = computeStandings(matches, players);
  if (standings.length === 0) return undefined;

  const topWins = standings[0].wins;
  const tiedAtTop = standings.filter((row) => row.wins === topWins);
  if (tiedAtTop.length !== 1) return undefined;

  return tiedAtTop[0].player;
}

export function standingsRunnerUp(matches: Match[], players: Player[], format?: TournamentFormat): Player | undefined {
  if (!isStandingsFormat(format) || !allPlayableMatchesComplete(matches)) return undefined;

  const standings = computeStandings(matches, players);
  if (standings.length < 2) return undefined;

  const topWins = standings[0].wins;
  if (standings.filter((row) => row.wins === topWins).length !== 1) return undefined;

  const secondWins = standings[1].wins;
  const tiedAtSecond = standings.filter((row) => row.wins === secondWins);
  if (tiedAtSecond.length !== 1) return undefined;

  return tiedAtSecond[0].player;
}
