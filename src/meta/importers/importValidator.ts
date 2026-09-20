import { ALL_MLBB_HEROES } from '../../data/heroes';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';
import { ImportMetadata, RawRankedImportItem, RawProImportItem, normalizeRankScope } from './importTypes';
import { RawMLBBHubRankedHero, RawProMatchPayload } from '../raw/types';

// Set of all 133 verified hero IDs from Phase 1 roster
const VALID_HERO_MAP = new Map<string, string>();
for (const h of ALL_MLBB_HEROES) {
  VALID_HERO_MAP.set(h.id.toLowerCase(), h.id);
  VALID_HERO_MAP.set(h.name.toLowerCase(), h.id);
}

export interface ValidatedRankedImport {
  raw: RawMLBBHubRankedHero;
  heroId: string;
  isPatchMismatch: boolean;
  isValid: boolean;
  errors: string[];
}

export interface ValidatedProImport {
  raw: RawProMatchPayload;
  heroId: string;
  isPatchMismatch: boolean;
  isValid: boolean;
  errors: string[];
}

/**
 * Validates metadata and flags demo data isolation or patch mismatches
 */
export function validateImportMetadata(meta: Partial<ImportMetadata>): {
  isValid: boolean;
  isDemoBlocked: boolean;
  isPatchMismatch: boolean;
  resolvedMeta: ImportMetadata;
  errors: string[];
} {
  const errors: string[] = [];
  const isDemo = meta.isDemo === true;
  const isDemoBlocked = isDemo;

  if (isDemoBlocked) {
    errors.push('DEMO_ONLY data rejected: Demo datasets are isolated and forbidden from production repository.');
  }

  const patch = meta.patch?.trim() || ACTIVE_PATCH_CONFIG.activePatch;
  const isPatchMismatch = patch !== ACTIVE_PATCH_CONFIG.activePatch;

  const resolvedMeta: ImportMetadata = {
    source: meta.source?.trim() || 'Manual Import',
    sourceUrl: meta.sourceUrl || '',
    importedAt: meta.importedAt || new Date().toISOString(),
    patch,
    region: meta.region?.trim() || 'GLOBAL',
    mode: meta.mode || 'IMPORT',
    periodStart: meta.periodStart,
    periodEnd: meta.periodEnd,
    dataType: meta.dataType || 'RANKED',
    isDemo,
  };

  return {
    isValid: errors.length === 0,
    isDemoBlocked,
    isPatchMismatch,
    resolvedMeta,
    errors,
  };
}

/**
 * Validates a single raw ranked import item
 */
export function validateAndMapRawRanked(
  item: RawRankedImportItem,
  meta: ImportMetadata
): ValidatedRankedImport {
  const errors: string[] = [];

  // Hero resolution
  const rawHero = (item.heroId || item.hero_key || item.hero || '').trim().toLowerCase();
  const canonicalHeroId = VALID_HERO_MAP.get(rawHero);

  if (!canonicalHeroId) {
    errors.push(`Unknown hero "${rawHero || 'EMPTY'}". Must match Phase 1 verified roster.`);
  }

  // Patch
  const patch = (item.patch || item.patch_ver || meta.patch || '').trim();
  if (!patch) {
    errors.push('Patch version is required.');
  }
  const isPatchMismatch = patch !== ACTIVE_PATCH_CONFIG.activePatch;

  // RankScope
  const rawRank = item.rankScope || item.tier_bracket;
  const rankScope = normalizeRankScope(rawRank);

  // Region
  const region = (item.region || item.server_region || meta.region || 'GLOBAL').trim();

  // Metrics
  const sampleGames = Math.max(0, Number(item.matches ?? item.sample_games ?? 0));
  const picks = Math.max(0, Number(item.picks ?? item.picks_total ?? 0));
  const bans = Math.max(0, Number(item.bans ?? item.bans_total ?? 0));
  const wins = Math.max(0, Number(item.wins ?? item.wins_total ?? 0));
  const losses = Math.max(0, Number(item.losses ?? item.losses_total ?? 0));

  // Check negative numbers
  const checkRaw = [
    item.matches ?? item.sample_games,
    item.picks ?? item.picks_total,
    item.bans ?? item.bans_total,
    item.wins ?? item.wins_total,
    item.losses ?? item.losses_total,
  ];
  for (const val of checkRaw) {
    if (val !== undefined && Number(val) < 0) {
      errors.push(`Numeric values cannot be negative (received ${val}).`);
      break;
    }
  }

  const raw: RawMLBBHubRankedHero = {
    hero_key: canonicalHeroId || rawHero,
    hero_title: canonicalHeroId || rawHero,
    patch_ver: patch,
    tier_bracket: rankScope,
    server_region: region,
    sample_games: sampleGames > 0 ? sampleGames : (picks > 0 ? picks : 0),
    picks_total: picks,
    bans_total: bans,
    wins_total: wins,
    losses_total: losses,
    date_start: (item.periodStart || item.date_start || meta.periodStart || new Date().toISOString().slice(0, 10)),
    date_end: (item.periodEnd || item.date_end || meta.periodEnd || new Date().toISOString().slice(0, 10)),
    ingested_at: meta.importedAt,
    origin_url: item.sourceUrl || item.origin_url || meta.sourceUrl || '',
  };

  return {
    raw,
    heroId: canonicalHeroId || rawHero,
    isPatchMismatch,
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a single raw pro match import item
 */
export function validateAndMapRawPro(
  item: RawProImportItem,
  meta: ImportMetadata
): ValidatedProImport {
  const errors: string[] = [];

  // Hero resolution
  const rawHero = (item.heroId || item.hero_key || item.hero || '').trim().toLowerCase();
  const canonicalHeroId = VALID_HERO_MAP.get(rawHero);

  if (!canonicalHeroId) {
    errors.push(`Unknown hero "${rawHero || 'EMPTY'}". Must match Phase 1 verified roster.`);
  }

  // Patch
  const patch = (item.patch || item.game_patch || meta.patch || '').trim();
  if (!patch) {
    errors.push('Patch version is required.');
  }
  const isPatchMismatch = patch !== ACTIVE_PATCH_CONFIG.activePatch;

  // Tournament
  const tournament = (item.tournament || item.league || 'MPL ID').trim();
  if (!tournament) {
    errors.push('Tournament/league is required for pro data.');
  }

  // Side preservation: BLUE or RED
  const rawSide = String(item.side || item.map_side || '').trim().toUpperCase();
  let side: 'BLUE' | 'RED' = 'BLUE';
  if (rawSide === 'RED') {
    side = 'RED';
  } else if (rawSide === 'BLUE') {
    side = 'BLUE';
  }

  // Boolean flags
  const wasPicked = Boolean(item.picked ?? item.was_picked ?? false);
  const wasBanned = Boolean(item.banned ?? item.was_banned ?? false);
  const win = item.win !== undefined ? Boolean(item.win) : (item.outcome === 'WIN');

  const matchRef = (item.matchId || item.match_ref || `match_${tournament}_${Date.now()}_${canonicalHeroId || rawHero}`).trim();

  const raw: RawProMatchPayload = {
    match_ref: matchRef,
    league: tournament,
    game_date: (item.matchDate || item.game_date || meta.periodStart || new Date().toISOString().slice(0, 10)),
    hero_key: canonicalHeroId || rawHero,
    squad: (item.team || item.squad || 'Unknown Team').trim(),
    lane_role: (item.role || item.lane_role || 'Flex').trim(),
    map_side: side,
    was_picked: wasPicked,
    was_banned: wasBanned,
    outcome: win ? 'WIN' : 'LOSS',
    game_patch: patch,
    geo_region: (item.region || item.geo_region || meta.region || 'ID').trim(),
    data_origin: item.sourceUrl || item.data_origin || meta.sourceUrl || '',
  };

  return {
    raw,
    heroId: canonicalHeroId || rawHero,
    isPatchMismatch,
    isValid: errors.length === 0,
    errors,
  };
}
