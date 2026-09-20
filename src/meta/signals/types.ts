import { MetricRankScope, MetricSourceCategory, MetricSampleStatus, MetricPeriod } from '../metrics/types';

/**
 * Categorical Signal Strength Levels
 * Transparent, threshold-grounded classification.
 * Strictly no opaque overall scores.
 */
export type SignalLevel =
  | 'VERY_LOW'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'VERY_HIGH'
  | 'INSUFFICIENT_DATA';

/**
 * Patch Hero Change Types
 */
export type PatchSignalType =
  | 'BUFF'
  | 'NERF'
  | 'ADJUSTMENT'
  | 'NO_CHANGE'
  | 'UNKNOWN';

/**
 * Trend Signal Directions
 */
export type TrendSignalType =
  | 'RISING'
  | 'STABLE'
  | 'FALLING'
  | 'INSUFFICIENT_DATA';

/**
 * Sample Quality Signal Status
 */
export type SampleSignalType =
  | 'SUFFICIENT'
  | 'LOW_SAMPLE'
  | 'INSUFFICIENT'
  | 'DEMO_ONLY'
  | 'STALE';

/**
 * Detailed Ranked Signal for a Hero
 */
export interface RankedSignal {
  heroId: string;
  level: SignalLevel;
  winRateSignal: SignalLevel;
  pickRateSignal: SignalLevel;
  banRateSignal: SignalLevel;
  presenceRateSignal: SignalLevel;
  rawWinRate: number | null;
  rawPickRate: number | null;
  rawBanRate: number | null;
  rawPresenceRate: number | null;
  matches: number;
  sampleSize: number;
  rankScope: MetricRankScope;
  period: MetricPeriod | string;
  patch: string;
  sampleStatus: MetricSampleStatus;
  notes: string[];
}

/**
 * Pro Tournament Signal for a Specific Tournament/Region
 */
export interface ProSignal {
  heroId: string;
  level: SignalLevel;
  tournamentCategory: MetricSourceCategory; // 'MPL_ID' | 'MPL_PH' | 'INTERNATIONAL'
  tournamentName: string;
  pickPresenceRate: number | null;
  banPresenceRate: number | null;
  totalPresenceRate: number | null;
  winRate: number | null;
  picks: number;
  bans: number;
  matches: number;
  tournamentGames: number;
  sampleSize: number;
  period: MetricPeriod | string;
  patch: string;
  notes: string[];
}

/**
 * Trend Signal
 */
export interface TrendSignal {
  heroId: string;
  direction: TrendSignalType;
  winRateDelta: number | null;
  pickRateDelta: number | null;
  banRateDelta: number | null;
  currentPeriod: string;
  comparisonPeriod: string | null;
  reason: string;
  disclaimer: string;
}

/**
 * Patch Change Signal
 */
export interface PatchSignal {
  heroId: string;
  patch: string;
  change: PatchSignalType;
  description: string | null;
  attributeChanges?: Record<string, { before: string | number; after: string | number }>;
  notes: string;
}

/**
 * Sample & Data Quality Signal
 */
export interface SampleSignal {
  heroId: string;
  status: SampleSignalType;
  sampleSize: number;
  completeness: number; // 0 - 100 percentage
  dataAgeDays: number;
  isStale: boolean;
  isDemo: boolean;
  confidenceRating: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNUSABLE';
  notes: string[];
}

/**
 * Comprehensive Multi-Dimensional Meta Signals Structure (Phase 2C-2)
 * Strictly preserves source separation without overall scoring.
 */
export interface HeroMetaSignals {
  heroId: string;
  patch: string;
  rankedSignal: RankedSignal;
  proSignals: {
    mplId: ProSignal;
    mplPh: ProSignal;
    international: ProSignal;
  };
  trendSignal: TrendSignal;
  patchSignal: PatchSignal;
  sampleSignal: SampleSignal;
  sourceBreakdown: {
    rankedMatches: number;
    mplIdMatches: number;
    mplPhMatches: number;
    internationalMatches: number;
  };
  generatedAt: string;
}

/**
 * Query filter options for signal computation
 */
export interface SignalFilterOptions {
  heroId?: string;
  patch?: string;
  rankScope?: MetricRankScope | string;
  region?: string;
  source?: string;
  sourceCategory?: MetricSourceCategory;
  period?: MetricPeriod | string;
  referenceDate?: string;
  allowDemo?: boolean;
}
