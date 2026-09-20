import { HeroMetaSignals } from '../signals/types';
import {
  HeroMetaPriority,
  RankedComponentScore,
  ProComponentScore,
  TrendComponentScore,
  PatchComponentScore,
  DataQualityComponentScore,
  RankFallbackStatus,
} from './types';
import {
  MetaPriorityWeightsConfig,
  RankedSubWeightsConfig,
  ProSubWeightsConfig,
  DEFAULT_PRIORITY_WEIGHTS,
  DEFAULT_RANKED_SUB_WEIGHTS,
  DEFAULT_PRO_SUB_WEIGHTS,
} from './weights';
import {
  signalLevelToScore,
  proSignalToScore,
  trendSignalToScore,
  patchSignalToScore,
  sampleSignalToScore,
  determineConfidence,
} from './normalizer';

/**
 * Calculates Ranked Component (45% default)
 */
export function computeRankedComponent(
  signals: HeroMetaSignals,
  weights: MetaPriorityWeightsConfig = DEFAULT_PRIORITY_WEIGHTS,
  subWeights: RankedSubWeightsConfig = DEFAULT_RANKED_SUB_WEIGHTS
): RankedComponentScore {
  const rs = signals.rankedSignal;

  const presenceRateSubScore = signalLevelToScore(rs.presenceRateSignal);
  const banRateSubScore = signalLevelToScore(rs.banRateSignal);
  const winRateSubScore = signalLevelToScore(rs.winRateSignal);
  const pickRateSubScore = signalLevelToScore(rs.pickRateSignal);

  const rawScore =
    presenceRateSubScore * subWeights.presence +
    banRateSubScore * subWeights.ban +
    winRateSubScore * subWeights.winRate +
    pickRateSubScore * subWeights.pick;

  const score = Math.round(Math.min(Math.max(rawScore, 0), 100) * 10) / 10;
  const weightedContribution = Math.round(score * weights.ranked * 100) / 100;

  return {
    score,
    weight: weights.ranked,
    weightedContribution,
    presenceRateSubScore,
    banRateSubScore,
    winRateSubScore,
    pickRateSubScore,
    level: rs.level,
    matches: rs.matches,
  };
}

/**
 * Calculates Pro Component (25% default)
 * Aggregates MPL ID, MPL PH, and International without source blending or inventing fake data.
 */
export function computeProComponent(
  signals: HeroMetaSignals,
  weights: MetaPriorityWeightsConfig = DEFAULT_PRIORITY_WEIGHTS,
  subWeights: ProSubWeightsConfig = DEFAULT_PRO_SUB_WEIGHTS
): ProComponentScore {
  const { mplId, mplPh, international } = signals.proSignals;

  const mplIdSubScore = proSignalToScore(mplId);
  const mplPhSubScore = proSignalToScore(mplPh);
  const internationalSubScore = proSignalToScore(international);

  const availableSources: string[] = [];
  const activeWeights: number[] = [];
  const activeScores: number[] = [];

  if (mplIdSubScore !== null) {
    availableSources.push('MPL_ID');
    activeWeights.push(subWeights.mplId);
    activeScores.push(mplIdSubScore);
  }
  if (mplPhSubScore !== null) {
    availableSources.push('MPL_PH');
    activeWeights.push(subWeights.mplPh);
    activeScores.push(mplPhSubScore);
  }
  if (internationalSubScore !== null) {
    availableSources.push('INTERNATIONAL');
    activeWeights.push(subWeights.international);
    activeScores.push(internationalSubScore);
  }

  const hasProData = availableSources.length > 0;
  let score: number;

  if (hasProData) {
    const totalWeight = activeWeights.reduce((a, b) => a + b, 0);
    const weightedSum = activeScores.reduce((sum, s, idx) => sum + s * activeWeights[idx], 0);
    score = Math.round((weightedSum / totalWeight) * 10) / 10;
  } else {
    // Neutral fallback when no tournament data exists (zero bias towards or against hero)
    score = 50;
  }

  const weightedContribution = Math.round(score * weights.pro * 100) / 100;

  return {
    score,
    weight: weights.pro,
    weightedContribution,
    mplIdSubScore,
    mplPhSubScore,
    internationalSubScore,
    availableSources,
    hasProData,
  };
}

/**
 * Calculates Trend Component (15% default)
 */
export function computeTrendComponent(
  signals: HeroMetaSignals,
  weights: MetaPriorityWeightsConfig = DEFAULT_PRIORITY_WEIGHTS
): TrendComponentScore {
  const ts = signals.trendSignal;
  const score = trendSignalToScore(ts);
  const weightedContribution = Math.round(score * weights.trend * 100) / 100;

  return {
    score,
    weight: weights.trend,
    weightedContribution,
    direction: ts.direction,
    winRateDelta: ts.winRateDelta,
    pickRateDelta: ts.pickRateDelta,
    banRateDelta: ts.banRateDelta,
  };
}

/**
 * Calculates Patch Component (5% default)
 */
export function computePatchComponent(
  signals: HeroMetaSignals,
  weights: MetaPriorityWeightsConfig = DEFAULT_PRIORITY_WEIGHTS
): PatchComponentScore {
  const ps = signals.patchSignal;
  const score = patchSignalToScore(ps);
  const weightedContribution = Math.round(score * weights.patch * 100) / 100;

  return {
    score,
    weight: weights.patch,
    weightedContribution,
    change: ps.change,
    description: ps.description,
  };
}

/**
 * Calculates Data Quality Component (10% default)
 */
export function computeDataQualityComponent(
  signals: HeroMetaSignals,
  weights: MetaPriorityWeightsConfig = DEFAULT_PRIORITY_WEIGHTS
): DataQualityComponentScore {
  const ss = signals.sampleSignal;
  const score = sampleSignalToScore(ss);
  const weightedContribution = Math.round(score * weights.dataQuality * 100) / 100;

  return {
    score,
    weight: weights.dataQuality,
    weightedContribution,
    status: ss.status,
    sampleSize: ss.sampleSize,
    dataAgeDays: ss.dataAgeDays,
    isStale: ss.isStale,
    isDemo: ss.isDemo,
  };
}

/**
 * Generates a concise, deterministic explanation based on component signals.
 * STRICTLY NO "pick this hero" or "ban this hero" phrases.
 */
export function generateDeterministicExplanation(
  ranked: RankedComponentScore,
  pro: ProComponentScore,
  trend: TrendComponentScore,
  patch: PatchComponentScore,
  quality: DataQualityComponentScore
): string {
  if (quality.isDemo) {
    return 'Synthetic demo data environment: values provided strictly for local calibration and pipeline testing.';
  }

  const parts: string[] = [];

  // 1. Ranked aspect
  if (ranked.score >= 80) {
    parts.push('High Ranked performance and presence');
  } else if (ranked.score >= 60) {
    parts.push('Moderate Ranked performance');
  } else if (ranked.score <= 30) {
    parts.push('Low Ranked activity and contest rate');
  } else {
    parts.push('Balanced Ranked metrics');
  }

  // 2. Pro aspect
  if (pro.hasProData) {
    if (pro.score >= 80) {
      parts.push(`heavy presence in competitive play (${pro.availableSources.join(', ')})`);
    } else if (pro.score <= 30) {
      parts.push('low competitive priority');
    } else {
      parts.push('occasional competitive appearances');
    }
  } else {
    parts.push('limited competitive sample');
  }

  // 3. Trend aspect
  if (trend.direction === 'RISING') {
    parts.push('upward metric trajectory in recent periods');
  } else if (trend.direction === 'FALLING') {
    parts.push('declining trajectory across recent patches');
  }

  // 4. Patch aspect
  if (patch.change === 'BUFF') {
    parts.push('benefits from recent patch buffs');
  } else if (patch.change === 'NERF') {
    parts.push('impacted by recent patch nerfs');
  }

  return parts.join(', ') + '.';
}

/**
 * Core Calculator: Combines signals into HeroMetaPriority (0 - 100)
 */
export function calculateHeroMetaPriority(
  signals: HeroMetaSignals,
  fallbackStatus: RankFallbackStatus = 'DIRECT_RANK_DATA',
  weights: MetaPriorityWeightsConfig = DEFAULT_PRIORITY_WEIGHTS,
  rankedSubWeights: RankedSubWeightsConfig = DEFAULT_RANKED_SUB_WEIGHTS,
  proSubWeights: ProSubWeightsConfig = DEFAULT_PRO_SUB_WEIGHTS
): HeroMetaPriority {
  const rankedComponent = computeRankedComponent(signals, weights, rankedSubWeights);
  const proComponent = computeProComponent(signals, weights, proSubWeights);
  const trendComponent = computeTrendComponent(signals, weights);
  const patchComponent = computePatchComponent(signals, weights);
  const dataQualityComponent = computeDataQualityComponent(signals, weights);

  const rawTotal =
    rankedComponent.weightedContribution +
    proComponent.weightedContribution +
    trendComponent.weightedContribution +
    patchComponent.weightedContribution +
    dataQualityComponent.weightedContribution;

  const metaPriorityScore = Math.round(Math.min(Math.max(rawTotal, 0), 100) * 10) / 10;
  const confidence = determineConfidence(signals.sampleSignal, signals.rankedSignal.matches);
  const explanation = generateDeterministicExplanation(
    rankedComponent,
    proComponent,
    trendComponent,
    patchComponent,
    dataQualityComponent
  );

  return {
    heroId: signals.heroId,
    patch: signals.patch,
    metaPriorityScore,
    rankedComponent,
    proComponent,
    trendComponent,
    patchComponent,
    dataQualityComponent,
    confidence,
    fallbackStatus,
    sourceBreakdown: signals.sourceBreakdown,
    rankScope: signals.rankedSignal.rankScope,
    period: signals.rankedSignal.period,
    isDemo: signals.sampleSignal.isDemo,
    isStale: signals.sampleSignal.isStale,
    explanation,
    generatedAt: new Date().toISOString(),
  };
}
