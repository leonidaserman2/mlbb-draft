import { ImportMetadata, ImportResult, RawRankedImportItem, RawProImportItem } from './importTypes';
import { validateImportMetadata, validateAndMapRawRanked, validateAndMapRawPro } from './importValidator';
import { normalizeRankedPayload, normalizeProMatchPayload } from '../normalized/normalizer';
import { NormalizedMetaRecord, NormalizedProRecord } from '../normalized/types';
import { rankedRepository } from '../repository/rankedRepository';
import { proRepository } from '../repository/proRepository';

export interface ImportOptions {
  saveToRepository?: boolean;
  allowHistorical?: boolean;
}

/**
 * Imports Ranked data from JSON string or parsed object
 */
export function importRankedJson(
  input: string | any,
  metaInput: Partial<ImportMetadata> = {},
  options: ImportOptions = { saveToRepository: true, allowHistorical: true }
): ImportResult<NormalizedMetaRecord> {
  const importedAt = metaInput.importedAt || new Date().toISOString();
  const metaValidation = validateImportMetadata({
    ...metaInput,
    importedAt,
    dataType: 'RANKED',
  });

  const unknownHeroes: string[] = [];
  const validationErrors: string[] = [...metaValidation.errors];
  const acceptedRecords: NormalizedMetaRecord[] = [];
  let duplicates = 0;
  let rejected = 0;

  // If marked DEMO_ONLY, reject from production repository
  if (metaValidation.isDemoBlocked) {
    return {
      source: metaValidation.resolvedMeta.source,
      status: 'FAILED',
      recordsReceived: 0,
      recordsAccepted: 0,
      recordsRejected: 0,
      duplicates: 0,
      patchMismatch: metaValidation.isPatchMismatch,
      unknownHeroes: [],
      validationErrors: ['DEMO_ONLY data rejected: Forbidden from entering production repository.'],
      importedAt,
      importedRecords: [],
    };
  }

  // Parse raw JSON
  let rawItems: any[] = [];
  try {
    const parsed = typeof input === 'string' ? JSON.parse(input) : input;
    if (Array.isArray(parsed)) {
      rawItems = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.data)) rawItems = parsed.data;
      else if (Array.isArray(parsed.heroes)) rawItems = parsed.heroes;
      else if (Array.isArray(parsed.records)) rawItems = parsed.records;
      else rawItems = [parsed];
    } else {
      throw new Error('Expected JSON array or object with data array.');
    }
  } catch (err: any) {
    return {
      source: metaValidation.resolvedMeta.source,
      status: 'FAILED',
      recordsReceived: 0,
      recordsAccepted: 0,
      recordsRejected: 0,
      duplicates: 0,
      patchMismatch: metaValidation.isPatchMismatch,
      unknownHeroes: [],
      validationErrors: [`JSON parse error: ${err.message}`],
      importedAt,
      importedRecords: [],
    };
  }

  const recordsReceived = rawItems.length;

  for (const rawItem of rawItems) {
    // Demo item check
    if (rawItem.isDemo === true || rawItem._sourceTag === 'DEMO_ONLY') {
      validationErrors.push('Demo item detected and blocked from production repository.');
      rejected++;
      continue;
    }

    const validated = validateAndMapRawRanked(rawItem as RawRankedImportItem, metaValidation.resolvedMeta);

    if (!validated.isValid) {
      rejected++;
      for (const err of validated.errors) {
        if (err.includes('Unknown hero')) {
          if (!unknownHeroes.includes(validated.heroId)) {
            unknownHeroes.push(validated.heroId);
          }
        } else {
          validationErrors.push(err);
        }
      }
      continue;
    }

    // Normalization with full provenance preservation
    const normResult = normalizeRankedPayload(validated.raw, 'secondary');
    if (!normResult.record) {
      rejected++;
      for (const err of normResult.errors) {
        validationErrors.push(`${err.field}: ${err.message}`);
      }
      continue;
    }

    const finalRecord: NormalizedMetaRecord = {
      ...normResult.record,
      source: metaValidation.resolvedMeta.source,
      sourceUrl: metaValidation.resolvedMeta.sourceUrl || normResult.record.sourceUrl,
      importedAt,
      originalRecordId: validated.raw.hero_key,
      patch: validated.raw.patch_ver,
      periodStart: validated.raw.date_start,
      periodEnd: validated.raw.date_end,
      isHistorical: validated.isPatchMismatch,
    };

    // Save to repository if enabled
    if (options.saveToRepository !== false) {
      const insertRes = rankedRepository.insert(finalRecord, {
        allowHistorical: options.allowHistorical !== false,
      });

      if (insertRes.isDuplicate) {
        duplicates++;
      } else if (insertRes.success) {
        acceptedRecords.push(finalRecord);
      } else {
        rejected++;
      }
    } else {
      acceptedRecords.push(finalRecord);
    }
  }

  let status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'PATCH_MISMATCH' = 'SUCCESS';
  if (metaValidation.isPatchMismatch) {
    status = 'PATCH_MISMATCH';
  } else if (acceptedRecords.length === 0 && recordsReceived > 0) {
    status = 'FAILED';
  } else if (rejected > 0 || duplicates > 0) {
    status = 'PARTIAL';
  }

  return {
    source: metaValidation.resolvedMeta.source,
    status,
    recordsReceived,
    recordsAccepted: acceptedRecords.length,
    recordsRejected: rejected,
    duplicates,
    patchMismatch: metaValidation.isPatchMismatch,
    unknownHeroes,
    validationErrors,
    importedAt,
    importedRecords: acceptedRecords,
  };
}

/**
 * Imports Pro competitive match data from JSON string or parsed object
 */
export function importProJson(
  input: string | any,
  metaInput: Partial<ImportMetadata> = {},
  options: ImportOptions = { saveToRepository: true, allowHistorical: true }
): ImportResult<NormalizedProRecord> {
  const importedAt = metaInput.importedAt || new Date().toISOString();
  const metaValidation = validateImportMetadata({
    ...metaInput,
    importedAt,
    dataType: 'PRO',
  });

  const unknownHeroes: string[] = [];
  const validationErrors: string[] = [...metaValidation.errors];
  const acceptedRecords: NormalizedProRecord[] = [];
  let duplicates = 0;
  let rejected = 0;

  if (metaValidation.isDemoBlocked) {
    return {
      source: metaValidation.resolvedMeta.source,
      status: 'FAILED',
      recordsReceived: 0,
      recordsAccepted: 0,
      recordsRejected: 0,
      duplicates: 0,
      patchMismatch: metaValidation.isPatchMismatch,
      unknownHeroes: [],
      validationErrors: ['DEMO_ONLY data rejected: Forbidden from entering production repository.'],
      importedAt,
      importedRecords: [],
    };
  }

  let rawItems: any[] = [];
  try {
    const parsed = typeof input === 'string' ? JSON.parse(input) : input;
    if (Array.isArray(parsed)) {
      rawItems = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.matches)) rawItems = parsed.matches;
      else if (Array.isArray(parsed.data)) rawItems = parsed.data;
      else if (Array.isArray(parsed.records)) rawItems = parsed.records;
      else rawItems = [parsed];
    } else {
      throw new Error('Expected JSON array or object with matches array.');
    }
  } catch (err: any) {
    return {
      source: metaValidation.resolvedMeta.source,
      status: 'FAILED',
      recordsReceived: 0,
      recordsAccepted: 0,
      recordsRejected: 0,
      duplicates: 0,
      patchMismatch: metaValidation.isPatchMismatch,
      unknownHeroes: [],
      validationErrors: [`JSON parse error: ${err.message}`],
      importedAt,
      importedRecords: [],
    };
  }

  const recordsReceived = rawItems.length;

  for (const rawItem of rawItems) {
    if (rawItem.isDemo === true || rawItem._sourceTag === 'DEMO_ONLY') {
      validationErrors.push('Demo item detected and blocked from production repository.');
      rejected++;
      continue;
    }

    const validated = validateAndMapRawPro(rawItem as RawProImportItem, metaValidation.resolvedMeta);

    if (!validated.isValid) {
      rejected++;
      for (const err of validated.errors) {
        if (err.includes('Unknown hero')) {
          if (!unknownHeroes.includes(validated.heroId)) {
            unknownHeroes.push(validated.heroId);
          }
        } else {
          validationErrors.push(err);
        }
      }
      continue;
    }

    const normResult = normalizeProMatchPayload(validated.raw, metaValidation.resolvedMeta.source);
    if (!normResult.record) {
      rejected++;
      for (const err of normResult.errors) {
        validationErrors.push(`${err.field}: ${err.message}`);
      }
      continue;
    }

    // Preserve Blue/Red side, team, role, matchId, matchDate, provenance
    const finalRecord: NormalizedProRecord = {
      ...normResult.record,
      source: metaValidation.resolvedMeta.source,
      sourceUrl: metaValidation.resolvedMeta.sourceUrl || normResult.record.sourceUrl,
      importedAt,
      originalRecordId: validated.raw.match_ref,
      matchId: validated.raw.match_ref,
      patch: validated.raw.game_patch,
      isHistorical: validated.isPatchMismatch,
      side: validated.raw.map_side,
      team: validated.raw.squad,
      role: validated.raw.lane_role,
      matchDate: validated.raw.game_date,
    };

    if (options.saveToRepository !== false) {
      const insertRes = proRepository.insert(finalRecord);
      if (insertRes.isDuplicate) {
        duplicates++;
      } else if (insertRes.success) {
        acceptedRecords.push(finalRecord);
      } else {
        rejected++;
      }
    } else {
      acceptedRecords.push(finalRecord);
    }
  }

  let status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'PATCH_MISMATCH' = 'SUCCESS';
  if (metaValidation.isPatchMismatch) {
    status = 'PATCH_MISMATCH';
  } else if (acceptedRecords.length === 0 && recordsReceived > 0) {
    status = 'FAILED';
  } else if (rejected > 0 || duplicates > 0) {
    status = 'PARTIAL';
  }

  return {
    source: metaValidation.resolvedMeta.source,
    status,
    recordsReceived,
    recordsAccepted: acceptedRecords.length,
    recordsRejected: rejected,
    duplicates,
    patchMismatch: metaValidation.isPatchMismatch,
    unknownHeroes,
    validationErrors,
    importedAt,
    importedRecords: acceptedRecords,
  };
}
