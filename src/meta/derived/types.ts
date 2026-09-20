import { MetaMode } from '../types/snapshot';

/**
 * DERIVED DATA LAYER
 * Mathematical calculations derived from normalized snapshots or match records.
 * Keeps calculation logic completely separate from raw and normalized records.
 * Note: Subjective meta scoring, S/A/B tiers, and draft recommendations are strictly deferred to future phases.
 */

export interface DerivedHeroMetaMetrics {
  heroId: string;
  patch: string;
  mode: MetaMode;
  totalMatches: number;
  totalPicks: number;
  totalBans: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;        // in % (0 - 100)
  pickRate: number;       // in % (0 - 100)
  banRate: number;        // in % (0 - 100)
  presenceRate: number;   // in % (0 - 100)
  winLossRatio: number;   // ratio wins / losses (or wins if losses is 0)
  sampleSampleSizeAdequate: boolean; // flag if matches >= threshold
  calculatedAt: string;   // ISO timestamp
}

export interface DerivedMetricTrend {
  heroId: string;
  metric: 'winRate' | 'pickRate' | 'banRate' | 'presenceRate';
  previousValue: number;
  currentValue: number;
  delta: number; // currentValue - previousValue
  direction: 'UP' | 'DOWN' | 'STABLE';
}
