import { rankedRepository, RankedRepository } from './rankedRepository';
import { proRepository, ProRepository } from './proRepository';
import { patchRepository, PatchRepository } from './patchRepository';
import { metaCacheManager } from '../cache/metaCache';
import { RepositorySourceStatus } from './repositoryTypes';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';

export class MetaRepositoryCoordinator {
  readonly ranked: RankedRepository;
  readonly pro: ProRepository;
  readonly patch: PatchRepository;

  private isInitialized = false;

  constructor(
    ranked: RankedRepository = rankedRepository,
    pro: ProRepository = proRepository,
    patch: PatchRepository = patchRepository
  ) {
    this.ranked = ranked;
    this.pro = pro;
    this.patch = patch;
  }

  /**
   * Initializes repository and loads any valid cached snapshots
   */
  initializeFromCache(): void {
    if (this.isInitialized) return;

    try {
      const cache = metaCacheManager.getCache();
      
      // Load cached ranked snapshots if valid
      if (cache.rankedSnapshots && cache.rankedSnapshots.length > 0) {
        for (const snap of cache.rankedSnapshots) {
          const isHistorical = snap.patch !== ACTIVE_PATCH_CONFIG.activePatch;
          this.ranked.insert({
            ...snap,
            normalizedAt: snap.collectedAt || new Date().toISOString(),
            isValidated: true,
            importedAt: snap.collectedAt || new Date().toISOString(),
            originalRecordId: snap.id,
            isHistorical,
          });
        }
      }

      // Load cached pro snapshots if valid
      if (cache.proSnapshots && cache.proSnapshots.length > 0) {
        for (const pro of cache.proSnapshots) {
          const isHistorical = pro.patch !== ACTIVE_PATCH_CONFIG.activePatch;
          this.pro.insert({
            ...pro,
            normalizedAt: pro.collectedAt || new Date().toISOString(),
            isValidated: true,
            importedAt: pro.collectedAt || new Date().toISOString(),
            originalRecordId: pro.id,
            isHistorical,
          });
        }
      }

      // Load cached patch notes
      if (cache.patchNotes && cache.patchNotes.length > 0) {
        for (const p of cache.patchNotes) {
          this.patch.insert({
            ...p,
            normalizedAt: p.collectedAt || new Date().toISOString(),
            isValidated: true,
          });
        }
      }
    } catch {
      // Ignore cache load errors
    } finally {
      this.isInitialized = true;
    }
  }

  /**
   * Evaluates current repository status distinguishing LIVE, CACHED, STALE_CACHE, and NO_DATA.
   * If data is from an old cache or sync failed, marks STALE_CACHE.
   */
  getStatus(): {
    overallStatus: RepositorySourceStatus;
    rankedStatus: RepositorySourceStatus;
    proStatus: RepositorySourceStatus;
    patchStatus: RepositorySourceStatus;
    rankedCount: number;
    proCount: number;
    lastSuccessfulSync: string | null;
    isStale: boolean;
  } {
    const cache = metaCacheManager.getCache();
    const rankedCount = this.ranked.count();
    const proCount = this.pro.count();

    const rankedEntry = cache.sourcesCacheDetails['mlbbhub-ranked'];
    let rankedStatus: RepositorySourceStatus = 'NO_DATA';
    if (rankedCount > 0) {
      if (rankedEntry?.status === 'LIVE_VERIFIED') {
        rankedStatus = 'LIVE';
      } else if (rankedEntry?.status === 'STALE_CACHE') {
        rankedStatus = 'STALE_CACHE';
      } else {
        rankedStatus = 'CACHED';
      }
    }

    const proEntries = [
      cache.sourcesCacheDetails['mlbbhub-mpl-id'],
      cache.sourcesCacheDetails['mpl-philippines'],
      cache.sourcesCacheDetails['liquipedia-competitive'],
    ].filter(Boolean);

    let proStatus: RepositorySourceStatus = 'NO_DATA';
    if (proCount > 0) {
      if (proEntries.some((e) => e.status === 'LIVE_VERIFIED')) {
        proStatus = 'LIVE';
      } else if (proEntries.some((e) => e.status === 'STALE_CACHE')) {
        proStatus = 'STALE_CACHE';
      } else {
        proStatus = 'CACHED';
      }
    }

    const patchEntry = cache.sourcesCacheDetails['mlbbdex-patch'];
    let patchStatus: RepositorySourceStatus = 'NO_DATA';
    if (this.patch.count() > 0) {
      if (patchEntry?.status === 'LIVE_VERIFIED') {
        patchStatus = 'LIVE';
      } else if (patchEntry?.status === 'STALE_CACHE') {
        patchStatus = 'STALE_CACHE';
      } else {
        patchStatus = 'CACHED';
      }
    }

    let overallStatus: RepositorySourceStatus = 'NO_DATA';
    if (rankedStatus === 'LIVE' || proStatus === 'LIVE') {
      overallStatus = 'LIVE';
    } else if (rankedStatus === 'STALE_CACHE' || proStatus === 'STALE_CACHE') {
      overallStatus = 'STALE_CACHE';
    } else if (rankedCount > 0 || proCount > 0) {
      overallStatus = 'CACHED';
    }

    const isStale = overallStatus === 'STALE_CACHE';

    return {
      overallStatus,
      rankedStatus,
      proStatus,
      patchStatus,
      rankedCount,
      proCount,
      lastSuccessfulSync: cache.lastSuccessfulSync,
      isStale,
    };
  }

  clearAll(): void {
    this.ranked.clearAll();
    this.pro.clearAll();
    this.patch.clear();
  }
}

export const metaRepository = new MetaRepositoryCoordinator();
// Auto-initialize on module load
metaRepository.initializeFromCache();
