import { MetaSnapshot, ProMatchRecord, PatchData } from '../types/snapshot';

/**
 * NORMALIZED DATA LAYER
 * Data has been unified by heroId, patch, region, mode, and period.
 * Does NOT contain calculated trends or rankings.
 */

export interface NormalizedMetaRecord extends MetaSnapshot {
  normalizedAt: string; // ISO timestamp
  isValidated: true;
  importedAt: string; // ISO timestamp of ingest/import
  originalRecordId?: string;
  isHistorical?: boolean; // Set if patch is historical
}

export interface NormalizedProRecord extends ProMatchRecord {
  normalizedAt: string;
  isValidated: true;
  importedAt: string;
  originalRecordId?: string;
  periodStart?: string;
  periodEnd?: string;
  isHistorical?: boolean;
}

export interface NormalizedPatchData extends PatchData {
  normalizedAt: string;
  isValidated: true;
}
