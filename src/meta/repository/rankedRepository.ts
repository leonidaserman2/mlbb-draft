import { NormalizedMetaRecord } from '../normalized/types';
import { RankedQueryFilter, InsertResult, BatchInsertResult } from './repositoryTypes';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';

export class RankedRepository {
  // Map keyed by deterministic record ID
  private records = new Map<string, NormalizedMetaRecord>();

  /**
   * Generates a deterministic record ID based on:
   * source + heroId + patch + rankScope + period (start_end)
   */
  generateDeterministicId(record: {
    source: string;
    heroId: string;
    patch: string;
    rankScope: string;
    periodStart?: string;
    periodEnd?: string;
  }): string {
    const src = (record.source || 'unknown').trim().toLowerCase();
    const hero = (record.heroId || '').trim().toLowerCase();
    const patch = (record.patch || '').trim().toLowerCase();
    const scope = (record.rankScope || 'GLOBAL').trim().toLowerCase();
    const pStart = (record.periodStart || '').trim();
    const pEnd = (record.periodEnd || '').trim();
    return `${src}::${hero}::${patch}::${scope}::${pStart}_${pEnd}`;
  }

  /**
   * Inserts a record. If duplicate deterministic ID exists, rejects unless replace is used.
   */
  insert(record: NormalizedMetaRecord, options?: { allowHistorical?: boolean }): InsertResult {
    const detId = this.generateDeterministicId(record);

    if (this.records.has(detId)) {
      return {
        success: false,
        isDuplicate: true,
        recordId: detId,
      };
    }

    const isHistorical = record.patch !== ACTIVE_PATCH_CONFIG.activePatch;
    if (isHistorical && options?.allowHistorical === false) {
      return {
        success: false,
        isDuplicate: false,
        recordId: detId,
      };
    }

    const storedRecord: NormalizedMetaRecord = {
      ...record,
      id: detId,
      isHistorical,
    };

    this.records.set(detId, storedRecord);
    return {
      success: true,
      isDuplicate: false,
      recordId: detId,
    };
  }

  /**
   * Replaces or upserts a record
   */
  replace(record: NormalizedMetaRecord): void {
    const detId = this.generateDeterministicId(record);
    const isHistorical = record.patch !== ACTIVE_PATCH_CONFIG.activePatch;
    this.records.set(detId, {
      ...record,
      id: detId,
      isHistorical,
    });
  }

  /**
   * Inserts a batch of records
   */
  insertBatch(records: NormalizedMetaRecord[], options?: { allowHistorical?: boolean }): BatchInsertResult {
    let inserted = 0;
    let duplicates = 0;
    let rejected = 0;

    for (const rec of records) {
      const res = this.insert(rec, options);
      if (res.success) {
        inserted++;
      } else if (res.isDuplicate) {
        duplicates++;
      } else {
        rejected++;
      }
    }

    return {
      total: records.length,
      inserted,
      duplicates,
      rejected,
    };
  }

  /**
   * Query records with flexible filters (patch-aware)
   */
  query(filter?: RankedQueryFilter): NormalizedMetaRecord[] {
    let list = Array.from(this.records.values());

    if (!filter) return list;

    if (filter.patch !== undefined) {
      list = list.filter((r) => r.patch === filter.patch);
    }

    if (filter.rankScope !== undefined) {
      list = list.filter((r) => r.rankScope.toLowerCase() === filter.rankScope!.toLowerCase());
    }

    if (filter.region !== undefined) {
      list = list.filter((r) => r.region.toLowerCase() === filter.region!.toLowerCase());
    }

    if (filter.heroId !== undefined) {
      list = list.filter((r) => r.heroId.toLowerCase() === filter.heroId!.toLowerCase());
    }

    if (filter.source !== undefined) {
      list = list.filter((r) => r.source.toLowerCase() === filter.source!.toLowerCase());
    }

    if (filter.period !== undefined) {
      list = list.filter((r) => {
        const fullPeriod = `${r.periodStart}_${r.periodEnd}`;
        return fullPeriod.includes(filter.period!) || r.periodStart === filter.period;
      });
    }

    if (filter.isHistorical !== undefined) {
      list = list.filter((r) => Boolean(r.isHistorical) === filter.isHistorical);
    }

    return list;
  }

  /**
   * Get latest active ranked records (defaults to current ACTIVE_PATCH_CONFIG)
   */
  getLatest(filter?: RankedQueryFilter): NormalizedMetaRecord[] {
    const activePatch = filter?.patch || ACTIVE_PATCH_CONFIG.activePatch;
    return this.query({
      ...filter,
      patch: activePatch,
      isHistorical: false,
    });
  }

  getByPatch(patch: string): NormalizedMetaRecord[] {
    return this.query({ patch });
  }

  getByPeriod(periodStart: string, periodEnd?: string): NormalizedMetaRecord[] {
    return Array.from(this.records.values()).filter((r) => {
      if (periodEnd) {
        return r.periodStart === periodStart && r.periodEnd === periodEnd;
      }
      return r.periodStart === periodStart;
    });
  }

  getByHero(heroId: string, patch?: string): NormalizedMetaRecord[] {
    return this.query({ heroId, patch });
  }

  getBySource(source: string): NormalizedMetaRecord[] {
    return this.query({ source });
  }

  clearSource(source: string): number {
    const toDelete: string[] = [];
    for (const [id, rec] of this.records.entries()) {
      if (rec.source.toLowerCase() === source.toLowerCase()) {
        toDelete.push(id);
      }
    }
    for (const id of toDelete) {
      this.records.delete(id);
    }
    return toDelete.length;
  }

  clearAll(): void {
    this.records.clear();
  }

  count(): number {
    return this.records.size;
  }
}

export const rankedRepository = new RankedRepository();
