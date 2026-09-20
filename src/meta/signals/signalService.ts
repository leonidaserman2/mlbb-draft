import { metaMetricsService, MetaMetricsService } from '../metrics/metricsService';
import { patchRepository, PatchRepository } from '../repository/patchRepository';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';
import { ALL_MLBB_HEROES } from '../../data/heroes';
import {
  HeroMetaSignals,
  RankedSignal,
  ProSignal,
  TrendSignal,
  PatchSignal,
  SampleSignal,
  SignalFilterOptions,
} from './types';
import { computeRankedSignal } from './rankedSignal';
import { computeProSignal } from './proSignal';
import { computeTrendSignal } from './trendSignal';
import { computePatchSignal } from './patchSignal';
import { computeSampleSignal } from './sampleSignal';
import { MetricSourceCategory } from '../metrics/types';

/**
 * Meta Signal Engine Service (Phase 2C-2)
 * Orchestrates multi-dimensional signal generation.
 * STRICT CONSTRAINTS:
 * - NO OVERALL SCORE / TIER RANKING
 * - NO BAN / PICK RECOMMENDATIONS
 * - NO AI / GEMINI CALLS
 * - DETERMINISTIC OFFLINE CALCULATIONS
 * - STRICT SOURCE SEPARATION
 */
export class MetaSignalService {
  private metricsService: MetaMetricsService;
  private patchRepo: PatchRepository;

  constructor(
    metricsService: MetaMetricsService = metaMetricsService,
    patchRepo: PatchRepository = patchRepository
  ) {
    this.metricsService = metricsService;
    this.patchRepo = patchRepo;
  }

  /**
   * Generates Ranked Signal for a hero
   */
  getRankedSignal(heroId: string, filters?: SignalFilterOptions): RankedSignal {
    const cleanId = heroId.toLowerCase().trim();
    const metrics = this.metricsService.getHeroRankedMetrics(cleanId, filters);
    return computeRankedSignal(metrics, filters);
  }

  /**
   * Generates Pro Tournament Signal for a specific category (MPL ID, MPL PH, or International)
   */
  getProSignal(
    heroId: string,
    filters?: SignalFilterOptions,
    proCategory: MetricSourceCategory = 'MPL_ID'
  ): ProSignal {
    const cleanId = heroId.toLowerCase().trim();
    const tournamentName =
      proCategory === 'MPL_ID'
        ? 'MPL Indonesia'
        : proCategory === 'MPL_PH'
        ? 'MPL Philippines'
        : 'International Tournaments';

    const metrics = this.metricsService.getHeroProMetrics(cleanId, {
      ...filters,
      sourceCategory: proCategory,
    });

    return computeProSignal(metrics, proCategory, tournamentName, filters);
  }

  /**
   * Generates Trend Signal based on metrics trajectory
   */
  getTrendSignal(heroId: string, filters?: SignalFilterOptions): TrendSignal {
    const cleanId = heroId.toLowerCase().trim();
    const trendResult = this.metricsService.getTrend(cleanId, filters);
    return computeTrendSignal(trendResult, cleanId);
  }

  /**
   * Generates Patch Change Signal from patch repository
   */
  getPatchSignal(heroId: string, patch?: string): PatchSignal {
    const cleanId = heroId.toLowerCase().trim();
    const targetPatch = patch || ACTIVE_PATCH_CONFIG.activePatch;
    return computePatchSignal(cleanId, targetPatch, this.patchRepo);
  }

  /**
   * Generates Sample and Data Quality Signal
   */
  getSampleSignal(heroId: string, filters?: SignalFilterOptions): SampleSignal {
    const cleanId = heroId.toLowerCase().trim();
    const metrics = this.metricsService.getHeroMetrics(cleanId, filters);
    return computeSampleSignal(metrics, cleanId);
  }

  /**
   * Comprehensive Multi-Dimensional Signal for a Single Hero
   * Answers:
   * - How is this hero's ranked signal?
   * - How is the MPL ID signal?
   * - How is the MPL PH signal?
   * - How is the International tournament signal?
   * - What is the patch adjustment status?
   * - What is the metric trajectory trend?
   * - What is the sample data reliability?
   * WITHOUT blending them into an artificial single score.
   */
  getHeroSignals(heroId: string, filters?: SignalFilterOptions): HeroMetaSignals {
    const cleanId = heroId.toLowerCase().trim();
    const patch = filters?.patch || ACTIVE_PATCH_CONFIG.activePatch;

    const rankedSignal = this.getRankedSignal(cleanId, filters);
    const mplId = this.getProSignal(cleanId, filters, 'MPL_ID');
    const mplPh = this.getProSignal(cleanId, filters, 'MPL_PH');
    const international = this.getProSignal(cleanId, filters, 'INTERNATIONAL');
    const trendSignal = this.getTrendSignal(cleanId, filters);
    const patchSignal = this.getPatchSignal(cleanId, patch);
    const sampleSignal = this.getSampleSignal(cleanId, filters);

    return {
      heroId: cleanId,
      patch,
      rankedSignal,
      proSignals: {
        mplId,
        mplPh,
        international,
      },
      trendSignal,
      patchSignal,
      sampleSignal,
      sourceBreakdown: {
        rankedMatches: rankedSignal.matches,
        mplIdMatches: mplId.matches,
        mplPhMatches: mplPh.matches,
        internationalMatches: international.matches,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Computes Meta Signals for all verified 133 MLBB heroes
   */
  getAllHeroSignals(filters?: SignalFilterOptions): HeroMetaSignals[] {
    const results: HeroMetaSignals[] = [];
    for (const hero of ALL_MLBB_HEROES) {
      results.push(this.getHeroSignals(hero.id, filters));
    }
    return results;
  }
}

export const metaSignalService = new MetaSignalService();
