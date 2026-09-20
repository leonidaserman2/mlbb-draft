import { metaSignalService, MetaSignalService } from '../signals/signalService';
import { metaRepository, MetaRepositoryCoordinator } from '../repository/metaRepository';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';
import { ALL_MLBB_HEROES } from '../../data/heroes';
import { normalizeMetricRankScope } from '../metrics/filters';
import { MetricRankScope } from '../metrics/types';
import {
  HeroMetaPriority,
  PriorityFilterOptions,
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
import { calculateHeroMetaPriority } from './calculator';

/**
 * Meta Priority Engine Service (Phase 2C-3)
 * Evaluates contextual meta priority (0 - 100) from multi-dimensional signals.
 *
 * STRICT CONSTRAINTS:
 * - NO BAN / PICK RECOMMENDATIONS
 * - NO HERO COUNTER / SYNERGY LOGIC
 * - NO DRAFT CONTEXT (First Pick / Second Pick has NO impact)
 * - NO GEMINI / EXTERNAL API CALLS
 * - DETERMINISTIC OFFLINE CALCULATIONS
 */
export class MetaPriorityService {
  private signalService: MetaSignalService;
  private coordinator: MetaRepositoryCoordinator;
  private weightsConfig: MetaPriorityWeightsConfig;
  private rankedSubWeights: RankedSubWeightsConfig;
  private proSubWeights: ProSubWeightsConfig;

  constructor(
    signalService: MetaSignalService = metaSignalService,
    coordinator: MetaRepositoryCoordinator = metaRepository,
    weightsConfig: MetaPriorityWeightsConfig = DEFAULT_PRIORITY_WEIGHTS,
    rankedSubWeights: RankedSubWeightsConfig = DEFAULT_RANKED_SUB_WEIGHTS,
    proSubWeights: ProSubWeightsConfig = DEFAULT_PRO_SUB_WEIGHTS
  ) {
    this.signalService = signalService;
    this.coordinator = coordinator;
    this.weightsConfig = weightsConfig;
    this.rankedSubWeights = rankedSubWeights;
    this.proSubWeights = proSubWeights;
  }

  /**
   * Resolves rank scope availability and explicit fallback status
   */
  resolveRankFallback(
    heroId: string,
    requestedRank: MetricRankScope,
    patch: string
  ): { effectiveRank: MetricRankScope; fallbackStatus: RankFallbackStatus } {
    if (requestedRank === 'GLOBAL') {
      return { effectiveRank: 'GLOBAL', fallbackStatus: 'DIRECT_RANK_DATA' };
    }

    const allHeroRanked = this.coordinator.ranked.query({ heroId, patch });

    if (allHeroRanked.length === 0) {
      return { effectiveRank: requestedRank, fallbackStatus: 'INSUFFICIENT_DATA' };
    }

    // 1. Check direct match for requested rank
    const hasDirect = allHeroRanked.some(
      (r) => normalizeMetricRankScope(r.rankScope) === requestedRank
    );
    if (hasDirect) {
      return { effectiveRank: requestedRank, fallbackStatus: 'DIRECT_RANK_DATA' };
    }

    // 2. High-tier rank fallback to MYTHIC_PLUS
    const highTiers: MetricRankScope[] = [
      'MYTHICAL_IMMORTAL',
      'MYTHICAL_GLORY',
      'MYTHICAL_HONOR',
      'MYTHIC',
    ];
    if (highTiers.includes(requestedRank)) {
      const hasMythicPlus = allHeroRanked.some((r) => {
        const norm = normalizeMetricRankScope(r.rankScope);
        return norm === 'MYTHIC_PLUS' || norm === 'MYTHIC' || norm === 'MYTHICAL_GLORY';
      });
      if (hasMythicPlus) {
        return { effectiveRank: 'MYTHIC_PLUS', fallbackStatus: 'MYTHIC_PLUS_FALLBACK' };
      }
    }

    // 3. Fallback to GLOBAL data if exists
    const hasGlobal = allHeroRanked.some(
      (r) => normalizeMetricRankScope(r.rankScope) === 'GLOBAL'
    );
    if (hasGlobal) {
      return { effectiveRank: 'GLOBAL', fallbackStatus: 'GLOBAL_FALLBACK' };
    }

    // 4. If any data at all exists in other tiers, still fallback to global representation
    if (allHeroRanked.length > 0) {
      return { effectiveRank: 'GLOBAL', fallbackStatus: 'GLOBAL_FALLBACK' };
    }

    return { effectiveRank: requestedRank, fallbackStatus: 'INSUFFICIENT_DATA' };
  }

  /**
   * Computes Meta Priority for a single hero
   */
  getHeroPriority(heroId: string, filters: PriorityFilterOptions = {}): HeroMetaPriority {
    const cleanId = heroId.toLowerCase().trim();
    const patch = filters.patch || ACTIVE_PATCH_CONFIG.activePatch;
    const requestedRank = normalizeMetricRankScope(filters.rankScope);

    // Resolve explicit rank fallback
    const { effectiveRank, fallbackStatus } = this.resolveRankFallback(
      cleanId,
      requestedRank,
      patch
    );

    // Obtain signals from Phase 2C-2 using effective rank
    const signals = this.signalService.getHeroSignals(cleanId, {
      ...filters,
      heroId: cleanId,
      patch,
      rankScope: effectiveRank,
    });

    // Compute priority score
    const priorityResult = calculateHeroMetaPriority(
      signals,
      fallbackStatus,
      this.weightsConfig,
      this.rankedSubWeights,
      this.proSubWeights
    );

    // Preserve the originally requested rank in the output
    priorityResult.rankScope = requestedRank;

    return priorityResult;
  }

  /**
   * Computes Meta Priorities for all 133 verified MLBB heroes
   */
  getAllHeroPriorities(filters: PriorityFilterOptions = {}): HeroMetaPriority[] {
    const results: HeroMetaPriority[] = [];
    for (const hero of ALL_MLBB_HEROES) {
      results.push(this.getHeroPriority(hero.id, filters));
    }
    return results;
  }

  /**
   * Internal engine sorting helper (descending by metaPriorityScore by default)
   * Does NOT label heroes as "best" or "worst", only orders by Meta Priority.
   */
  sortByPriority(
    priorities: HeroMetaPriority[],
    order: 'asc' | 'desc' = 'desc'
  ): HeroMetaPriority[] {
    return [...priorities].sort((a, b) => {
      if (order === 'desc') {
        return b.metaPriorityScore - a.metaPriorityScore;
      }
      return a.metaPriorityScore - b.metaPriorityScore;
    });
  }

  /**
   * Updates weight configuration for calibration
   */
  setWeights(newWeights: MetaPriorityWeightsConfig): void {
    this.weightsConfig = { ...newWeights };
  }

  /**
   * Gets current weight configuration
   */
  getWeights(): MetaPriorityWeightsConfig {
    return { ...this.weightsConfig };
  }
}

export const metaPriorityService = new MetaPriorityService();
