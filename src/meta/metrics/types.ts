import { RankScope, MetaTimeframe } from '../types/snapshot';

/**
 * Supported Rank Filters for Metrics Calculation
 */
export type MetricRankScope =
  | 'EPIC'
  | 'LEGEND'
  | 'MYTHIC'
  | 'MYTHICAL_HONOR'
  | 'MYTHICAL_GLORY'
  | 'MYTHICAL_IMMORTAL'
  | 'MYTHIC_PLUS'
  | 'GLOBAL';

/**
 * Metric Source Categories
 * Strict separation: Ranked and Pro competitive data are never mixed into one raw metric.
 */
export type MetricSourceCategory =
  | 'RANKED'
  | 'MPL_ID'
  | 'MPL_PH'
  | 'INTERNATIONAL'
  | 'PATCH';

/**
 * Period / Timeframe filters supported by metrics engine
 */
export type MetricPeriod =
  | 'CURRENT_PATCH'
  | 'LAST_7_DAYS'
  | 'LAST_14_DAYS'
  | 'LAST_30_DAYS'
  | 'HISTORICAL';

/**
 * Sample Size Sufficiency Status
 */
export type MetricSampleStatus =
  | 'SUFFICIENT'
  | 'LOW_SAMPLE'
  | 'INSUFFICIENT'
  | 'DEMO_ONLY';

/**
 * Trend Direction
 */
export type MetricTrendDirection =
  | 'RISING'
  | 'STABLE'
  | 'FALLING'
  | 'INSUFFICIENT_DATA';

export interface MetricTrendResult {
  direction: MetricTrendDirection;
  winRateDelta: number | null;
  pickRateDelta: number | null;
  banRateDelta: number | null;
  currentPeriod: string;
  comparisonPeriod: string | null;
  reason?: string;
}

export interface MetricDataQuality {
  status: MetricSampleStatus;
  sampleSize: number;
  dataAgeDays: number;
  completeness: number; // 0 - 100 percentage of required fields present
  isStale: boolean;
  isDemo: boolean;
  notes?: string[];
}

/**
 * Standard Unified Meta Metrics Result (Phase 2C-1)
 */
export interface HeroMetaMetrics {
  heroId: string;
  patch: string;
  rankScope: MetricRankScope;
  region: string;
  period: MetricPeriod | string;
  source: string;
  sourceCategory: MetricSourceCategory;

  // Raw counts
  matches: number;
  wins: number;
  losses: number;
  picks: number;
  bans: number;

  // Calculated rates (null if matches = 0 or denominator unavailable)
  winRate: number | null;
  pickRate: number | null;
  banRate: number | null;
  presenceRate: number | null;

  // Sample and confidence inputs
  sampleSize: number;
  sampleStatus: MetricSampleStatus;
  trend: MetricTrendResult;
  dataQuality: MetricDataQuality;

  collectedAt: string;
  isHistorical: boolean;
}

/**
 * Query filter for computing metrics
 */
export interface MetricFilterOptions {
  heroId?: string;
  patch?: string;
  rankScope?: MetricRankScope | RankScope | string;
  region?: string;
  source?: string;
  sourceCategory?: MetricSourceCategory;
  period?: MetricPeriod | MetaTimeframe | string;
  referenceDate?: string; // YYYY-MM-DD for deterministic testing
  allowDemo?: boolean;
}
