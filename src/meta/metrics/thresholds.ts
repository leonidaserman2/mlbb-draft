/**
 * Centralized Thresholds Configuration for Meta Metrics (Phase 2C-1)
 * All thresholds are defined here rather than hardcoded in multiple files.
 */
export interface MetricThresholdsConfig {
  ranked: {
    sufficientSampleMatches: number;
    lowSampleMatches: number;
    staleAgeDays: number;
  };
  pro: {
    sufficientSampleMatches: number;
    lowSampleMatches: number;
    staleAgeDays: number;
  };
  trend: {
    /**
     * Minimum change in percentage points to consider RISING or FALLING
     */
    significantDelta: number; // e.g. 1.5%
    /**
     * Minimum matches required in each period to calculate a valid trend
     */
    minMatchesRanked: number;
    minMatchesPro: number;
  };
}

export const METRIC_THRESHOLDS: MetricThresholdsConfig = {
  ranked: {
    sufficientSampleMatches: 500, // Matches >= 500 is SUFFICIENT
    lowSampleMatches: 100,        // Matches between 100 and 499 is LOW_SAMPLE; < 100 is INSUFFICIENT
    staleAgeDays: 14,             // Older than 14 days is considered stale
  },
  pro: {
    sufficientSampleMatches: 15,  // Tournament matches >= 15 is SUFFICIENT
    lowSampleMatches: 5,          // Matches between 5 and 14 is LOW_SAMPLE; < 5 is INSUFFICIENT
    staleAgeDays: 30,             // Pro tourney logs valid for current stage (~30 days)
  },
  trend: {
    significantDelta: 1.5,        // +/- 1.5% delta
    minMatchesRanked: 100,        // Need at least 100 matches in each period for ranked trend
    minMatchesPro: 5,             // Need at least 5 games in each period for pro trend
  },
};
