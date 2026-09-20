import { ALL_MLBB_HEROES } from '../../data/heroes';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';
import {
  SourceVerificationResult,
  SourceVerificationStatus,
  RosterAuditBreakdown,
} from './verificationTypes';
import { MetaDataSource } from '../types/source';

// Create a fast lookup Set for verified Phase 1 roster
const VERIFIED_ROSTER_IDS = new Set(ALL_MLBB_HEROES.map((h) => h.id.toLowerCase()));

/**
 * Performs roster verification comparing extracted hero IDs against Phase 1 roster
 */
export function auditRosterAgainstPhase1(heroIds: string[]): RosterAuditBreakdown {
  const matchedHeroes: string[] = [];
  const unknownHeroes: string[] = [];
  const duplicateHeroes: string[] = [];
  const seen = new Set<string>();

  for (const rawId of heroIds) {
    const id = (rawId || '').trim().toLowerCase();
    if (!id) continue;

    if (seen.has(id)) {
      if (!duplicateHeroes.includes(id)) duplicateHeroes.push(id);
    } else {
      seen.add(id);
    }

    if (VERIFIED_ROSTER_IDS.has(id)) {
      if (!matchedHeroes.includes(id)) matchedHeroes.push(id);
    } else {
      if (!unknownHeroes.includes(id)) unknownHeroes.push(id);
    }
  }

  const missingHeroes = ALL_MLBB_HEROES.map((h) => h.id).filter((id) => !seen.has(id));

  return {
    matchedHeroes,
    unknownHeroes,
    missingHeroes,
    duplicateHeroes,
  };
}

/**
 * Verifies if a detected patch string is aligned with the active patch configuration
 */
export function auditPatchFidelity(patch: string | null | undefined): {
  status: 'MATCHES_ACTIVE' | 'OUTDATED_PATCH' | 'UNKNOWN';
  patchDetected: string | null;
  activePatch: string;
} {
  const active = ACTIVE_PATCH_CONFIG.activePatch;
  if (!patch) {
    return { status: 'UNKNOWN', patchDetected: null, activePatch: active };
  }
  const clean = patch.trim();
  if (clean === active || clean.includes(active)) {
    return { status: 'MATCHES_ACTIVE', patchDetected: clean, activePatch: active };
  }
  return { status: 'OUTDATED_PATCH', patchDetected: clean, activePatch: active };
}

/**
 * Live Source Verifier
 * Audits real connectivity, schema compliance, patch alignment, and roster fidelity.
 */
export async function verifySource(
  adapter: MetaDataSource,
  options: {
    timeoutMs?: number;
    allowNetwork?: boolean;
    suppliedPayload?: any;
  } = {}
): Promise<SourceVerificationResult> {
  const startTime = new Date().toISOString();
  const errors: string[] = [];
  const timeoutMs = options.timeoutMs ?? 3500;
  const allowNetwork = options.allowNetwork ?? true;

  const result: SourceVerificationResult = {
    source: adapter.name,
    sourceId: adapter.id,
    category: adapter.category,
    status: 'UNAVAILABLE',
    reachable: false,
    httpStatus: null,
    fetchedAt: startTime,
    responseFormat: 'unknown',
    recordsReceived: 0,
    validRecords: 0,
    invalidRecords: 0,
    duplicateRecords: 0,
    patchDetected: null,
    patchStatus: 'UNKNOWN',
    heroesDetected: [],
    sourceUrl: adapter.sourceUrl,
    errors,
    rosterAudit: {
      matchedHeroes: [],
      unknownHeroes: [],
      missingHeroes: [],
      duplicateHeroes: [],
    },
    isDemoData: false,
  };

  // Special classification: Manual / External (e.g. Liquipedia Cloudflare protection)
  if (adapter.status === 'MANUAL_EXTERNAL' || adapter.id.includes('liquipedia')) {
    result.status = 'MANUAL_EXTERNAL';
    result.responseFormat = 'MANUAL_ARCHIVE';
    errors.push(
      'Source is designated MANUAL_EXTERNAL: Automated bot requests are restricted by Cloudflare/anti-scraping policies. Requires verified manual dump.'
    );

    // If adapter has a manual archive in memory, audit it
    const anyAdapter = adapter as any;
    if (typeof anyAdapter.fetchProMatches === 'function') {
      try {
        const fetchRes = await anyAdapter.fetchProMatches();
        if (fetchRes.data && fetchRes.data.length > 0) {
          result.recordsReceived = fetchRes.data.length;
          result.reachable = true;
          result.validRecords = fetchRes.data.length;
          const detected = fetchRes.data.map((r: any) => r.heroId);
          result.heroesDetected = detected;
          result.rosterAudit = auditRosterAgainstPhase1(detected);
        }
      } catch (err: any) {
        errors.push(`Manual archive read error: ${err.message}`);
      }
    }
    return result;
  }

  // 1. Attempt Network Reachability Verification
  let rawPayload = options.suppliedPayload;
  if (!rawPayload && allowNetwork && adapter.sourceUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(adapter.sourceUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'MLBB-Meta-Verifier/1.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      result.httpStatus = response.status;
      result.reachable = response.ok;

      if (!response.ok) {
        errors.push(`HTTP ${response.status} ${response.statusText} from ${adapter.sourceUrl}`);
        result.status = 'UNAVAILABLE';
        return result;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        result.responseFormat = 'JSON';
        rawPayload = await response.json();
      } else {
        result.responseFormat = 'NON_JSON_TEXT';
        errors.push(`Unexpected response content-type: ${contentType}. Expected JSON.`);
        result.status = 'INVALID';
        return result;
      }
    } catch (netErr: any) {
      errors.push(`Network connection failed: ${netErr.name === 'AbortError' ? 'Connection timed out' : netErr.message}`);
      result.reachable = false;
      result.status = 'UNAVAILABLE';
      return result;
    }
  }

  // If no payload is obtained from network and no manual payload provided
  if (!rawPayload) {
    errors.push(`No data available from ${adapter.sourceUrl}. Source is offline or unreachable.`);
    result.status = 'UNAVAILABLE';
    return result;
  }

  // 2. Audit Payload Structure & Content
  return auditPayloadData(rawPayload, adapter, result);
}

/**
 * Detailed schema, statistic, patch, and roster audit on raw payload
 */
export function auditPayloadData(
  payload: any,
  adapter: MetaDataSource,
  baseResult: SourceVerificationResult
): SourceVerificationResult {
  const result = { ...baseResult };
  const errors = result.errors;

  if (!payload) {
    errors.push('Payload is empty or undefined.');
    result.status = 'INVALID';
    return result;
  }

  // DEMO DATA DETECTION: Check if data is tagged with DEMO_ONLY
  if (
    payload?._sourceTag === 'DEMO_ONLY' ||
    (Array.isArray(payload) && payload.some((item: any) => item?._sourceTag === 'DEMO_ONLY'))
  ) {
    result.isDemoData = true;
    errors.push('CRITICAL: DEMO_ONLY data detected in source payload! Fixture data must NOT be treated as production data.');
    result.status = 'INVALID';
    return result;
  }

  const records = Array.isArray(payload) ? payload : [payload];
  result.recordsReceived = records.length;

  if (records.length === 0) {
    errors.push('Source returned an empty dataset (0 records).');
    result.status = 'INVALID';
    return result;
  }

  const heroesDetected: string[] = [];
  const detectedPatches = new Set<string>();
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;
  const seenHeroPatchKey = new Set<string>();

  for (let i = 0; i < records.length; i++) {
    const item = records[i];
    if (!item) {
      invalidCount++;
      continue;
    }
    let isItemValid = true;
    const itemErrors: string[] = [];

    if (adapter.category === 'RANKED') {
      const heroId = (item.hero_key || item.heroId || '').toString().toLowerCase();
      const patch = (item.patch_ver || item.patch || '').toString();

      if (!heroId) {
        itemErrors.push(`Record #${i}: Missing hero ID`);
        isItemValid = false;
      } else {
        heroesDetected.push(heroId);
      }

      if (patch) detectedPatches.add(patch);

      // Check duplicates
      const uniqueKey = `${heroId}_${patch}_${item.tier_bracket || item.rankScope || ''}`;
      if (seenHeroPatchKey.has(uniqueKey)) {
        duplicateCount++;
        itemErrors.push(`Record #${i}: Duplicate record for ${uniqueKey}`);
        isItemValid = false;
      } else {
        seenHeroPatchKey.add(uniqueKey);
      }

      // Check negative stats
      const picks = Number(item.picks_total ?? item.picks);
      const bans = Number(item.bans_total ?? item.bans);
      const wins = Number(item.wins_total ?? item.wins);
      const losses = Number(item.losses_total ?? item.losses);
      const sampleGames = Number(item.sample_games ?? item.matches);

      if (picks < 0 || bans < 0 || wins < 0 || losses < 0 || sampleGames < 0) {
        itemErrors.push(`Record #${i} (${heroId}): Negative statistics detected`);
        isItemValid = false;
      }

      // Check winrate consistency if available
      if (picks > 0 && wins >= 0 && losses >= 0) {
        if (wins + losses !== picks && wins + losses !== sampleGames) {
          itemErrors.push(`Record #${i} (${heroId}): Wins (${wins}) + Losses (${losses}) !== Matches/Picks (${picks})`);
          isItemValid = false;
        }
      }
    } else if (adapter.category === 'PRO') {
      const league = item.league || item.tournament;
      const region = item.geo_region || item.region;
      const patch = item.game_patch || item.patch;

      if (!league || !region) {
        itemErrors.push(`Record #${i}: Pro record missing league or region`);
        isItemValid = false;
      }

      if (patch) detectedPatches.add(patch);

      // Extract picks and bans
      const bans = item.bans_first_pick || item.bans || [];
      const picks = item.picks_first_pick || item.picks || [];

      for (const b of bans) {
        const id = (typeof b === 'string' ? b : b?.hero_id || b?.heroId || '').toLowerCase();
        if (id) heroesDetected.push(id);
      }
      for (const p of picks) {
        const id = (typeof p === 'string' ? p : p?.hero_id || p?.heroId || '').toLowerCase();
        if (id) heroesDetected.push(id);
      }
    } else if (adapter.category === 'PATCH') {
      const patchVer = item.patch_id || item.version || item.patch_name;
      if (patchVer) detectedPatches.add(patchVer);

      const adjustments = item.hero_adjustments || item.changes || [];
      for (const adj of adjustments) {
        const hId = (adj.hero_id || adj.heroId || '').toLowerCase();
        if (hId) heroesDetected.push(hId);
      }
    }

    if (isItemValid) {
      validCount++;
    } else {
      invalidCount++;
      errors.push(...itemErrors);
    }
  }

  result.validRecords = validCount;
  result.invalidRecords = invalidCount;
  result.duplicateRecords = duplicateCount;
  result.heroesDetected = Array.from(new Set(heroesDetected));

  // Patch Audit
  const patches = Array.from(detectedPatches);
  result.patchDetected = patches.join(', ') || null;
  if (!result.patchDetected) {
    result.patchStatus = 'UNKNOWN';
    errors.push('No patch information detected in response.');
  } else if (patches.some((p) => p.includes(ACTIVE_PATCH_CONFIG.activePatch))) {
    result.patchStatus = 'MATCH';
  } else {
    result.patchStatus = 'PATCH_MISMATCH';
    errors.push(
      `PATCH_MISMATCH: Source detected patch (${result.patchDetected}) does not match Active Patch (${ACTIVE_PATCH_CONFIG.activePatch})`
    );
  }

  // Roster Audit
  result.rosterAudit = auditRosterAgainstPhase1(result.heroesDetected);
  if (result.rosterAudit.unknownHeroes.length > 0) {
    errors.push(
      `Unknown heroes detected not in Phase 1 roster: ${result.rosterAudit.unknownHeroes.join(', ')}`
    );
  }

  // Final status computation
  if (validCount > 0 && invalidCount === 0 && result.patchStatus !== 'PATCH_MISMATCH') {
    result.status = 'VERIFIED';
  } else if (validCount > 0 && (invalidCount > 0 || result.patchStatus === 'PATCH_MISMATCH')) {
    result.status = 'PARTIAL';
  } else {
    result.status = 'INVALID';
  }

  return result;
}
