import { MetricRankScope, MetricPeriod } from '../metrics/types';
import {
  SignalLevel,
  PatchSignalType,
  TrendSignalType,
  SampleSignalType,
  SignalFilterOptions,
} from '../signals/types';

/**
 * Confidence Level of the Meta Priority Result
 * IMPORTANT: Confidence ≠ Priority Score.
 * (e.g. A hero can have Priority 90 with Confidence LOW, or Priority 82 with Confidence HIGH)
 */
export type PriorityConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNUSABLE';

/**
 * Rank Data Origin Status
 * Explicitly tracks whether rank-specific data or a fallback was utilized.
 */
export type RankFallbackStatus =
  | 'DIRECT_RANK_DATA'
  | 'MYTHIC_PLUS_FALLBACK'
  | 'GLOBAL_FALLBACK'
  | 'INSUFFICIENT_DATA';

/**
 * Ranked Component Breakdown
 */
export interface RankedComponentScore {
  score: number; // 0 - 100
  weight: number; // e.g. 0.45
  weightedContribution: number;
  winRateSubScore: number;
  pickRateSubScore: number;
  banRateSubScore: number;
  presenceRateSubScore: number;
  level: SignalLevel;
  matches: number;
}

/**
 * Pro Tournament Component Breakdown
 */
export interface ProComponentScore {
  score: number; // 0 - 100
  weight: number; // e.g. 0.25
  weightedContribution: number;
  mplIdSubScore: number | null;
  mplPhSubScore: number | null;
  internationalSubScore: number | null;
  availableSources: string[];
  hasProData: boolean;
}

/**
 * Trend Component Breakdown
 */
export interface TrendComponentScore {
  score: number; // 0 - 100
  weight: number; // e.g. 0.15
  weightedContribution: number;
  direction: TrendSignalType;
  winRateDelta: number | null;
  pickRateDelta: number | null;
  banRateDelta: number | null;
}

/**
 * Patch Adjustment Component Breakdown
 */
export interface PatchComponentScore {
  score: number; // 0 - 100
  weight: number; // e.g. 0.05
  weightedContribution: number;
  change: PatchSignalType;
  description: string | null;
}

/**
 * Data Quality & Freshness Component Breakdown
 */
export interface DataQualityComponentScore {
  score: number; // 0 - 100
  weight: number; // e.g. 0.10
  weightedContribution: number;
  status: SampleSignalType;
  sampleSize: number;
  dataAgeDays: number;
  isStale: boolean;
  isDemo: boolean;
}

/**
 * Comprehensive Meta Priority Result (Phase 2C-3)
 * Transparent, deterministic evaluation of competitive meta priority (0 - 100).
 * Strictly answers: "How high is this hero's meta priority?"
 * NOT draft recommendations or pick/ban instructions.
 */
export interface HeroMetaPriority {
  heroId: string;
  patch: string;

  // Composite 0 - 100 score
  metaPriorityScore: number;

  // Component breakdowns
  rankedComponent: RankedComponentScore;
  proComponent: ProComponentScore;
  trendComponent: TrendComponentScore;
  patchComponent: PatchComponentScore;
  dataQualityComponent: DataQualityComponentScore;

  // Confidence & reliability
  confidence: PriorityConfidence;
  fallbackStatus: RankFallbackStatus;

  // Metadata
  sourceBreakdown: {
    rankedMatches: number;
    mplIdMatches: number;
    mplPhMatches: number;
    internationalMatches: number;
  };
  rankScope: MetricRankScope;
  period: MetricPeriod | string;
  isDemo: boolean;
  isStale: boolean;

  // Contextual deterministic explanation (no AI)
  explanation: string;
  generatedAt: string;
}

/**
 * Options for priority calculations
 */
export interface PriorityFilterOptions extends SignalFilterOptions {
  allowRankFallback?: boolean;
}
