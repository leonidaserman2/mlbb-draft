import { ImportMetadata, ImportResult, RawRankedImportItem, RawProImportItem } from './importTypes';
import { importRankedJson, importProJson, ImportOptions } from './jsonImporter';
import { NormalizedMetaRecord, NormalizedProRecord } from '../normalized/types';

/**
 * Robust CSV parser that handles quoted cells containing commas, line endings, and trimmed spaces.
 */
export function parseCsvRows(csvText: string): Record<string, string>[] {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('#'));
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const headerKey = headers[j];
      if (headerKey) {
        row[headerKey] = values[j] !== undefined ? values[j].trim() : '';
      }
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Splits a single CSV row respecting double quotes
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Imports Ranked data from CSV content
 */
export function importRankedCsv(
  csvContent: string,
  metadata: Partial<ImportMetadata> = {},
  options?: ImportOptions
): ImportResult<NormalizedMetaRecord> {
  const parsedRows = parseCsvRows(csvContent);

  // Map CSV string values to RawRankedImportItem objects
  const rawItems: RawRankedImportItem[] = parsedRows.map((row) => {
    return {
      heroId: row.heroId || row.hero_key || row.hero,
      patch: row.patch || row.patch_ver,
      rankScope: row.rankScope || row.tier_bracket || row.rank,
      region: row.region || row.server_region,
      periodStart: row.periodStart || row.date_start,
      periodEnd: row.periodEnd || row.date_end,
      matches: row.matches ? Number(row.matches) : (row.sample_games ? Number(row.sample_games) : undefined),
      picks: row.picks ? Number(row.picks) : (row.picks_total ? Number(row.picks_total) : undefined),
      bans: row.bans ? Number(row.bans) : (row.bans_total ? Number(row.bans_total) : undefined),
      wins: row.wins ? Number(row.wins) : (row.wins_total ? Number(row.wins_total) : undefined),
      losses: row.losses ? Number(row.losses) : (row.losses_total ? Number(row.losses_total) : undefined),
      pickRate: row.pickRate ? Number(row.pickRate) : undefined,
      banRate: row.banRate ? Number(row.banRate) : undefined,
      winRate: row.winRate ? Number(row.winRate) : undefined,
      presenceRate: row.presenceRate ? Number(row.presenceRate) : undefined,
      source: row.source || metadata.source,
      sourceUrl: row.sourceUrl || metadata.sourceUrl,
      isDemo: row.isDemo === 'true' || metadata.isDemo === true,
    };
  });

  return importRankedJson(rawItems, { ...metadata, dataType: 'RANKED' }, options);
}

/**
 * Imports Pro data from CSV content
 */
export function importProCsv(
  csvContent: string,
  metadata: Partial<ImportMetadata> = {},
  options?: ImportOptions
): ImportResult<NormalizedProRecord> {
  const parsedRows = parseCsvRows(csvContent);

  const rawItems: RawProImportItem[] = parsedRows.map((row) => {
    const rawSide = (row.side || row.map_side || '').trim().toUpperCase();
    const side = rawSide === 'RED' ? 'RED' : (rawSide === 'BLUE' ? 'BLUE' : undefined);

    const picked = row.picked !== undefined ? row.picked === 'true' || row.picked === '1' : undefined;
    const banned = row.banned !== undefined ? row.banned === 'true' || row.banned === '1' : undefined;
    const win = row.win !== undefined ? row.win === 'true' || row.win === '1' : (row.outcome === 'WIN');

    return {
      heroId: row.heroId || row.hero_key || row.hero,
      patch: row.patch || row.game_patch,
      tournament: row.tournament || row.league,
      season: row.season,
      region: row.region || row.geo_region,
      team: row.team || row.squad,
      role: row.role || row.lane_role,
      side,
      picked: picked ?? true,
      banned: banned ?? false,
      win,
      matchId: row.matchId || row.match_ref,
      matchDate: row.matchDate || row.game_date,
      source: row.source || metadata.source,
      sourceUrl: row.sourceUrl || metadata.sourceUrl,
      isDemo: row.isDemo === 'true' || metadata.isDemo === true,
    };
  });

  return importProJson(rawItems, { ...metadata, dataType: 'PRO' }, options);
}
