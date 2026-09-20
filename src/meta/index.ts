// Public API for MLBB Meta Data Infrastructure (Phase 2A)

export * from './types/snapshot';
export * from './types/source';
export * from './raw/types';
export * from './normalized/types';
export * from './derived/types';
export {
  deriveMetricsFromSnapshots,
  deriveMetricsFromProMatches,
  calculateMetricTrend as calculateDerivedMetricTrend,
} from './derived/calculator';
export * from './validation/validator';
export * from './config/patchConfig';
export * from './sources/registry';
export * from './cache/metaCache';
export * from './dev/metaDebug';
export * from './repository';
export * from './metrics';
export * from './signals';
export * from './priority';

import { metaCacheManager } from './cache/metaCache';
import { MetaSnapshot, ProMatchRecord, MetaQueryFilter } from './types/snapshot';
import { calculateTimeframeDates, ACTIVE_PATCH_CONFIG } from './config/patchConfig';

/**
 * High-level service to query normalized meta snapshots with patch-awareness
 */
export function queryMetaSnapshots(filter: MetaQueryFilter = {}): MetaSnapshot[] {
  const cache = metaCacheManager.getCache();
  let results = cache.rankedSnapshots;

  // Filter by patch (default to active patch if not specified or timeframe is CURRENT_PATCH)
  const targetPatch = filter.patch || ACTIVE_PATCH_CONFIG.activePatch;
  if (filter.timeframe === 'CURRENT_PATCH' || !filter.timeframe) {
    results = results.filter((s) => s.patch === targetPatch);
  }

  // Filter by timeframe dates
  if (filter.timeframe) {
    const dates = calculateTimeframeDates(filter.timeframe);
    results = results.filter((s) => s.periodStart >= dates.start && s.periodEnd <= dates.end);
  }

  if (filter.heroId) {
    results = results.filter((s) => s.heroId === filter.heroId?.toLowerCase());
  }

  if (filter.rankScope) {
    results = results.filter((s) => s.rankScope === filter.rankScope);
  }

  if (filter.region) {
    results = results.filter((s) => s.region === filter.region);
  }

  return results;
}

/**
 * High-level service to query pro match records
 */
export function queryProMatches(filter: { heroId?: string; tournament?: string; patch?: string } = {}): ProMatchRecord[] {
  const cache = metaCacheManager.getCache();
  let results = cache.proSnapshots;

  if (filter.heroId) {
    results = results.filter((m) => m.heroId === filter.heroId?.toLowerCase());
  }

  if (filter.tournament) {
    results = results.filter((m) => m.tournament.toLowerCase().includes(filter.tournament!.toLowerCase()));
  }

  if (filter.patch) {
    results = results.filter((m) => m.patch === filter.patch);
  }

  return results;
}
