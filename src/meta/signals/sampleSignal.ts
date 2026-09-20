import { MetricDataQuality, HeroMetaMetrics } from '../metrics/types';
import { SampleSignal, SampleSignalType } from './types';

/**
 * Computes Sample and Data Quality Signal
 * Preserves low-sample records while transparently tagging reliability.
 */
export function computeSampleSignal(
  source: HeroMetaMetrics | MetricDataQuality,
  heroId: string = ''
): SampleSignal {
  const quality: MetricDataQuality = 'dataQuality' in source ? source.dataQuality : source;
  const id = 'heroId' in source ? source.heroId : heroId;

  let status: SampleSignalType = 'INSUFFICIENT';
  let confidenceRating: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNUSABLE' = 'LOW';
  const notes: string[] = [];

  if (quality.isDemo) {
    status = 'DEMO_ONLY';
    confidenceRating = 'UNUSABLE';
    notes.push('Data tagged as synthetic / DEMO_ONLY; must NOT be considered live competitive meta.');
  } else if (quality.isStale) {
    status = 'STALE';
    confidenceRating = 'LOW';
    notes.push(`Data age (${quality.dataAgeDays} days) exceeds maximum freshness threshold.`);
  } else if (quality.status === 'SUFFICIENT') {
    status = 'SUFFICIENT';
    confidenceRating = 'HIGH';
    notes.push(`Statistically robust sample size (${quality.sampleSize} matches) with ${quality.completeness}% field completeness.`);
  } else if (quality.status === 'LOW_SAMPLE') {
    status = 'LOW_SAMPLE';
    confidenceRating = 'MEDIUM';
    notes.push(`Limited sample size (${quality.sampleSize} matches); usable with caution.`);
  } else {
    status = 'INSUFFICIENT';
    confidenceRating = 'UNUSABLE';
    notes.push(`Insufficient sample size (${quality.sampleSize} matches) for statistically reliable conclusions.`);
  }

  return {
    heroId: id,
    status,
    sampleSize: quality.sampleSize,
    completeness: quality.completeness,
    dataAgeDays: quality.dataAgeDays,
    isStale: quality.isStale,
    isDemo: quality.isDemo,
    confidenceRating,
    notes,
  };
}
