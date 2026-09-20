import { ALL_MLBB_HEROES } from '../../data/heroes';
import { MetaSnapshot, ProMatchRecord, PatchData } from '../types/snapshot';

export interface ValidationError {
  entityType: 'SNAPSHOT' | 'PRO_MATCH' | 'PATCH';
  id?: string;
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
}

// Set of all 133 verified hero IDs from Phase 1 database
const VALID_HERO_IDS = new Set<string>(ALL_MLBB_HEROES.map((h) => h.id));

function isValidDateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const timestamp = Date.parse(dateStr);
  return !isNaN(timestamp);
}

/**
 * Validates a Meta Snapshot before normalizing and caching
 */
export function validateMetaSnapshot(raw: Partial<MetaSnapshot>): ValidationResult<MetaSnapshot> {
  const errors: ValidationError[] = [];

  // 1. heroId must exist and match Phase 1 hero database (no fictional heroes)
  if (!raw.heroId || typeof raw.heroId !== 'string') {
    errors.push({
      entityType: 'SNAPSHOT',
      id: raw.id,
      field: 'heroId',
      message: 'heroId is required and must be a string',
      value: raw.heroId,
    });
  } else if (!VALID_HERO_IDS.has(raw.heroId)) {
    errors.push({
      entityType: 'SNAPSHOT',
      id: raw.id,
      field: 'heroId',
      message: `Invalid or unverified heroId "${raw.heroId}". Must match Phase 1 verified hero list.`,
      value: raw.heroId,
    });
  }

  // 2. patch must be valid string
  if (!raw.patch || typeof raw.patch !== 'string' || raw.patch.trim() === '') {
    errors.push({
      entityType: 'SNAPSHOT',
      id: raw.id,
      field: 'patch',
      message: 'patch is required and must be a valid version string',
      value: raw.patch,
    });
  }

  // 3. source must be recorded
  if (!raw.source || typeof raw.source !== 'string' || raw.source.trim() === '') {
    errors.push({
      entityType: 'SNAPSHOT',
      id: raw.id,
      field: 'source',
      message: 'source is mandatory and must not be empty',
      value: raw.source,
    });
  }

  // 4. Non-negative statistics
  const numericFields: (keyof MetaSnapshot)[] = [
    'matches',
    'picks',
    'bans',
    'wins',
    'losses',
    'pickRate',
    'banRate',
    'winRate',
    'presenceRate',
  ];

  for (const field of numericFields) {
    const val = raw[field];
    if (typeof val !== 'number' || isNaN(val) || val < 0) {
      errors.push({
        entityType: 'SNAPSHOT',
        id: raw.id,
        field,
        message: `${field} must be a non-negative number`,
        value: val,
      });
    }
  }

  // 5. Rate percentages must be between 0 and 100
  const rateFields: (keyof MetaSnapshot)[] = ['pickRate', 'banRate', 'winRate', 'presenceRate'];
  for (const field of rateFields) {
    const val = raw[field];
    if (typeof val === 'number' && (val < 0 || val > 100)) {
      errors.push({
        entityType: 'SNAPSHOT',
        id: raw.id,
        field,
        message: `${field} must be between 0 and 100%`,
        value: val,
      });
    }
  }

  // 6. Consistency: wins + losses should match matches (when provided as counts)
  if (
    typeof raw.matches === 'number' &&
    typeof raw.wins === 'number' &&
    typeof raw.losses === 'number' &&
    raw.matches > 0
  ) {
    if (raw.wins + raw.losses !== raw.matches) {
      errors.push({
        entityType: 'SNAPSHOT',
        id: raw.id,
        field: 'matches',
        message: `Inconsistent stats: wins (${raw.wins}) + losses (${raw.losses}) !== matches (${raw.matches})`,
        value: { wins: raw.wins, losses: raw.losses, matches: raw.matches },
      });
    }
  }

  // 7. Consistency: picks cannot exceed matches
  if (
    typeof raw.matches === 'number' &&
    typeof raw.picks === 'number' &&
    raw.picks > raw.matches
  ) {
    errors.push({
      entityType: 'SNAPSHOT',
      id: raw.id,
      field: 'picks',
      message: `Picks (${raw.picks}) cannot exceed total matches (${raw.matches})`,
      value: { picks: raw.picks, matches: raw.matches },
    });
  }

  // 8. Dates validation
  if (!raw.periodStart || !isValidDateString(raw.periodStart)) {
    errors.push({
      entityType: 'SNAPSHOT',
      id: raw.id,
      field: 'periodStart',
      message: 'periodStart must be a valid date string',
      value: raw.periodStart,
    });
  }

  if (!raw.periodEnd || !isValidDateString(raw.periodEnd)) {
    errors.push({
      entityType: 'SNAPSHOT',
      id: raw.id,
      field: 'periodEnd',
      message: 'periodEnd must be a valid date string',
      value: raw.periodEnd,
    });
  }

  if (
    raw.periodStart &&
    raw.periodEnd &&
    isValidDateString(raw.periodStart) &&
    isValidDateString(raw.periodEnd)
  ) {
    if (new Date(raw.periodStart) > new Date(raw.periodEnd)) {
      errors.push({
        entityType: 'SNAPSHOT',
        id: raw.id,
        field: 'periodStart',
        message: 'periodStart must be before or equal to periodEnd',
        value: { start: raw.periodStart, end: raw.periodEnd },
      });
    }
  }

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? (raw as MetaSnapshot) : undefined,
    errors,
  };
}

/**
 * Validates a Pro Match record
 */
export function validateProMatch(raw: Partial<ProMatchRecord>): ValidationResult<ProMatchRecord> {
  const errors: ValidationError[] = [];

  if (!raw.heroId || !VALID_HERO_IDS.has(raw.heroId)) {
    errors.push({
      entityType: 'PRO_MATCH',
      id: raw.id,
      field: 'heroId',
      message: `Invalid or unverified heroId "${raw.heroId}"`,
      value: raw.heroId,
    });
  }

  if (!raw.patch || typeof raw.patch !== 'string') {
    errors.push({
      entityType: 'PRO_MATCH',
      id: raw.id,
      field: 'patch',
      message: 'patch is required',
      value: raw.patch,
    });
  }

  if (!raw.tournament || typeof raw.tournament !== 'string') {
    errors.push({
      entityType: 'PRO_MATCH',
      id: raw.id,
      field: 'tournament',
      message: 'tournament name is required',
      value: raw.tournament,
    });
  }

  if (!raw.source || typeof raw.source !== 'string') {
    errors.push({
      entityType: 'PRO_MATCH',
      id: raw.id,
      field: 'source',
      message: 'source is mandatory',
      value: raw.source,
    });
  }

  if (!raw.matchDate || !isValidDateString(raw.matchDate)) {
    errors.push({
      entityType: 'PRO_MATCH',
      id: raw.id,
      field: 'matchDate',
      message: 'matchDate must be a valid date',
      value: raw.matchDate,
    });
  }

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? (raw as ProMatchRecord) : undefined,
    errors,
  };
}

/**
 * Validates Patch Data
 */
export function validatePatchData(raw: Partial<PatchData>): ValidationResult<PatchData> {
  const errors: ValidationError[] = [];

  if (!raw.version || typeof raw.version !== 'string') {
    errors.push({
      entityType: 'PATCH',
      id: raw.patchId,
      field: 'version',
      message: 'version is required',
      value: raw.version,
    });
  }

  if (!raw.source || typeof raw.source !== 'string') {
    errors.push({
      entityType: 'PATCH',
      id: raw.patchId,
      field: 'source',
      message: 'source is mandatory',
      value: raw.source,
    });
  }

  if (raw.changes && Array.isArray(raw.changes)) {
    for (let i = 0; i < raw.changes.length; i++) {
      const change = raw.changes[i];
      if (!change.heroId || !VALID_HERO_IDS.has(change.heroId)) {
        errors.push({
          entityType: 'PATCH',
          id: raw.patchId,
          field: `changes[${i}].heroId`,
          message: `Hero "${change.heroId}" in patch changes is not in the verified hero list`,
          value: change.heroId,
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? (raw as PatchData) : undefined,
    errors,
  };
}
