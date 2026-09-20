import {
  HeroMetaMetrics,
  MetricFilterOptions,
  MetricTrendResult,
  MetricSourceCategory,
} from './types';
import { filterRankedRecord, filterProRecord, categorizeSource, normalizeMetricRankScope } from './filters';
import { calculateRankedMetrics, calculateProMetrics } from './calculator';
import { calculateMetricTrend } from './trend';
import { metaRepository, MetaRepositoryCoordinator } from '../repository/metaRepository';
import { ALL_MLBB_HEROES } from '../../data/heroes';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';
import { NormalizedMetaRecord, NormalizedProRecord } from '../normalized/types';

export class MetaMetricsService {
  private coordinator: MetaRepositoryCoordinator;

  // Simple in-memory cache for repeated computations
  private computationCache = new Map<string, { timestamp: number; data: any }>();
  private cacheTTLms = 10000; // 10 seconds memoization

  constructor(coordinator: MetaRepositoryCoordinator = metaRepository) {
    this.coordinator = coordinator;
  }

  /**
   * Clears internal computation cache
   */
  clearCache(): void {
    this.computationCache.clear();
  }

  /**
   * Helper to ensure repository has loaded cached snapshots if available
   */
  private ensureInitialized(): void {
    this.coordinator.initializeFromCache();
  }

  /**
   * Resolves comparison period records for trend calculation
   */
  private getComparisonRankedRecords(
    heroId: string,
    filters: MetricFilterOptions
  ): NormalizedMetaRecord[] {
    const period = filters.period || 'CURRENT_PATCH';
    const targetPatch = filters.patch || ACTIVE_PATCH_CONFIG.activePatch;
    const refDate = filters.referenceDate || '2026-09-20';

    if (period === 'CURRENT_PATCH') {
      // Compare with previous patch
      const prevPatch = ACTIVE_PATCH_CONFIG.previousPatches[0] || '2.2.10';
      return this.coordinator.ranked.query({
        heroId,
        patch: prevPatch,
        rankScope: filters.rankScope as string,
        region: filters.region,
      });
    }

    if (period === 'LAST_7_DAYS') {
      // Compare with days 7 to 14 ago
      const ref = new Date(refDate);
      const endD = new Date(ref);
      endD.setDate(endD.getDate() - 7);
      const startD = new Date(ref);
      startD.setDate(startD.getDate() - 14);
      const startStr = startD.toISOString().slice(0, 10);
      const endStr = endD.toISOString().slice(0, 10);

      return this.coordinator.ranked.query({ heroId, patch: targetPatch }).filter((r) => {
        const rDate = r.periodEnd || r.collectedAt.slice(0, 10);
        return rDate >= startStr && rDate < endStr;
      });
    }

    if (period === 'LAST_14_DAYS') {
      const ref = new Date(refDate);
      const endD = new Date(ref);
      endD.setDate(endD.getDate() - 14);
      const startD = new Date(ref);
      startD.setDate(startD.getDate() - 28);
      const startStr = startD.toISOString().slice(0, 10);
      const endStr = endD.toISOString().slice(0, 10);

      return this.coordinator.ranked.query({ heroId, patch: targetPatch }).filter((r) => {
        const rDate = r.periodEnd || r.collectedAt.slice(0, 10);
        return rDate >= startStr && rDate < endStr;
      });
    }

    if (period === 'LAST_30_DAYS') {
      const ref = new Date(refDate);
      const endD = new Date(ref);
      endD.setDate(endD.getDate() - 30);
      const startD = new Date(ref);
      startD.setDate(startD.getDate() - 60);
      const startStr = startD.toISOString().slice(0, 10);
      const endStr = endD.toISOString().slice(0, 10);

      return this.coordinator.ranked.query({ heroId, patch: targetPatch }).filter((r) => {
        const rDate = r.periodEnd || r.collectedAt.slice(0, 10);
        return rDate >= startStr && rDate < endStr;
      });
    }

    return [];
  }

  /**
   * Computes Ranked Metrics for a single hero
   */
  getHeroRankedMetrics(
    heroId: string,
    filters: MetricFilterOptions = {}
  ): HeroMetaMetrics {
    this.ensureInitialized();
    const cleanHeroId = heroId.toLowerCase().trim();

    // Query records from repository
    const allRanked = this.coordinator.ranked.query({ heroId: cleanHeroId });
    const filteredRecords = allRanked.filter((r) => filterRankedRecord(r, { ...filters, heroId: cleanHeroId }));

    // Get comparison records for trend
    const comparisonRecords = this.getComparisonRankedRecords(cleanHeroId, filters);

    return calculateRankedMetrics(
      cleanHeroId,
      filteredRecords,
      { ...filters, heroId: cleanHeroId },
      comparisonRecords
    );
  }

  /**
   * Computes Pro Tournament Metrics for a single hero
   */
  getHeroProMetrics(
    heroId: string,
    filters: MetricFilterOptions = {}
  ): HeroMetaMetrics {
    this.ensureInitialized();
    const cleanHeroId = heroId.toLowerCase().trim();

    // Query hero records
    const allPro = this.coordinator.pro.query();
    const heroRecords = allPro.filter((r) => filterProRecord(r, { ...filters, heroId: cleanHeroId }));

    // Calculate total unique tournament matches in that scope to serve as denominator
    const sampleMatches = new Set<string>();
    for (const r of allPro) {
      if (filterProRecord(r, { ...filters, heroId: undefined })) {
        if (r.matchId) sampleMatches.add(r.matchId);
      }
    }
    const totalGames = sampleMatches.size;

    return calculateProMetrics(
      cleanHeroId,
      heroRecords,
      totalGames,
      { ...filters, heroId: cleanHeroId }
    );
  }

  /**
   * Get Ranked Metrics for all valid verified heroes
   */
  getRankedMetrics(filters: MetricFilterOptions = {}): HeroMetaMetrics[] {
    this.ensureInitialized();
    const results: HeroMetaMetrics[] = [];

    // Evaluate over the verified 133 roster
    for (const hero of ALL_MLBB_HEROES) {
      const m = this.getHeroRankedMetrics(hero.id, filters);
      results.push(m);
    }

    return results;
  }

  /**
   * Get Pro Metrics for all valid verified heroes
   */
  getProMetrics(filters: MetricFilterOptions = {}): HeroMetaMetrics[] {
    this.ensureInitialized();
    const results: HeroMetaMetrics[] = [];

    // Pre-calculate tournament games denominator
    const allPro = this.coordinator.pro.query();
    const sampleMatches = new Set<string>();
    for (const r of allPro) {
      if (filterProRecord(r, { ...filters, heroId: undefined })) {
        if (r.matchId) sampleMatches.add(r.matchId);
      }
    }
    const totalGames = sampleMatches.size;

    for (const hero of ALL_MLBB_HEROES) {
      const heroRecords = allPro.filter((r) => filterProRecord(r, { ...filters, heroId: hero.id }));
      results.push(calculateProMetrics(hero.id, heroRecords, totalGames, { ...filters, heroId: hero.id }));
    }

    return results;
  }

  /**
   * Get Metrics filtered by a specific source (e.g. 'MPL_ID', 'MPL_PH', 'RANKED')
   */
  getMetricsBySource(sourceName: string, filters: MetricFilterOptions = {}): HeroMetaMetrics[] {
    const category = categorizeSource(sourceName);
    if (category === 'RANKED') {
      return this.getRankedMetrics({ ...filters, source: sourceName, sourceCategory: 'RANKED' });
    } else {
      return this.getProMetrics({ ...filters, source: sourceName, sourceCategory: category });
    }
  }

  /**
   * Universal Hero Metrics Facade
   * Routes appropriately to Ranked or Pro based on filters.source / sourceCategory
   */
  getHeroMetrics(heroId: string, filters: MetricFilterOptions = {}): HeroMetaMetrics {
    const category = filters.sourceCategory || (filters.source ? categorizeSource(filters.source) : 'RANKED');
    if (category === 'RANKED') {
      return this.getHeroRankedMetrics(heroId, { ...filters, sourceCategory: 'RANKED' });
    } else {
      return this.getHeroProMetrics(heroId, { ...filters, sourceCategory: category });
    }
  }

  /**
   * Universal All-Hero Metrics Facade
   */
  getAllHeroMetrics(filters: MetricFilterOptions = {}): HeroMetaMetrics[] {
    const category = filters.sourceCategory || (filters.source ? categorizeSource(filters.source) : 'RANKED');
    if (category === 'RANKED') {
      return this.getRankedMetrics({ ...filters, sourceCategory: 'RANKED' });
    } else {
      return this.getProMetrics({ ...filters, sourceCategory: category });
    }
  }

  /**
   * Alias for getHeroMetrics
   */
  getMetricsByHero(heroId: string, filters: MetricFilterOptions = {}): HeroMetaMetrics {
    return this.getHeroMetrics(heroId, filters);
  }

  /**
   * Computes trend explicitly for a given hero
   */
  getTrend(heroId: string, filters: MetricFilterOptions = {}): MetricTrendResult {
    const metrics = this.getHeroMetrics(heroId, filters);
    return metrics.trend;
  }
}

export const metaMetricsService = new MetaMetricsService();
