import { MetaSnapshot, ProMatchRecord, PatchData, SourceConfidence } from './snapshot';

export type SourceMode = 'LIVE' | 'IMPORT' | 'MANUAL_EXTERNAL' | 'UNAVAILABLE';

export type DataSourceStatus = 
  | 'VERIFIED'         // Source successfully accessed and data schema fully validated
  | 'PARTIAL'          // Source accessible but only partial data valid
  | 'UNAVAILABLE'      // Source / API endpoint cannot be accessed (e.g. 404, offline, network error)
  | 'MANUAL_EXTERNAL'  // Source restricted by anti-bot/Cloudflare or manual dump required
  | 'INVALID';         // Response available but data schema/structure invalid or violated

export interface DataSourceInfo {
  id: string;
  name: string;
  category: 'RANKED' | 'PRO' | 'PATCH' | 'HERO_METADATA';
  mode: SourceMode;
  status: DataSourceStatus;
  confidence: SourceConfidence;
  lastSync?: string;
  recordCount: number;
  description: string;
  sourceUrl: string;
}

export interface DataSourceResult<T> {
  success: boolean;
  source: string;
  timestamp: string;
  data: T;
  error?: string;
}

/**
 * Base Abstraction for Meta Data Sources
 */
export interface MetaDataSource {
  readonly id: string;
  readonly name: string;
  readonly category: 'RANKED' | 'PRO' | 'PATCH' | 'HERO_METADATA';
  readonly mode: SourceMode;
  readonly confidence: SourceConfidence;
  readonly status: DataSourceStatus;
  readonly sourceUrl: string;
  getInfo(): DataSourceInfo;
}

/**
 * Specific Source Interfaces
 */
export interface RankedDataSource extends MetaDataSource {
  fetchRankedSnapshots(patch: string, rankScope?: string): Promise<DataSourceResult<MetaSnapshot[]>>;
}

export interface ProDataSource extends MetaDataSource {
  fetchProMatches(tournament?: string, patch?: string): Promise<DataSourceResult<ProMatchRecord[]>>;
}

export interface PatchDataSource extends MetaDataSource {
  fetchPatchNotes(version?: string): Promise<DataSourceResult<PatchData[]>>;
}
