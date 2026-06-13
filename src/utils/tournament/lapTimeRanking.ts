import type { LapTimeEntry, Player, Tournament } from '@/types/tournament.types';

export type LapTimeRankRow = {
  player: Player;
  bestLapMs: number;
  bestEntry: LapTimeEntry;
  attemptCount: number;
  rank: number;
};

export function rankPlayersByLapTime(
  players: Player[],
  lapTimes: LapTimeEntry[],
  bestLapCount = 1,
): LapTimeRankRow[] {
  const valid = lapTimes.filter((e) => !e.invalidated && e.lapTimeMs > 0);
  const rows: LapTimeRankRow[] = [];

  for (const player of players) {
    const playerLaps = valid
      .filter((e) => e.playerId === player.id)
      .sort((a, b) => a.lapTimeMs - b.lapTimeMs);
    if (playerLaps.length === 0) continue;

    const considered = playerLaps.slice(0, Math.max(1, bestLapCount));
    const best = considered[0];
    rows.push({
      player,
      bestLapMs: best.lapTimeMs,
      bestEntry: best,
      attemptCount: playerLaps.length,
      rank: 0,
    });
  }

  rows.sort((a, b) => a.bestLapMs - b.bestLapMs);
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}

export function computeTimeTrialWinners(
  tournament: Tournament,
): { winner?: Player; runnerUp?: Player; thirdPlace?: Player } {
  const bestLapCount = tournament.formatOptions?.bestLapCount ?? 1;
  const ranked = rankPlayersByLapTime(
    tournament.players,
    tournament.lapTimes ?? [],
    bestLapCount,
  );
  return {
    winner: ranked[0]?.player,
    runnerUp: ranked[1]?.player,
    thirdPlace: ranked[2]?.player,
  };
}

export function isTimeTrialFormat(format: string): boolean {
  return format === 'time_trial';
}
