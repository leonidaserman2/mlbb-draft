import {
  HeroMetaMetrics,
  MetricFilterOptions,
  MetricSampleStatus,
  MetricDataQuality,
  MetricRankScope,
  MetricSourceCategory,
} from './types';
import { METRIC_THRESHOLDS } from './thresholds';
import { calculateMetricTrend } from './trend';
import { normalizeMetricRankScope, categorizeSource } from './filters';
import { NormalizedMetaRecord, NormalizedProRecord } from '../normalized/types';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';

/**
 * Validates and safely converts any input value to a non-negative finite integer
 */
export function safeNumber(val: any, fallback: number = 0): number {
  if (val === null || val === undefined) return fallback;
  const n = Number(val);
  if (isNaN(n) || !isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

/**
 * Validates and safely converts any rate value to a finite float (or null if invalid)
 */
export function safeRate(val: any): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (isNaN(n) || !isFinite(n) || n < 0) return null;
  return Number(n.toFixed(2));
}

/**
 * Calculate Data Quality for Ranked or Pro record collections
 */
export function evaluateDataQuality(
  records: Array<{ collectedAt?: string; isDemo?: boolean; [key: string]: any }>,
  totalMatches: number,
  mode: 'RANKED' | 'PRO',
  referenceDate: string = '2026-09-20'
): MetricDataQuality {
  const thresholds = mode === 'PRO' ? METRIC_THRESHOLDS.pro : METRIC_THRESHOLDS.ranked;
  const isDemo = records.some((r) => Boolean((r as any).isDemo || (r as any).source?.toLowerCase().includes('demo')));

  // Calculate age
  const refTime = new Date(referenceDate).getTime();
  let maxAgeDays = 0;
  for (const r of records) {
    if (r.collectedAt) {
      const collTime = new Date(r.collectedAt).getTime();
      if (!isNaN(collTime) && collTime <= refTime) {
        const age = Math.floor((refTime - collTime) / (1000 * 60 * 60 * 24));
        if (age > maxAgeDays) maxAgeDays = age;
      }
    }
  }

  const isStale = maxAgeDays > thresholds.staleAgeDays;

  // Completeness score: check presence of matches, wins, losses, collectedAt
  let completeness = 100;
  if (records.length === 0) {
    completeness = 0;
  } else {
    let completeCount = 0;
    for (const r of records) {
      if (r.matches !== undefined && r.wins !== undefined && r.collectedAt) {
        completeCount++;
      }
    }
    completeness = Math.round((completeCount / records.length) * 100);
  }

  // Sample status
  let status: MetricSampleStatus = 'INSUFFICIENT';
  if (isDemo) {
    status = 'DEMO_ONLY';
  } else if (totalMatches >= thresholds.sufficientSampleMatches) {
    status = 'SUFFICIENT';
  } else if (totalMatches >= thresholds.lowSampleMatches) {
    status = 'LOW_SAMPLE';
  } else {
    status = 'INSUFFICIENT';
  }

  return {
    status,
    sampleSize: totalMatches,
    dataAgeDays: maxAgeDays,
    completeness,
    isStale,
    isDemo,
  };
}

/**
 * Core Calculator for Ranked Records
 * Performs weighted aggregation strictly based on matches, wins, losses, picks, and bans.
 * Returns HeroMetaMetrics.
 */
export function calculateRankedMetrics(
  heroId: string,
  records: NormalizedMetaRecord[],
  filters: MetricFilterOptions,
  comparisonRecords?: NormalizedMetaRecord[]
): HeroMetaMetrics {
  const targetPatch = filters.patch || ACTIVE_PATCH_CONFIG.activePatch;
  const rankScope: MetricRankScope = normalizeMetricRankScope(filters.rankScope as string);
  const region = filters.region || 'GLOBAL';
  const period = filters.period || 'CURRENT_PATCH';
  const firstSource = records.find((r) => r && typeof r.source === 'string')?.source;
  const source = filters.source || firstSource || 'RANKED';
  const sourceCategory: MetricSourceCategory = filters.sourceCategory || categorizeSource(source);
  const refDate = filters.referenceDate || '2026-09-20';

  // Deduplicate identical records by ID if present
  const uniqueMap = new Map<string, NormalizedMetaRecord>();
  for (const r of records) {
    if (r && r.id) {
      uniqueMap.set(r.id, r);
    }
  }
  const cleanRecords = Array.from(uniqueMap.values());

  // Weighted Accumulators
  let totalMatches = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalPicks = 0;
  let totalBans = 0;
  let weightedPickRateSum = 0;
  let weightedBanRateSum = 0;
  let latestCollectedAt = refDate;
  let hasValidData = false;

  for (const r of cleanRecords) {
    // Skip invalid / corrupt records
    if (!r || typeof r !== 'object') continue;

    const m = safeNumber(r.matches);
    const w = safeNumber(r.wins);
    const l = safeNumber(r.losses);
    const p = safeNumber(r.picks, m);
    const b = safeNumber(r.bans, 0);

    totalMatches += m;
    totalWins += w;
    totalLosses += l;
    totalPicks += p;
    totalBans += b;

    if (m > 0) {
      hasValidData = true;
      const pr = safeRate(r.pickRate);
      const br = safeRate(r.banRate);
      if (pr !== null) weightedPickRateSum += pr * m;
      if (br !== null) weightedBanRateSum += br * m;
    }

    if (r.collectedAt && r.collectedAt > latestCollectedAt) {
      latestCollectedAt = r.collectedAt;
    }
  }

  // 1. Win Rate (wins / matches * 100)
  // If matches === 0, MUST return null (never NaN or Infinity)
  const winRate: number | null = totalMatches > 0
    ? Number(((totalWins / totalMatches) * 100).toFixed(2))
    : null;

  // 2. Pick Rate
  const pickRate: number | null = totalMatches > 0 && hasValidData
    ? Number((weightedPickRateSum / totalMatches).toFixed(2))
    : null;

  // 3. Ban Rate
  const banRate: number | null = totalMatches > 0 && hasValidData
    ? Number((weightedBanRateSum / totalMatches).toFixed(2))
    : null;

  // 4. Presence Rate (consistent from pick + ban)
  const presenceRate: number | null = (pickRate !== null && banRate !== null)
    ? Number((pickRate + banRate).toFixed(2))
    : null;

  // 5. Data Quality & Sample Evaluation
  const dataQuality = evaluateDataQuality(cleanRecords, totalMatches, 'RANKED', refDate);

  // 6. Trend Calculation (if comparison records provided)
  let trend = calculateMetricTrend(
    {
      matches: totalMatches,
      winRate,
      pickRate,
      banRate,
      periodName: String(period),
    },
    null,
    'RANKED'
  );

  if (comparisonRecords && comparisonRecords.length > 0) {
    let compMatches = 0;
    let compWins = 0;
    let compWeightedPick = 0;
    let compWeightedBan = 0;

    for (const cr of comparisonRecords) {
      const cm = safeNumber(cr.matches);
      compMatches += cm;
      compWins += safeNumber(cr.wins);
      const cpr = safeRate(cr.pickRate);
      const cbr = safeRate(cr.banRate);
      if (cpr !== null && cm > 0) compWeightedPick += cpr * cm;
      if (cbr !== null && cm > 0) compWeightedBan += cbr * cm;
    }

    const compWinRate = compMatches > 0 ? Number(((compWins / compMatches) * 100).toFixed(2)) : null;
    const compPickRate = compMatches > 0 ? Number((compWeightedPick / compMatches).toFixed(2)) : null;
    const compBanRate = compMatches > 0 ? Number((compWeightedBan / compMatches).toFixed(2)) : null;

    trend = calculateMetricTrend(
      {
        matches: totalMatches,
        winRate,
        pickRate,
        banRate,
        periodName: String(period),
      },
      {
        matches: compMatches,
        winRate: compWinRate,
        pickRate: compPickRate,
        banRate: compBanRate,
        periodName: 'PREVIOUS',
      },
      'RANKED'
    );
  }

  const isHistorical = targetPatch !== ACTIVE_PATCH_CONFIG.activePatch || period === 'HISTORICAL';

  return {
    heroId,
    patch: targetPatch,
    rankScope,
    region,
    period,
    source,
    sourceCategory,

    matches: totalMatches,
    wins: totalWins,
    losses: totalLosses,
    picks: totalPicks,
    bans: totalBans,

    winRate,
    pickRate,
    banRate,
    presenceRate,

    sampleSize: totalMatches,
    sampleStatus: dataQuality.status,
    trend,
    dataQuality,

    collectedAt: latestCollectedAt,
    isHistorical,
  };
}

/**
 * Core Calculator for Pro Tournament Records
 * In Pro tournaments, matches represent games where hero was picked.
 * Denominator for pick/ban rates is total tournament matches sampled.
 */
export function calculateProMetrics(
  heroId: string,
  heroRecords: NormalizedProRecord[],
  totalTournamentGames: number,
  filters: MetricFilterOptions,
  comparisonRecords?: NormalizedProRecord[],
  comparisonTotalTournamentGames?: number
): HeroMetaMetrics {
  const targetPatch = filters.patch || ACTIVE_PATCH_CONFIG.activePatch;
  const region = filters.region || 'GLOBAL';
  const period = filters.period || 'CURRENT_PATCH';
  const firstSource = heroRecords.find((r) => r && (typeof r.tournament === 'string' || typeof r.source === 'string'));
  const source = filters.source || firstSource?.tournament || firstSource?.source || 'PRO_TOURNAMENT';
  const sourceCategory: MetricSourceCategory = filters.sourceCategory || categorizeSource(source);
  const refDate = filters.referenceDate || '2026-09-20';

  // Deduplicate records by ID
  const uniqueMap = new Map<string, NormalizedProRecord>();
  for (const r of heroRecords) {
    if (r && r.id) {
      uniqueMap.set(r.id, r);
    }
  }
  const cleanRecords = Array.from(uniqueMap.values());

  let totalPicks = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalBans = 0;
  let latestCollectedAt = refDate;

  for (const r of cleanRecords) {
    if (!r || typeof r !== 'object') continue;

    if (r.picked) {
      totalPicks++;
      if (r.win === true) {
        totalWins++;
      } else {
        totalLosses++;
      }
    }
    if (r.banned) {
      totalBans++;
    }

    if (r.collectedAt && r.collectedAt > latestCollectedAt) {
      latestCollectedAt = r.collectedAt;
    }
  }

  const totalHeroMatches = totalPicks;

  // 1. Win rate (wins / matches * 100)
  const winRate: number | null = totalHeroMatches > 0
    ? Number(((totalWins / totalHeroMatches) * 100).toFixed(2))
    : null;

  // 2. Pick rate: picks / totalTournamentGames * 100
  // If denominator is 0 or unavailable, return null (never invent numbers)
  const pickRate: number | null = totalTournamentGames > 0
    ? Number(((totalPicks / totalTournamentGames) * 100).toFixed(2))
    : null;

  // 3. Ban rate: bans / totalTournamentGames * 100
  const banRate: number | null = totalTournamentGames > 0
    ? Number(((totalBans / totalTournamentGames) * 100).toFixed(2))
    : null;

  // 4. Presence rate: (picks + bans) / totalTournamentGames * 100
  const presenceRate: number | null = totalTournamentGames > 0
    ? Number((((totalPicks + totalBans) / totalTournamentGames) * 100).toFixed(2))
    : null;

  // 5. Data Quality & Sample Evaluation
  const dataQuality = evaluateDataQuality(cleanRecords, totalHeroMatches, 'PRO', refDate);

  // 6. Trend
  let trend = calculateMetricTrend(
    {
      matches: totalHeroMatches,
      winRate,
      pickRate,
      banRate,
      periodName: String(period),
    },
    null,
    'PRO'
  );

  if (comparisonRecords && comparisonRecords.length > 0 && comparisonTotalTournamentGames && comparisonTotalTournamentGames > 0) {
    let compPicks = 0;
    let compWins = 0;
    let compBans = 0;

    for (const cr of comparisonRecords) {
      if (cr.picked) {
        compPicks++;
        if (cr.win) compWins++;
      }
      if (cr.banned) compBans++;
    }

    const compWinRate = compPicks > 0 ? Number(((compWins / compPicks) * 100).toFixed(2)) : null;
    const compPickRate = Number(((compPicks / comparisonTotalTournamentGames) * 100).toFixed(2));
    const compBanRate = Number(((compBans / comparisonTotalTournamentGames) * 100).toFixed(2));

    trend = calculateMetricTrend(
      {
        matches: totalHeroMatches,
        winRate,
        pickRate,
        banRate,
        periodName: String(period),
      },
      {
        matches: compPicks,
        winRate: compWinRate,
        pickRate: compPickRate,
        banRate: compBanRate,
        periodName: 'PREVIOUS',
      },
      'PRO'
    );
  }

  const isHistorical = targetPatch !== ACTIVE_PATCH_CONFIG.activePatch || period === 'HISTORICAL';

  return {
    heroId,
    patch: targetPatch,
    rankScope: 'GLOBAL',
    region,
    period,
    source,
    sourceCategory,

    matches: totalHeroMatches,
    wins: totalWins,
    losses: totalLosses,
    picks: totalPicks,
    bans: totalBans,

    winRate,
    pickRate,
    banRate,
    presenceRate,

    sampleSize: totalHeroMatches,
    sampleStatus: dataQuality.status,
    trend,
    dataQuality,

    collectedAt: latestCollectedAt,
    isHistorical,
  };
}
