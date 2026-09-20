import { MetaSnapshot, ProMatchRecord, PatchData } from '../types/snapshot';
import { DataSourceInfo, DataSourceStatus } from '../types/source';
import { ValidationError } from '../validation/validator';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';
import { dataSourceRegistry } from '../sources/registry';
import { ALL_MLBB_HEROES } from '../../data/heroes';

const CACHE_KEY = 'mlbb_meta_intelligence_cache_v2';

export type CacheSourceStatus =
  | 'LIVE_VERIFIED'
  | 'STALE_CACHE'
  | 'UNAVAILABLE'
  | 'MANUAL_EXTERNAL'
  | 'INVALID'
  | 'NO_DATA';

export interface SourceCacheEntry {
  sourceId: string;
  sourceName: string;
  category: 'RANKED' | 'PRO' | 'PATCH' | 'HERO_METADATA';
  fetchedAt: string;
  lastSuccessfulSync: string | null;
  patch: string;
  status: CacheSourceStatus;
  recordCount: number;
  validationStatus: 'VALID' | 'PARTIAL' | 'FAILED' | 'NONE';
  isFallbackCache: boolean;
  error?: string;
}

export interface MetaCacheData {
  activePatch: string;
  season: string;
  heroCount: number;
  rankedSnapshots: MetaSnapshot[];
  proSnapshots: ProMatchRecord[];
  patchNotes: PatchData[];
  lastUpdateAttempt: string | null;
  lastSuccessfulSync: string | null;
  syncSuccess: boolean;
  sourcesStatus: Record<string, DataSourceInfo>;
  sourcesCacheDetails: Record<string, SourceCacheEntry>;
  validationErrors: ValidationError[];
}

class MetaCacheManager {
  private memoryCache: MetaCacheData;

  constructor() {
    this.memoryCache = this.loadFromStorage() || this.createInitialCache();
  }

  private createInitialCache(): MetaCacheData {
    return {
      activePatch: ACTIVE_PATCH_CONFIG.activePatch,
      season: ACTIVE_PATCH_CONFIG.season,
      heroCount: ALL_MLBB_HEROES.length,
      rankedSnapshots: [],
      proSnapshots: [],
      patchNotes: [],
      lastUpdateAttempt: null,
      lastSuccessfulSync: null,
      syncSuccess: false,
      sourcesStatus: {},
      sourcesCacheDetails: {},
      validationErrors: [],
    };
  }

  private loadFromStorage(): MetaCacheData | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as MetaCacheData;
      return parsed;
    } catch {
      return null;
    }
  }

  private persistToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(this.memoryCache));
      }
    } catch {
      // Ignore storage errors
    }
  }

  getCache(): MetaCacheData {
    return this.memoryCache;
  }

  /**
   * Sync all registered data source adapters
   * Enforces strict Phase 2A.5 rules:
   * - No dummy data or invented numbers
   * - If fetch fails, mark UNAVAILABLE or STALE_CACHE if old verified data existed
   * - Track explicit fetchedAt, lastSuccessfulSync, patch, validationStatus
   */
  async syncAllSources(): Promise<MetaCacheData> {
    const patch = ACTIVE_PATCH_CONFIG.activePatch;
    const now = new Date().toISOString();
    const errors: ValidationError[] = [];
    let anyLiveSuccess = false;

    this.memoryCache.lastUpdateAttempt = now;

    // 1. Fetch Ranked
    const prevRanked = this.memoryCache.rankedSnapshots;
    const rankedResult = await dataSourceRegistry.rankedAdapter.fetchRankedSnapshots(patch);
    
    if (rankedResult.success && rankedResult.data.length > 0) {
      anyLiveSuccess = true;
      this.memoryCache.rankedSnapshots = rankedResult.data;
      this.memoryCache.sourcesCacheDetails['mlbbhub-ranked'] = {
        sourceId: 'mlbbhub-ranked',
        sourceName: dataSourceRegistry.rankedAdapter.name,
        category: 'RANKED',
        fetchedAt: now,
        lastSuccessfulSync: now,
        patch,
        status: 'LIVE_VERIFIED',
        recordCount: rankedResult.data.length,
        validationStatus: 'VALID',
        isFallbackCache: false,
      };
    } else {
      // Fetch failed or 0 records: if old data exists, mark STALE CACHE fallback
      const hasOldData = prevRanked && prevRanked.length > 0;
      this.memoryCache.sourcesCacheDetails['mlbbhub-ranked'] = {
        sourceId: 'mlbbhub-ranked',
        sourceName: dataSourceRegistry.rankedAdapter.name,
        category: 'RANKED',
        fetchedAt: now,
        lastSuccessfulSync: this.memoryCache.sourcesCacheDetails['mlbbhub-ranked']?.lastSuccessfulSync || null,
        patch,
        status: hasOldData ? 'STALE_CACHE' : 'UNAVAILABLE',
        recordCount: prevRanked.length,
        validationStatus: hasOldData ? 'PARTIAL' : 'NONE',
        isFallbackCache: hasOldData,
        error: rankedResult.error || 'Source endpoint unreachable',
      };
    }

    // 2. Fetch Pro Matches (MPL ID & MPL PH & Liquipedia)
    const proMatches: ProMatchRecord[] = [];
    const prevPro = this.memoryCache.proSnapshots;

    // MPL ID
    const idResult = await dataSourceRegistry.mplIdAdapter.fetchProMatches(undefined, patch);
    if (idResult.success && idResult.data.length > 0) {
      anyLiveSuccess = true;
      proMatches.push(...idResult.data);
      this.memoryCache.sourcesCacheDetails['mlbbhub-mpl-id'] = {
        sourceId: 'mlbbhub-mpl-id',
        sourceName: dataSourceRegistry.mplIdAdapter.name,
        category: 'PRO',
        fetchedAt: now,
        lastSuccessfulSync: now,
        patch,
        status: 'LIVE_VERIFIED',
        recordCount: idResult.data.length,
        validationStatus: 'VALID',
        isFallbackCache: false,
      };
    } else {
      this.memoryCache.sourcesCacheDetails['mlbbhub-mpl-id'] = {
        sourceId: 'mlbbhub-mpl-id',
        sourceName: dataSourceRegistry.mplIdAdapter.name,
        category: 'PRO',
        fetchedAt: now,
        lastSuccessfulSync: this.memoryCache.sourcesCacheDetails['mlbbhub-mpl-id']?.lastSuccessfulSync || null,
        patch,
        status: 'UNAVAILABLE',
        recordCount: 0,
        validationStatus: 'NONE',
        isFallbackCache: false,
        error: idResult.error || 'Endpoint unreachable',
      };
    }

    // MPL PH
    const phResult = await dataSourceRegistry.mplPhAdapter.fetchProMatches(undefined, patch);
    if (phResult.success && phResult.data.length > 0) {
      anyLiveSuccess = true;
      proMatches.push(...phResult.data);
      this.memoryCache.sourcesCacheDetails['mpl-philippines'] = {
        sourceId: 'mpl-philippines',
        sourceName: dataSourceRegistry.mplPhAdapter.name,
        category: 'PRO',
        fetchedAt: now,
        lastSuccessfulSync: now,
        patch,
        status: 'LIVE_VERIFIED',
        recordCount: phResult.data.length,
        validationStatus: 'VALID',
        isFallbackCache: false,
      };
    } else {
      this.memoryCache.sourcesCacheDetails['mpl-philippines'] = {
        sourceId: 'mpl-philippines',
        sourceName: dataSourceRegistry.mplPhAdapter.name,
        category: 'PRO',
        fetchedAt: now,
        lastSuccessfulSync: this.memoryCache.sourcesCacheDetails['mpl-philippines']?.lastSuccessfulSync || null,
        patch,
        status: 'UNAVAILABLE',
        recordCount: 0,
        validationStatus: 'NONE',
        isFallbackCache: false,
        error: phResult.error || 'Endpoint unreachable',
      };
    }

    // Liquipedia (MANUAL_EXTERNAL)
    const lpResult = await dataSourceRegistry.liquipediaAdapter.fetchProMatches(undefined, patch);
    if (lpResult.success && lpResult.data.length > 0) {
      proMatches.push(...lpResult.data);
      this.memoryCache.sourcesCacheDetails['liquipedia-competitive'] = {
        sourceId: 'liquipedia-competitive',
        sourceName: dataSourceRegistry.liquipediaAdapter.name,
        category: 'PRO',
        fetchedAt: now,
        lastSuccessfulSync: now,
        patch,
        status: 'MANUAL_EXTERNAL',
        recordCount: lpResult.data.length,
        validationStatus: 'VALID',
        isFallbackCache: false,
      };
    } else {
      this.memoryCache.sourcesCacheDetails['liquipedia-competitive'] = {
        sourceId: 'liquipedia-competitive',
        sourceName: dataSourceRegistry.liquipediaAdapter.name,
        category: 'PRO',
        fetchedAt: now,
        lastSuccessfulSync: this.memoryCache.sourcesCacheDetails['liquipedia-competitive']?.lastSuccessfulSync || null,
        patch,
        status: 'MANUAL_EXTERNAL',
        recordCount: 0,
        validationStatus: 'NONE',
        isFallbackCache: false,
        error: 'Manual external archive required; bot scraping restricted by Cloudflare.',
      };
    }

    if (proMatches.length > 0) {
      this.memoryCache.proSnapshots = proMatches;
    } else if (prevPro && prevPro.length > 0) {
      // Retain old pro snapshot as fallback
      this.memoryCache.proSnapshots = prevPro;
    }

    // 3. Fetch Patch Notes
    const prevPatch = this.memoryCache.patchNotes;
    const patchResult = await dataSourceRegistry.patchAdapter.fetchPatchNotes(patch);
    if (patchResult.success && patchResult.data.length > 0) {
      anyLiveSuccess = true;
      this.memoryCache.patchNotes = patchResult.data;
      this.memoryCache.sourcesCacheDetails['mlbbdex-patch'] = {
        sourceId: 'mlbbdex-patch',
        sourceName: dataSourceRegistry.patchAdapter.name,
        category: 'PATCH',
        fetchedAt: now,
        lastSuccessfulSync: now,
        patch,
        status: 'LIVE_VERIFIED',
        recordCount: patchResult.data.length,
        validationStatus: 'VALID',
        isFallbackCache: false,
      };
    } else {
      const hasOldPatch = prevPatch && prevPatch.length > 0;
      this.memoryCache.sourcesCacheDetails['mlbbdex-patch'] = {
        sourceId: 'mlbbdex-patch',
        sourceName: dataSourceRegistry.patchAdapter.name,
        category: 'PATCH',
        fetchedAt: now,
        lastSuccessfulSync: this.memoryCache.sourcesCacheDetails['mlbbdex-patch']?.lastSuccessfulSync || null,
        patch,
        status: hasOldPatch ? 'STALE_CACHE' : 'UNAVAILABLE',
        recordCount: prevPatch.length,
        validationStatus: hasOldPatch ? 'PARTIAL' : 'NONE',
        isFallbackCache: hasOldPatch,
        error: patchResult.error || 'Endpoint unreachable',
      };
    }

    // 4. Update Sources Status Registry
    const sourcesStatusMap: Record<string, DataSourceInfo> = {};
    for (const info of dataSourceRegistry.getAllSourceInfos()) {
      sourcesStatusMap[info.id] = info;
    }
    this.memoryCache.sourcesStatus = sourcesStatusMap;

    // 5. Update Global Cache Metadata
    this.memoryCache.activePatch = patch;
    this.memoryCache.heroCount = ALL_MLBB_HEROES.length;
    this.memoryCache.syncSuccess = anyLiveSuccess;
    if (anyLiveSuccess) {
      this.memoryCache.lastSuccessfulSync = now;
    }
    this.memoryCache.validationErrors = errors;

    this.persistToStorage();
    return this.memoryCache;
  }

  clearCache(): void {
    this.memoryCache = this.createInitialCache();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(CACHE_KEY);
    }
  }
}

export const metaCacheManager = new MetaCacheManager();
