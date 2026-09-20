import { NormalizedMetaRecord, NormalizedProRecord } from '../normalized/types';
import { DerivedHeroMetaMetrics, DerivedMetricTrend } from './types';
import { MetaMode } from '../types/snapshot';

/**
 * Derives aggregate metrics for a hero from multiple normalized snapshots.
 * Does not mutate input objects.
 */
export function deriveMetricsFromSnapshots(
  heroId: string,
  snapshots: NormalizedMetaRecord[]
): DerivedHeroMetaMetrics | null {
  const heroSnapshots = snapshots.filter((s) => s.heroId === heroId);
  if (heroSnapshots.length === 0) return null;

  let totalMatches = 0;
  let totalPicks = 0;
  let totalBans = 0;
  let totalWins = 0;
  let totalLosses = 0;

  const patch = heroSnapshots[0].patch;
  const mode: MetaMode = heroSnapshots[0].mode;

  for (const snap of heroSnapshots) {
    totalMatches += snap.matches;
    totalPicks += snap.picks;
    totalBans += snap.bans;
    totalWins += snap.wins;
    totalLosses += snap.losses;
  }

  const winRate = totalPicks > 0 ? Number(((totalWins / totalPicks) * 100).toFixed(2)) : 0;
  const pickRate = totalMatches > 0 ? Number(((totalPicks / totalMatches) * 100).toFixed(2)) : 0;
  const banRate = totalMatches > 0 ? Number(((totalBans / totalMatches) * 100).toFixed(2)) : 0;
  const presenceRate = Number((pickRate + banRate).toFixed(2));
  const winLossRatio = totalLosses > 0 ? Number((totalWins / totalLosses).toFixed(2)) : totalWins;

  return {
    heroId,
    patch,
    mode,
    totalMatches,
    totalPicks,
    totalBans,
    totalWins,
    totalLosses,
    winRate,
    pickRate,
    banRate,
    presenceRate,
    winLossRatio,
    sampleSampleSizeAdequate: totalMatches >= 50,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Derives metrics for a hero from a list of granular Pro Match records
 */
export function deriveMetricsFromProMatches(
  heroId: string,
  matches: NormalizedProRecord[],
  totalTournamentGames: number
): DerivedHeroMetaMetrics | null {
  const heroMatches = matches.filter((m) => m.heroId === heroId);
  if (heroMatches.length === 0 && totalTournamentGames === 0) return null;

  const picks = heroMatches.filter((m) => m.picked).length;
  const bans = heroMatches.filter((m) => m.banned).length;
  const wins = heroMatches.filter((m) => m.picked && m.win).length;
  const losses = picks - wins;

  const patch = heroMatches[0]?.patch || 'UNKNOWN';

  const pickRate = totalTournamentGames > 0 ? Number(((picks / totalTournamentGames) * 100).toFixed(2)) : 0;
  const banRate = totalTournamentGames > 0 ? Number(((bans / totalTournamentGames) * 100).toFixed(2)) : 0;
  const winRate = picks > 0 ? Number(((wins / picks) * 100).toFixed(2)) : 0;
  const presenceRate = Number((pickRate + banRate).toFixed(2));
  const winLossRatio = losses > 0 ? Number((wins / losses).toFixed(2)) : wins;

  return {
    heroId,
    patch,
    mode: 'PRO',
    totalMatches: totalTournamentGames,
    totalPicks: picks,
    totalBans: bans,
    totalWins: wins,
    totalLosses: losses,
    winRate,
    pickRate,
    banRate,
    presenceRate,
    winLossRatio,
    sampleSampleSizeAdequate: totalTournamentGames >= 20,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Calculates trend delta between previous and current metric value
 */
export function calculateMetricTrend(
  heroId: string,
  metric: 'winRate' | 'pickRate' | 'banRate' | 'presenceRate',
  previousValue: number,
  currentValue: number
): DerivedMetricTrend {
  const delta = Number((currentValue - previousValue).toFixed(2));
  let direction: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
  if (delta > 0.05) direction = 'UP';
  else if (delta < -0.05) direction = 'DOWN';

  return {
    heroId,
    metric,
    previousValue,
    currentValue,
    delta,
    direction,
  };
}
