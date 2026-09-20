import { MetricRankScope, MetricSourceCategory, MetricPeriod, MetricFilterOptions } from './types';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';
import { NormalizedMetaRecord, NormalizedProRecord } from '../normalized/types';

/**
 * Normalizes any rank string into canonical MetricRankScope
 */
export function normalizeMetricRankScope(raw?: any): MetricRankScope {
  if (!raw || typeof raw !== 'string') return 'GLOBAL';
  const clean = raw.trim().toUpperCase().replace(/\s+/g, '_');

  switch (clean) {
    case 'EPIC':
      return 'EPIC';
    case 'LEGEND':
      return 'LEGEND';
    case 'MYTHIC':
      return 'MYTHIC';
    case 'MYTHICAL_HONOR':
    case 'HONOR':
      return 'MYTHICAL_HONOR';
    case 'MYTHICAL_GLORY':
    case 'GLORY':
      return 'MYTHICAL_GLORY';
    case 'MYTHICAL_IMMORTAL':
    case 'IMMORTAL':
      return 'MYTHICAL_IMMORTAL';
    case 'MYTHIC_PLUS':
    case 'MYTHIC+':
      return 'MYTHIC_PLUS';
    case 'GLOBAL':
    case 'ALL':
    case 'ALL_RANKS':
      return 'GLOBAL';
    default:
      return 'GLOBAL';
  }
}

/**
 * Matches canonical MetricRankScope to the repository record's rankScope string
 */
export function matchesRankScope(recordScope: string, targetScope?: MetricRankScope | string): boolean {
  if (!targetScope) return true;
  const target = normalizeMetricRankScope(targetScope);
  if (target === 'GLOBAL') return true; // GLOBAL includes all or explicitly global
  const rec = normalizeMetricRankScope(recordScope);
  return rec === target;
}

/**
 * Maps source string / identifier to MetricSourceCategory
 */
export function categorizeSource(sourceName?: string): MetricSourceCategory {
  if (!sourceName || typeof sourceName !== 'string') return 'RANKED';
  const s = sourceName.trim().toLowerCase();
  if (s.includes('mpl-id') || s.includes('mpl id') || s.includes('mpl_id')) {
    return 'MPL_ID';
  }
  if (s.includes('mpl-ph') || s.includes('mpl ph') || s.includes('mpl_ph')) {
    return 'MPL_PH';
  }
  if (s.includes('liquipedia') || s.includes('international') || s.includes('m6') || s.includes('m5') || s.includes('msc')) {
    return 'INTERNATIONAL';
  }
  if (s.includes('patch') || s.includes('dex')) {
    return 'PATCH';
  }
  return 'RANKED';
}

/**
 * Calculate Date range boundaries for a given MetricPeriod relative to referenceDate
 */
export function getPeriodDateRange(
  period: MetricPeriod | string,
  referenceDate: string = '2026-09-20'
): { start: string; end: string; isHistorical: boolean } {
  const ref = new Date(referenceDate);
  const end = ref.toISOString().slice(0, 10);

  switch (period) {
    case 'CURRENT_PATCH': {
      return {
        start: ACTIVE_PATCH_CONFIG.releaseDate, // '2026-09-08'
        end,
        isHistorical: false,
      };
    }
    case 'LAST_7_DAYS': {
      const d = new Date(ref);
      d.setDate(d.getDate() - 7);
      return {
        start: d.toISOString().slice(0, 10),
        end,
        isHistorical: false,
      };
    }
    case 'LAST_14_DAYS': {
      const d = new Date(ref);
      d.setDate(d.getDate() - 14);
      return {
        start: d.toISOString().slice(0, 10),
        end,
        isHistorical: false,
      };
    }
    case 'LAST_30_DAYS': {
      const d = new Date(ref);
      d.setDate(d.getDate() - 30);
      return {
        start: d.toISOString().slice(0, 10),
        end,
        isHistorical: false,
      };
    }
    case 'HISTORICAL': {
      return {
        start: '2020-01-01',
        end: ACTIVE_PATCH_CONFIG.releaseDate,
        isHistorical: true,
      };
    }
    default: {
      return {
        start: '2020-01-01',
        end,
        isHistorical: false,
      };
    }
  }
}

/**
 * Filter predicate for Ranked Meta Records
 */
export function filterRankedRecord(
  record: NormalizedMetaRecord,
  filters: MetricFilterOptions
): boolean {
  const targetPatch = filters.patch || ACTIVE_PATCH_CONFIG.activePatch;
  const isTargetingHistorical = filters.period === 'HISTORICAL' || targetPatch !== ACTIVE_PATCH_CONFIG.activePatch;

  // 1. Hero filter
  if (filters.heroId && record.heroId.toLowerCase() !== filters.heroId.toLowerCase()) {
    return false;
  }

  // 2. Patch filter
  if (record.patch !== targetPatch) {
    return false;
  }

  // 3. Historical status check
  if (!isTargetingHistorical && record.isHistorical) {
    return false;
  }

  // 4. Rank Scope filter
  if (filters.rankScope && !matchesRankScope(record.rankScope, filters.rankScope)) {
    return false;
  }

  // 5. Region filter
  if (filters.region && filters.region !== 'GLOBAL' && record.region.toLowerCase() !== filters.region.toLowerCase()) {
    return false;
  }

  // 6. Source / Category filter
  if (filters.sourceCategory && categorizeSource(record.source) !== filters.sourceCategory) {
    return false;
  }
  if (filters.source && record.source.toLowerCase() !== filters.source.toLowerCase()) {
    return false;
  }

  // 7. Period / Date boundaries
  if (filters.period) {
    const range = getPeriodDateRange(filters.period, filters.referenceDate || '2026-09-20');
    // Check record periodStart & periodEnd
    const rStart = record.periodStart || record.collectedAt.slice(0, 10);
    const rEnd = record.periodEnd || record.collectedAt.slice(0, 10);

    if (filters.period === 'CURRENT_PATCH') {
      // Must not be entirely prior to active patch release
      if (rEnd < ACTIVE_PATCH_CONFIG.releaseDate) return false;
    } else if (filters.period === 'HISTORICAL') {
      if (rStart >= ACTIVE_PATCH_CONFIG.releaseDate && record.patch === ACTIVE_PATCH_CONFIG.activePatch) return false;
    } else {
      // For sliding windows (7, 14, 30 days)
      if (rEnd < range.start || rStart > range.end) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Filter predicate for Pro Match Records
 */
export function filterProRecord(
  record: NormalizedProRecord,
  filters: MetricFilterOptions
): boolean {
  const targetPatch = filters.patch || ACTIVE_PATCH_CONFIG.activePatch;
  const isTargetingHistorical = filters.period === 'HISTORICAL' || targetPatch !== ACTIVE_PATCH_CONFIG.activePatch;

  // 1. Hero filter
  if (filters.heroId && record.heroId.toLowerCase() !== filters.heroId.toLowerCase()) {
    return false;
  }

  // 2. Patch filter
  if (record.patch !== targetPatch) {
    return false;
  }

  // 3. Historical status check
  if (!isTargetingHistorical && record.isHistorical) {
    return false;
  }

  // 4. Region filter
  if (filters.region && filters.region !== 'GLOBAL' && record.region.toLowerCase() !== filters.region.toLowerCase()) {
    return false;
  }

  // 5. Source / Category filter
  if (filters.sourceCategory) {
    const cat = categorizeSource(record.tournament || record.source);
    if (cat !== filters.sourceCategory) {
      return false;
    }
  }
  if (filters.source && record.source.toLowerCase() !== filters.source.toLowerCase()) {
    return false;
  }

  // 6. Period / Date boundaries
  if (filters.period) {
    const range = getPeriodDateRange(filters.period, filters.referenceDate || '2026-09-20');
    const mDate = record.matchDate;

    if (filters.period === 'CURRENT_PATCH') {
      if (mDate < ACTIVE_PATCH_CONFIG.releaseDate) return false;
    } else if (filters.period === 'HISTORICAL') {
      if (mDate >= ACTIVE_PATCH_CONFIG.releaseDate && record.patch === ACTIVE_PATCH_CONFIG.activePatch) return false;
    } else {
      if (mDate < range.start || mDate > range.end) {
        return false;
      }
    }
  }

  return true;
}
