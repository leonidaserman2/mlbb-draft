import { SignalLevel } from './types';

/**
 * Centralized & Configurable Signal Engine Thresholds (Phase 2C-2)
 * All thresholds are defined here to eliminate scattered hardcoding.
 */
export const SIGNAL_THRESHOLDS = {
  ranked: {
    minSampleSize: 100, // Below this, ranked signal evaluates to INSUFFICIENT_DATA
    winRate: {
      veryHigh: 53.5,
      high: 51.5,
      medium: 49.5,
      low: 47.0,
      // below low is VERY_LOW
    },
    pickRate: {
      veryHigh: 7.0,
      high: 3.5,
      medium: 1.5,
      low: 0.5,
      // below low is VERY_LOW
    },
    banRate: {
      veryHigh: 50.0,
      high: 20.0,
      medium: 5.0,
      low: 1.0,
      // below low is VERY_LOW
    },
    presenceRate: {
      veryHigh: 60.0,
      high: 25.0,
      medium: 10.0,
      low: 3.0,
      // below low is VERY_LOW
    },
  },
  pro: {
    minTournamentGames: 5, // Minimum tournament games in scope to evaluate pro signals
    presenceRate: {
      veryHigh: 75.0,
      high: 50.0,
      medium: 25.0,
      low: 10.0,
      // below low is VERY_LOW
    },
    banRate: {
      veryHigh: 50.0,
      high: 30.0,
      medium: 15.0,
      low: 5.0,
    },
  },
  sample: {
    sufficientRankedMatches: 500,
    lowSampleRankedMatches: 100,
    sufficientProMatches: 15,
    lowSampleProMatches: 5,
    maxDataAgeDaysRanked: 14,
    maxDataAgeDaysPro: 30,
    minCompletenessPercent: 80,
  },
  trend: {
    significantDeltaPercent: 1.5,
  },
} as const;

/**
 * Evaluates any numeric rate against a 4-boundary tier configuration
 */
export function classifyRate(
  value: number | null | undefined,
  tiers: { veryHigh: number; high: number; medium: number; low: number },
  minSampleSatisfied: boolean = true
): SignalLevel {
  if (!minSampleSatisfied || value === null || value === undefined || isNaN(value)) {
    return 'INSUFFICIENT_DATA';
  }

  if (value >= tiers.veryHigh) return 'VERY_HIGH';
  if (value >= tiers.high) return 'HIGH';
  if (value >= tiers.medium) return 'MEDIUM';
  if (value >= tiers.low) return 'LOW';
  return 'VERY_LOW';
}
