import { HeroMetaMetrics, MetricSourceCategory } from '../metrics/types';
import { ProSignal, SignalLevel, SignalFilterOptions } from './types';
import { SIGNAL_THRESHOLDS, classifyRate } from './thresholds';

/**
 * Computes Pro Tournament Signal for a specific competitive tournament category
 * Strictly isolates pro data from ranked data.
 */
export function computeProSignal(
  metrics: HeroMetaMetrics,
  tournamentCategory: MetricSourceCategory,
  tournamentName: string = tournamentCategory,
  filters?: SignalFilterOptions
): ProSignal {
  const minGames = SIGNAL_THRESHOLDS.pro.minTournamentGames;
  const tournamentGames = metrics.sampleSize; // In pro metrics, sampleSize represents total tournament games in scope
  const isSampleSatisfied =
    tournamentGames >= minGames &&
    metrics.sampleStatus !== 'INSUFFICIENT' &&
    metrics.presenceRate !== null;

  let level: SignalLevel = 'INSUFFICIENT_DATA';
  const notes: string[] = [];

  if (!isSampleSatisfied) {
    level = 'INSUFFICIENT_DATA';
    notes.push(
      `Insufficient tournament game sample (${tournamentGames}/${minGames} games) in ${tournamentName}.`
    );
  } else {
    level = classifyRate(metrics.presenceRate, SIGNAL_THRESHOLDS.pro.presenceRate, true);

    if (level === 'VERY_HIGH') {
      notes.push(`Dominant priority pick/ban presence (${metrics.presenceRate?.toFixed(1)}%) in ${tournamentName}.`);
    } else if (level === 'HIGH') {
      notes.push(`High competitive contention (${metrics.presenceRate?.toFixed(1)}% presence) in ${tournamentName}.`);
    } else if (level === 'MEDIUM') {
      notes.push(`Flex / situational priority (${metrics.presenceRate?.toFixed(1)}% presence) in ${tournamentName}.`);
    } else if (level === 'LOW') {
      notes.push(`Niche or pocket pick with limited appearance in ${tournamentName}.`);
    } else {
      notes.push(`Uncontested / zero presence in recorded ${tournamentName} games.`);
    }

    if (metrics.banRate !== null && metrics.banRate >= SIGNAL_THRESHOLDS.pro.banRate.high) {
      notes.push(`Heavily targeted in ban phase (${metrics.banRate.toFixed(1)}% ban rate).`);
    }
  }

  return {
    heroId: metrics.heroId,
    level,
    tournamentCategory,
    tournamentName,
    pickPresenceRate: metrics.pickRate,
    banPresenceRate: metrics.banRate,
    totalPresenceRate: metrics.presenceRate,
    winRate: metrics.winRate,
    picks: metrics.picks,
    bans: metrics.bans,
    matches: metrics.matches,
    tournamentGames,
    sampleSize: tournamentGames,
    period: filters?.period || metrics.period,
    patch: metrics.patch,
    notes,
  };
}
