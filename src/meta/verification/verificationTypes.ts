/**
 * Phase 2A.5 — Meta Data Source Verification Types
 */

export type SourceVerificationStatus =
  | 'VERIFIED'
  | 'PARTIAL'
  | 'UNAVAILABLE'
  | 'MANUAL_EXTERNAL'
  | 'INVALID';

export interface RosterAuditBreakdown {
  matchedHeroes: string[];
  unknownHeroes: string[];
  missingHeroes: string[];
  duplicateHeroes: string[];
}

export interface SourceVerificationResult {
  source: string;
  sourceId: string;
  category: 'RANKED' | 'PRO' | 'PATCH' | 'HERO_METADATA';
  status: SourceVerificationStatus;
  reachable: boolean;
  httpStatus: number | null;
  fetchedAt: string;
  responseFormat: string;
  recordsReceived: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  patchDetected: string | null;
  patchStatus: 'MATCH' | 'PATCH_MISMATCH' | 'UNKNOWN';
  heroesDetected: string[];
  sourceUrl: string;
  errors: string[];
  rosterAudit: RosterAuditBreakdown;
  isDemoData: boolean;
}

export interface OverallVerificationSummary {
  verifiedAt: string;
  activePatch: string;
  totalSources: number;
  verifiedCount: number;
  partialCount: number;
  unavailableCount: number;
  manualExternalCount: number;
  invalidCount: number;
  demoDataDetectedInProduction: boolean;
  results: SourceVerificationResult[];
}
