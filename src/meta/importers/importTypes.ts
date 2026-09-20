import { RankScope } from '../types/snapshot';
import { SourceMode } from '../types/source';

export interface ImportMetadata {
  source: string;
  sourceUrl?: string;
  importedAt: string; // ISO timestamp
  patch: string;
  region: string;
  mode: SourceMode;
  periodStart?: string;
  periodEnd?: string;
  dataType: 'RANKED' | 'PRO' | 'PATCH';
  isDemo: boolean;
}

export interface ImportResult<T = any> {
  source: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'PATCH_MISMATCH';
  recordsReceived: number;
  recordsAccepted: number;
  recordsRejected: number;
  duplicates: number;
  patchMismatch: boolean;
  unknownHeroes: string[];
  validationErrors: string[];
  importedAt: string;
  importedRecords?: T[];
}

/**
 * Permissive Raw Ranked import item shape supported in JSON / CSV
 */
export interface RawRankedImportItem {
  heroId?: string;
  hero_key?: string;
  hero?: string;
  patch?: string;
  patch_ver?: string;
  rankScope?: string;
  tier_bracket?: string;
  region?: string;
  server_region?: string;
  periodStart?: string;
  date_start?: string;
  periodEnd?: string;
  date_end?: string;
  matches?: number | string;
  sample_games?: number | string;
  picks?: number | string;
  picks_total?: number | string;
  bans?: number | string;
  bans_total?: number | string;
  wins?: number | string;
  wins_total?: number | string;
  losses?: number | string;
  losses_total?: number | string;
  pickRate?: number | string;
  banRate?: number | string;
  winRate?: number | string;
  presenceRate?: number | string;
  source?: string;
  sourceUrl?: string;
  origin_url?: string;
  isDemo?: boolean;
}

/**
 * Permissive Raw Pro import item shape supported in JSON / CSV
 */
export interface RawProImportItem {
  heroId?: string;
  hero_key?: string;
  hero?: string;
  patch?: string;
  game_patch?: string;
  tournament?: string;
  league?: string;
  season?: string;
  region?: string;
  geo_region?: string;
  team?: string;
  squad?: string;
  role?: string;
  lane_role?: string;
  side?: 'BLUE' | 'RED' | string;
  map_side?: 'BLUE' | 'RED' | string;
  picked?: boolean | string | number;
  was_picked?: boolean | string | number;
  banned?: boolean | string | number;
  was_banned?: boolean | string | number;
  win?: boolean | string | number;
  outcome?: 'WIN' | 'LOSS' | string;
  matchId?: string;
  match_ref?: string;
  matchDate?: string;
  game_date?: string;
  source?: string;
  sourceUrl?: string;
  data_origin?: string;
  isDemo?: boolean;
}

export const VALID_RANK_SCOPES: readonly RankScope[] = [
  'Epic',
  'Legend',
  'Mythic',
  'Mythical Honor',
  'Mythical Glory',
  'Mythical Immortal',
  'MYTHIC_PLUS',
  'GLOBAL',
] as const;

/**
 * Normalizes input rank scope string into one of the 8 canonical rank scopes
 * without conflating MYTHIC_PLUS with all ranks.
 */
export function normalizeRankScope(rawScope?: string): RankScope {
  if (!rawScope) return 'GLOBAL';
  const trimmed = rawScope.trim();
  
  // Exact matches
  for (const valid of VALID_RANK_SCOPES) {
    if (trimmed.toLowerCase() === valid.toLowerCase()) {
      return valid;
    }
  }

  // Common aliases
  const lower = trimmed.toLowerCase();
  if (lower === 'mythic+' || lower === 'mythic_plus' || lower === 'mythic plus') {
    return 'MYTHIC_PLUS';
  }
  if (lower === 'honor' || lower === 'mythical honor') {
    return 'Mythical Honor';
  }
  if (lower === 'glory' || lower === 'mythical glory') {
    return 'Mythical Glory';
  }
  if (lower === 'immortal' || lower === 'mythical immortal') {
    return 'Mythical Immortal';
  }
  if (lower === 'all' || lower === 'all ranks' || lower === 'global') {
    return 'GLOBAL';
  }

  return 'GLOBAL';
}
