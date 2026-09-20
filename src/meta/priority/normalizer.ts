import {
  SignalLevel,
  TrendSignal,
  PatchSignal,
  SampleSignal,
  ProSignal,
} from '../signals/types';
import { PriorityConfidence } from './types';

/**
 * Categorical Signal Level to Normalized Numeric Score (0 - 100)
 * Uniform across all heroes; no hero-specific heuristics or overrides.
 *
 * Mapping Table:
 * VERY_HIGH       -> 95
 * HIGH            -> 80
 * MEDIUM          -> 50
 * LOW             -> 25
 * VERY_LOW        -> 10
 * INSUFFICIENT    -> 30 (Conservative baseline)
 */
export function signalLevelToScore(level: SignalLevel): number {
  switch (level) {
    case 'VERY_HIGH':
      return 95;
    case 'HIGH':
      return 80;
    case 'MEDIUM':
      return 50;
    case 'LOW':
      return 25;
    case 'VERY_LOW':
      return 10;
    case 'INSUFFICIENT_DATA':
    default:
      return 30;
  }
}

/**
 * Normalizes Pro Tournament Signal to 0 - 100 score.
 * Returns null if the tournament category has no valid data or insufficient games.
 */
export function proSignalToScore(proSignal: ProSignal): number | null {
  if (proSignal.level === 'INSUFFICIENT_DATA' || proSignal.tournamentGames === 0) {
    return null;
  }
  return signalLevelToScore(proSignal.level);
}

/**
 * Normalizes Trend Signal to 0 - 100 score.
 * Trend is a secondary modifier and does not imply hero viability in isolation.
 *
 * RISING           -> 75 (dynamically bounded between 65 and 85 if winRateDelta available)
 * STABLE           -> 50 (neutral point)
 * FALLING          -> 25 (dynamically bounded between 15 and 35 if winRateDelta available)
 * INSUFFICIENT     -> 50 (neutral baseline, zero artificial penalty)
 */
export function trendSignalToScore(trendSignal: TrendSignal): number {
  switch (trendSignal.direction) {
    case 'RISING': {
      if (trendSignal.winRateDelta !== null) {
        const adjusted = 75 + Math.min(Math.max(trendSignal.winRateDelta * 2, -10), 15);
        return Math.round(Math.min(Math.max(adjusted, 60), 90));
      }
      return 75;
    }
    case 'FALLING': {
      if (trendSignal.winRateDelta !== null) {
        const adjusted = 25 + Math.min(Math.max(trendSignal.winRateDelta * 2, -15), 10);
        return Math.round(Math.min(Math.max(adjusted, 10), 40));
      }
      return 25;
    }
    case 'STABLE':
    case 'INSUFFICIENT_DATA':
    default:
      return 50;
  }
}

/**
 * Normalizes Patch Signal to 0 - 100 score.
 * Patch status provides minor contextual adjustment (BUFF ≠ automatically top meta).
 *
 * BUFF        -> 75
 * NERF        -> 25
 * ADJUSTMENT  -> 50
 * NO_CHANGE   -> 50
 * UNKNOWN     -> 50
 */
export function patchSignalToScore(patchSignal: PatchSignal): number {
  switch (patchSignal.change) {
    case 'BUFF':
      return 75;
    case 'NERF':
      return 25;
    case 'ADJUSTMENT':
    case 'NO_CHANGE':
    case 'UNKNOWN':
    default:
      return 50;
  }
}

/**
 * Normalizes Data Quality & Sample Signal to 0 - 100 score.
 *
 * SUFFICIENT    -> 100
 * LOW_SAMPLE    -> 60
 * STALE         -> 40
 * INSUFFICIENT  -> 20
 * DEMO_ONLY     -> 10
 */
export function sampleSignalToScore(sampleSignal: SampleSignal): number {
  if (sampleSignal.isDemo || sampleSignal.status === 'DEMO_ONLY') {
    return 10;
  }
  switch (sampleSignal.status) {
    case 'SUFFICIENT':
      return 100;
    case 'LOW_SAMPLE':
      return 60;
    case 'STALE':
      return 40;
    case 'INSUFFICIENT':
    default:
      return 20;
  }
}

/**
 * Determines Confidence Rating independently from the Priority Score.
 * Confidence reflects the statistical reliability of the data backing the priority.
 */
export function determineConfidence(
  sampleSignal: SampleSignal,
  rankedMatches: number
): PriorityConfidence {
  if (sampleSignal.isDemo || sampleSignal.status === 'DEMO_ONLY') {
    return 'UNUSABLE';
  }
  if (sampleSignal.status === 'INSUFFICIENT' || rankedMatches < 100) {
    return 'LOW';
  }
  if (sampleSignal.isStale || sampleSignal.status === 'STALE') {
    return 'LOW';
  }
  if (sampleSignal.status === 'LOW_SAMPLE' || rankedMatches < 500) {
    return 'MEDIUM';
  }
  return 'HIGH';
}
