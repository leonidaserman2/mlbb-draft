/**
 * Meta Priority Engine Weight Configurations (Phase 2C-3)
 * Centralized, fully configurable starting baseline for calibration.
 * NOTE: These weights represent a transparent baseline, not an empirical truth claim.
 */

export interface MetaPriorityWeightsConfig {
  ranked: number; // Baseline: 0.45 (45%)
  pro: number; // Baseline: 0.25 (25%)
  trend: number; // Baseline: 0.15 (15%)
  patch: number; // Baseline: 0.05 (5%)
  dataQuality: number; // Baseline: 0.10 (10%)
}

export interface RankedSubWeightsConfig {
  presence: number; // 0.40
  ban: number; // 0.30
  winRate: number; // 0.20
  pick: number; // 0.10
}

export interface ProSubWeightsConfig {
  mplId: number; // 0.40
  mplPh: number; // 0.40
  international: number; // 0.20
}

/**
 * Baseline Starting Weights
 * Sum must equal 1.0 (100%)
 */
export const DEFAULT_PRIORITY_WEIGHTS: MetaPriorityWeightsConfig = {
  ranked: 0.45,
  pro: 0.25,
  trend: 0.15,
  patch: 0.05,
  dataQuality: 0.10,
};

export const DEFAULT_RANKED_SUB_WEIGHTS: RankedSubWeightsConfig = {
  presence: 0.40,
  ban: 0.30,
  winRate: 0.20,
  pick: 0.10,
};

export const DEFAULT_PRO_SUB_WEIGHTS: ProSubWeightsConfig = {
  mplId: 0.40,
  mplPh: 0.40,
  international: 0.20,
};

/**
 * Validates that priority weights sum to exactly 1.0 (within epsilon tolerance)
 */
export function validateWeightsConfig(weights: MetaPriorityWeightsConfig): boolean {
  const sum =
    weights.ranked +
    weights.pro +
    weights.trend +
    weights.patch +
    weights.dataQuality;
  return Math.abs(sum - 1.0) < 0.0001;
}

/**
 * Validates that ranked sub-weights sum to 1.0
 */
export function validateRankedSubWeights(subWeights: RankedSubWeightsConfig): boolean {
  const sum =
    subWeights.presence +
    subWeights.ban +
    subWeights.winRate +
    subWeights.pick;
  return Math.abs(sum - 1.0) < 0.0001;
}
