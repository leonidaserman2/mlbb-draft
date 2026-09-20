import { HeroMetaMetrics } from '../metrics/types';
import { RankedSignal, SignalLevel, SignalFilterOptions } from './types';
import { SIGNAL_THRESHOLDS, classifyRate } from './thresholds';

/**
 * Computes Ranked Signal from HeroMetaMetrics
 * Separates winRate, pickRate, banRate, and presenceRate into discrete transparent levels.
 * Does NOT generate an overall numeric score.
 */
export function computeRankedSignal(
  metrics: HeroMetaMetrics,
  filters?: SignalFilterOptions
): RankedSignal {
  const minMatches = SIGNAL_THRESHOLDS.ranked.minSampleSize;
  const isSampleSatisfied =
    metrics.matches >= minMatches &&
    metrics.sampleStatus !== 'INSUFFICIENT' &&
    metrics.winRate !== null;

  // Individual dimension classifications
  const winRateSignal = classifyRate(metrics.winRate, SIGNAL_THRESHOLDS.ranked.winRate, isSampleSatisfied);
  const pickRateSignal = classifyRate(metrics.pickRate, SIGNAL_THRESHOLDS.ranked.pickRate, isSampleSatisfied);
  const banRateSignal = classifyRate(metrics.banRate, SIGNAL_THRESHOLDS.ranked.banRate, isSampleSatisfied);
  const presenceRateSignal = classifyRate(metrics.presenceRate, SIGNAL_THRESHOLDS.ranked.presenceRate, isSampleSatisfied);

  // Determine overall categorical signal level
  let level: SignalLevel = 'INSUFFICIENT_DATA';
  const notes: string[] = [];

  if (!isSampleSatisfied) {
    level = 'INSUFFICIENT_DATA';
    notes.push(
      `Sample size (${metrics.matches} matches) is below minimum threshold (${minMatches}) for reliable ranked signal.`
    );
  } else {
    // Categorical aggregation based on presence and win rate (transparent logic)
    if (banRateSignal === 'VERY_HIGH' || presenceRateSignal === 'VERY_HIGH') {
      level = 'VERY_HIGH';
      notes.push('Very high competitive presence / ban priority in ranked matches.');
    } else if (banRateSignal === 'HIGH' || presenceRateSignal === 'HIGH') {
      level = 'HIGH';
      notes.push('High pick/ban priority and active meta presence.');
    } else if (presenceRateSignal === 'MEDIUM' || (winRateSignal === 'HIGH' && presenceRateSignal !== 'VERY_LOW')) {
      level = 'MEDIUM';
      notes.push('Moderate meta presence with stable pick volume.');
    } else if (presenceRateSignal === 'LOW' || winRateSignal === 'LOW') {
      level = 'LOW';
      notes.push('Low meta presence or below-average draft contention.');
    } else {
      level = 'VERY_LOW';
      notes.push('Very low draft footprint and minimal ranked contention.');
    }

    if (winRateSignal === 'VERY_HIGH') {
      notes.push(`High win rate (${metrics.winRate?.toFixed(2)}%) indicates strong match performance.`);
    } else if (winRateSignal === 'VERY_LOW') {
      notes.push(`Low win rate (${metrics.winRate?.toFixed(2)}%) reflects potential draft or meta struggles.`);
    }
  }

  return {
    heroId: metrics.heroId,
    level,
    winRateSignal,
    pickRateSignal,
    banRateSignal,
    presenceRateSignal,
    rawWinRate: metrics.winRate,
    rawPickRate: metrics.pickRate,
    rawBanRate: metrics.banRate,
    rawPresenceRate: metrics.presenceRate,
    matches: metrics.matches,
    sampleSize: metrics.sampleSize,
    rankScope: metrics.rankScope,
    period: filters?.period || metrics.period,
    patch: metrics.patch,
    sampleStatus: metrics.sampleStatus,
    notes,
  };
}
