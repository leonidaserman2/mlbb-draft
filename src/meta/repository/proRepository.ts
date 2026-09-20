import { NormalizedProRecord } from '../normalized/types';
import { ProQueryFilter, InsertResult, BatchInsertResult } from './repositoryTypes';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';

export class ProRepository {
  private records = new Map<string, NormalizedProRecord>();

  /**
   * Generates a deterministic record ID for Pro matches based on:
   * source + tournament + (matchId or matchDate_team) + heroId + side + actionType
   */
  generateDeterministicId(record: {
    source: string;
    tournament: string;
    matchId?: string;
    matchDate?: string;
    team?: string;
    heroId: string;
    side?: 'BLUE' | 'RED' | string;
    picked?: boolean;
    banned?: boolean;
  }): string {
    const src = (record.source || 'unknown').trim().toLowerCase();
    const tour = (record.tournament || 'tournament').trim().toLowerCase();
    const hero = (record.heroId || '').trim().toLowerCase();
    const side = (record.side || 'NEUTRAL').trim().toUpperCase();
    const actionType = record.picked ? 'PICK' : record.banned ? 'BAN' : 'ACTION';

    if (record.matchId) {
      const mId = record.matchId.trim().toLowerCase();
      return `${src}::${tour}::${mId}::${hero}::${side}::${actionType}`;
    }

    const mDate = (record.matchDate || '').trim();
    const team = (record.team || '').trim().toLowerCase();
    return `${src}::${tour}::${mDate}::${team}::${hero}::${side}::${actionType}`;
  }

  /**
   * Inserts a pro record with deduplication
   */
  insert(record: NormalizedProRecord): InsertResult {
    const detId = this.generateDeterministicId(record);

    if (this.records.has(detId)) {
      return {
        success: false,
        isDuplicate: true,
        recordId: detId,
      };
    }

    const isHistorical = record.patch !== ACTIVE_PATCH_CONFIG.activePatch;
    const storedRecord: NormalizedProRecord = {
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
   * Replaces or upserts a pro record
   */
  replace(record: NormalizedProRecord): void {
    const detId = this.generateDeterministicId(record);
    const isHistorical = record.patch !== ACTIVE_PATCH_CONFIG.activePatch;
    this.records.set(detId, {
      ...record,
      id: detId,
      isHistorical,
    });
  }

  /**
   * Inserts batch of pro records
   */
  insertBatch(records: NormalizedProRecord[]): BatchInsertResult {
    let inserted = 0;
    let duplicates = 0;
    let rejected = 0;

    for (const rec of records) {
      const res = this.insert(rec);
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
   * Query pro records with filters
   */
  query(filter?: ProQueryFilter): NormalizedProRecord[] {
    let list = Array.from(this.records.values());

    if (!filter) return list;

    if (filter.patch !== undefined) {
      list = list.filter((r) => r.patch === filter.patch);
    }

    if (filter.region !== undefined) {
      list = list.filter((r) => r.region.toLowerCase() === filter.region!.toLowerCase());
    }

    if (filter.tournament !== undefined) {
      list = list.filter((r) => r.tournament.toLowerCase().includes(filter.tournament!.toLowerCase()));
    }

    if (filter.team !== undefined) {
      list = list.filter((r) => r.team?.toLowerCase().includes(filter.team!.toLowerCase()));
    }

    if (filter.heroId !== undefined) {
      list = list.filter((r) => r.heroId.toLowerCase() === filter.heroId!.toLowerCase());
    }

    if (filter.role !== undefined) {
      list = list.filter((r) => r.role?.toLowerCase() === filter.role!.toLowerCase());
    }

    if (filter.side !== undefined) {
      list = list.filter((r) => r.side === filter.side);
    }

    if (filter.source !== undefined) {
      list = list.filter((r) => r.source.toLowerCase() === filter.source!.toLowerCase());
    }

    if (filter.matchId !== undefined) {
      list = list.filter((r) => r.matchId === filter.matchId);
    }

    if (filter.isHistorical !== undefined) {
      list = list.filter((r) => Boolean(r.isHistorical) === filter.isHistorical);
    }

    return list;
  }

  getLatest(filter?: ProQueryFilter): NormalizedProRecord[] {
    const activePatch = filter?.patch || ACTIVE_PATCH_CONFIG.activePatch;
    return this.query({
      ...filter,
      patch: activePatch,
      isHistorical: false,
    });
  }

  getByPatch(patch: string): NormalizedProRecord[] {
    return this.query({ patch });
  }

  getByPeriod(startDate: string, endDate?: string): NormalizedProRecord[] {
    return Array.from(this.records.values()).filter((r) => {
      if (endDate) {
        return r.matchDate >= startDate && r.matchDate <= endDate;
      }
      return r.matchDate === startDate;
    });
  }

  getByHero(heroId: string, patch?: string): NormalizedProRecord[] {
    return this.query({ heroId, patch });
  }

  getBySource(source: string): NormalizedProRecord[] {
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

export const proRepository = new ProRepository();
