import { NormalizedMetaRecord, NormalizedProRecord, NormalizedPatchData } from '../normalized/types';
import { RankScope } from '../types/snapshot';

export type RepositorySourceStatus = 'LIVE' | 'CACHED' | 'STALE_CACHE' | 'NO_DATA';

export interface RankedQueryFilter {
  patch?: string;
  rankScope?: RankScope | string;
  period?: string; // e.g. 'LAST_7_DAYS', '2026-09-01_2026-09-20', etc.
  region?: string;
  heroId?: string;
  source?: string;
  isHistorical?: boolean;
}

export interface ProQueryFilter {
  patch?: string;
  region?: string;
  tournament?: string;
  team?: string;
  heroId?: string;
  role?: string;
  side?: 'BLUE' | 'RED';
  source?: string;
  matchId?: string;
  isHistorical?: boolean;
}

export interface InsertResult {
  success: boolean;
  isDuplicate: boolean;
  recordId: string;
}

export interface BatchInsertResult {
  total: number;
  inserted: number;
  duplicates: number;
  rejected: number;
}
