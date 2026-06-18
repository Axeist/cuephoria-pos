import type { FormatOptions, Match, Player, TournamentFormat } from '@/types/tournament.types';
import { generateCustomMatches, generateLeagueMatches } from './custom';
import { generateDoubleEliminationMatches } from './doubleElimination';
import { generateRoundRobinMatches } from './roundRobin';
import { generateSingleEliminationMatches } from './singleElimination';
import { generateSwissMatches } from './swiss';

export type FixtureOptions = FormatOptions & {
  seeded?: boolean;
};

export function generateFixtures(
  format: TournamentFormat,
  players: Player[],
  options: FixtureOptions = {},
): Match[] {
  switch (format) {
    case 'knockout':
      return generateSingleEliminationMatches(players, options.seeded);
    case 'league':
      return generateLeagueMatches(players);
    case 'double_elimination':
      return generateDoubleEliminationMatches(players);
    case 'round_robin':
      return generateRoundRobinMatches(players);
    case 'swiss':
      return generateSwissMatches(players, options.swissRounds ?? 3);
    case 'custom':
      return generateCustomMatches(players);
    case 'time_trial':
      return [];
    default:
      return generateSingleEliminationMatches(players, options.seeded);
  }
}

export { generateSingleEliminationMatches } from './singleElimination';
export { generateDoubleEliminationMatches } from './doubleElimination';
export { generateRoundRobinMatches } from './roundRobin';
export { generateSwissMatches } from './swiss';
export { generateCustomMatches, generateLeagueMatches } from './custom';
