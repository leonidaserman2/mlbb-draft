import { RawMLBBHubRankedHero, RawProMatchPayload, RawPatchPayload } from '../raw/types';
import { NormalizedMetaRecord, NormalizedProRecord, NormalizedPatchData } from './types';
import { validateMetaSnapshot, validateProMatch, validatePatchData, ValidationError } from '../validation/validator';
import { MetaSnapshot, ProMatchRecord, PatchData } from '../types/snapshot';

export interface NormalizationBatchResult<T> {
  valid: T[];
  rejected: { raw: any; errors: ValidationError[] }[];
  totalProcessed: number;
}

/**
 * Normalizes Raw MLBBHub Ranked Hero payloads into standard NormalizedMetaRecord
 */
export function normalizeRankedPayload(
  raw: RawMLBBHubRankedHero,
  confidence: 'official' | 'primary' | 'secondary' | 'community' = 'primary'
): { record?: NormalizedMetaRecord; errors: ValidationError[] } {
  // Calculate exact percentage rates from raw counts
  const pickRate = raw.sample_games > 0 ? Number(((raw.picks_total / raw.sample_games) * 100).toFixed(2)) : 0;
  const banRate = raw.sample_games > 0 ? Number(((raw.bans_total / raw.sample_games) * 100).toFixed(2)) : 0;
  const winRate = raw.picks_total > 0 ? Number(((raw.wins_total / raw.picks_total) * 100).toFixed(2)) : 0;
  const presenceRate = Number((pickRate + banRate).toFixed(2));

  const candidate: MetaSnapshot = {
    id: `${raw.hero_key}_${raw.patch_ver}_RANKED_${raw.server_region}_${raw.tier_bracket}_${raw.date_start}`,
    heroId: raw.hero_key.toLowerCase().trim(),
    patch: raw.patch_ver.trim(),
    mode: 'RANKED',
    rankScope: raw.tier_bracket,
    region: raw.server_region,
    periodStart: raw.date_start,
    periodEnd: raw.date_end,
    source: 'MLBBHub Ranked',
    matches: raw.picks_total, // matches played by this hero
    picks: raw.picks_total,
    bans: raw.bans_total,
    wins: raw.wins_total,
    losses: raw.losses_total,
    pickRate,
    banRate,
    winRate,
    presenceRate,
    sourceUrl: raw.origin_url,
    collectedAt: raw.ingested_at,
    confidence,
  };

  const validation = validateMetaSnapshot(candidate);
  if (!validation.isValid) {
    return { errors: validation.errors };
  }

  const normalized: NormalizedMetaRecord = {
    ...validation.data!,
    normalizedAt: new Date().toISOString(),
    isValidated: true,
    importedAt: raw.ingested_at || new Date().toISOString(),
    originalRecordId: raw.hero_key,
  };

  return { record: normalized, errors: [] };
}

/**
 * Normalizes an array of Raw Ranked Heroes
 */
export function normalizeRankedBatch(
  rawList: RawMLBBHubRankedHero[],
  confidence: 'official' | 'primary' | 'secondary' | 'community' = 'primary'
): NormalizationBatchResult<NormalizedMetaRecord> {
  const valid: NormalizedMetaRecord[] = [];
  const rejected: { raw: any; errors: ValidationError[] }[] = [];

  for (const item of rawList) {
    const res = normalizeRankedPayload(item, confidence);
    if (res.record) {
      valid.push(res.record);
    } else {
      rejected.push({ raw: item, errors: res.errors });
    }
  }

  return {
    valid,
    rejected,
    totalProcessed: rawList.length,
  };
}

/**
 * Normalizes Raw Pro Match payloads
 */
export function normalizeProMatchPayload(
  raw: RawProMatchPayload,
  sourceName: string = 'Liquipedia Competitive'
): { record?: NormalizedProRecord; errors: ValidationError[] } {
  const candidate: ProMatchRecord = {
    id: raw.match_ref,
    heroId: raw.hero_key.toLowerCase().trim(),
    patch: raw.game_patch.trim(),
    tournament: raw.league,
    region: raw.geo_region,
    team: raw.squad,
    role: raw.lane_role,
    side: raw.map_side,
    picked: raw.was_picked,
    banned: raw.was_banned,
    win: raw.outcome === 'WIN',
    matchDate: raw.game_date,
    source: sourceName,
    sourceUrl: raw.data_origin,
    collectedAt: new Date().toISOString(),
  };

  const validation = validateProMatch(candidate);
  if (!validation.isValid) {
    return { errors: validation.errors };
  }

  const normalized: NormalizedProRecord = {
    ...validation.data!,
    normalizedAt: new Date().toISOString(),
    isValidated: true,
    importedAt: new Date().toISOString(),
    originalRecordId: raw.match_ref,
  };

  return { record: normalized, errors: [] };
}

/**
 * Normalizes Raw Pro Match batches
 */
export function normalizeProMatchBatch(
  rawList: RawProMatchPayload[],
  sourceName: string = 'Liquipedia Competitive'
): NormalizationBatchResult<NormalizedProRecord> {
  const valid: NormalizedProRecord[] = [];
  const rejected: { raw: any; errors: ValidationError[] }[] = [];

  for (const item of rawList) {
    const res = normalizeProMatchPayload(item, sourceName);
    if (res.record) {
      valid.push(res.record);
    } else {
      rejected.push({ raw: item, errors: res.errors });
    }
  }

  return {
    valid,
    rejected,
    totalProcessed: rawList.length,
  };
}

/**
 * Normalizes Raw Patch payload
 */
export function normalizePatchPayload(
  raw: RawPatchPayload
): { record?: NormalizedPatchData; errors: ValidationError[] } {
  const candidate: PatchData = {
    patchId: `PATCH_${raw.patch_label.replace(/\./g, '_')}`,
    version: raw.patch_label,
    releaseDate: raw.deployment_date,
    changes: raw.modifications.map((m) => ({
      heroId: m.target_hero.toLowerCase().trim(),
      patch: raw.patch_label,
      changeType: m.action,
      description: m.summary,
      attributeChanges: m.stat_deltas,
    })),
    source: raw.source_channel,
    sourceUrl: raw.source_web_url,
    collectedAt: new Date().toISOString(),
  };

  const validation = validatePatchData(candidate);
  if (!validation.isValid) {
    return { errors: validation.errors };
  }

  const normalized: NormalizedPatchData = {
    ...validation.data!,
    normalizedAt: new Date().toISOString(),
    isValidated: true,
  };

  return { record: normalized, errors: [] };
}
