import { MetricTrendResult, HeroMetaMetrics } from '../metrics/types';
import { TrendSignal, TrendSignalType } from './types';

/**
 * Computes Trend Signal from 2C-1 trend calculation
 * IMPORTANT: RISING only indicates upward trajectory of metrics.
 * It does NOT automatically mean the hero is "good" or high tier.
 */
export function computeTrendSignal(
  source: HeroMetaMetrics | MetricTrendResult,
  heroId: string = ''
): TrendSignal {
  const trend: MetricTrendResult = 'trend' in source ? source.trend : source;
  const id = 'heroId' in source ? source.heroId : heroId;

  let direction: TrendSignalType = 'INSUFFICIENT_DATA';
  switch (trend.direction) {
    case 'RISING':
      direction = 'RISING';
      break;
    case 'FALLING':
      direction = 'FALLING';
      break;
    case 'STABLE':
      direction = 'STABLE';
      break;
    case 'INSUFFICIENT_DATA':
    default:
      direction = 'INSUFFICIENT_DATA';
      break;
  }

  const reason = trend.reason || (
    direction === 'RISING'
      ? `Metrics improved (+${trend.winRateDelta !== null ? trend.winRateDelta.toFixed(2) + '% WR' : ''} / +${trend.pickRateDelta !== null ? trend.pickRateDelta.toFixed(2) + '% PR' : ''}) compared to ${trend.comparisonPeriod || 'previous period'}.`
      : direction === 'FALLING'
      ? `Metrics declined (${trend.winRateDelta !== null ? trend.winRateDelta.toFixed(2) + '% WR' : ''} / ${trend.pickRateDelta !== null ? trend.pickRateDelta.toFixed(2) + '% PR' : ''}) compared to ${trend.comparisonPeriod || 'previous period'}.`
      : direction === 'STABLE'
      ? `Metrics remain steady within ±1.5% delta compared to ${trend.comparisonPeriod || 'previous period'}.`
      : 'Insufficient comparison sample or missing period data to establish a statistical trend.'
  );

  return {
    heroId: id,
    direction,
    winRateDelta: trend.winRateDelta,
    pickRateDelta: trend.pickRateDelta,
    banRateDelta: trend.banRateDelta,
    currentPeriod: trend.currentPeriod,
    comparisonPeriod: trend.comparisonPeriod,
    reason,
    disclaimer:
      'Trend direction strictly represents mathematical change over time; RISING indicates an upward metric trajectory, not guaranteed hero viability.',
  };
}
