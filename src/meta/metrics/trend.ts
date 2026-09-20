import { MetricTrendResult, MetricTrendDirection } from './types';
import { METRIC_THRESHOLDS } from './thresholds';

export interface TrendInputMetric {
  matches: number;
  winRate: number | null;
  pickRate: number | null;
  banRate: number | null;
  periodName: string;
}

/**
 * Calculates trend direction comparing a recent period metric with a previous period metric.
 * Transparent and purely statistical (no AI / black-box).
 */
export function calculateMetricTrend(
  recent: TrendInputMetric | null | undefined,
  previous: TrendInputMetric | null | undefined,
  mode: 'RANKED' | 'PRO' = 'RANKED'
): MetricTrendResult {
  const minMatches = mode === 'PRO'
    ? METRIC_THRESHOLDS.trend.minMatchesPro
    : METRIC_THRESHOLDS.trend.minMatchesRanked;

  const currentPeriod = recent?.periodName || 'CURRENT';

  // 1. Missing data check
  if (!recent || !previous) {
    return {
      direction: 'INSUFFICIENT_DATA',
      winRateDelta: null,
      pickRateDelta: null,
      banRateDelta: null,
      currentPeriod,
      comparisonPeriod: null,
      reason: 'No comparison data available for trend analysis.',
    };
  }

  // 2. Minimum sample size check
  if (recent.matches < minMatches || previous.matches < minMatches) {
    return {
      direction: 'INSUFFICIENT_DATA',
      winRateDelta: null,
      pickRateDelta: null,
      banRateDelta: null,
      currentPeriod,
      comparisonPeriod: previous.periodName,
      reason: `Insufficient sample in one or both periods (recent: ${recent.matches}, previous: ${previous.matches}, min: ${minMatches}).`,
    };
  }

  // 3. Calculate deltas
  const winRateDelta = (recent.winRate !== null && previous.winRate !== null)
    ? Number((recent.winRate - previous.winRate).toFixed(2))
    : null;

  const pickRateDelta = (recent.pickRate !== null && previous.pickRate !== null)
    ? Number((recent.pickRate - previous.pickRate).toFixed(2))
    : null;

  const banRateDelta = (recent.banRate !== null && previous.banRate !== null)
    ? Number((recent.banRate - previous.banRate).toFixed(2))
    : null;

  // 4. Determine direction based on significant delta threshold
  const threshold = METRIC_THRESHOLDS.trend.significantDelta;
  let direction: MetricTrendDirection = 'STABLE';

  // We evaluate primary indicators: win rate delta and pick rate delta
  if (winRateDelta !== null && Math.abs(winRateDelta) >= threshold) {
    direction = winRateDelta > 0 ? 'RISING' : 'FALLING';
  } else if (pickRateDelta !== null && Math.abs(pickRateDelta) >= threshold) {
    direction = pickRateDelta > 0 ? 'RISING' : 'FALLING';
  } else if (banRateDelta !== null && Math.abs(banRateDelta) >= threshold) {
    direction = banRateDelta > 0 ? 'RISING' : 'FALLING';
  }

  return {
    direction,
    winRateDelta,
    pickRateDelta,
    banRateDelta,
    currentPeriod,
    comparisonPeriod: previous.periodName,
  };
}
