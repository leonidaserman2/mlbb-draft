import {
  calculateRankedMetrics,
  calculateProMetrics,
  safeNumber,
  safeRate,
} from './calculator';
import { calculateMetricTrend } from './trend';
import { filterRankedRecord, filterProRecord, normalizeMetricRankScope, categorizeSource } from './filters';
import { MetaMetricsService } from './metricsService';
import { NormalizedMetaRecord, NormalizedProRecord } from '../normalized/types';
import { MetaRepositoryCoordinator } from '../repository/metaRepository';
import { RankedRepository } from '../repository/rankedRepository';
import { ProRepository } from '../repository/proRepository';
import { PatchRepository } from '../repository/patchRepository';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';

export interface MetricTestResult {
  testId: number;
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

export interface MetricTestSuiteSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  allPassed: boolean;
  results: MetricTestResult[];
}

/**
 * Creates mock NormalizedMetaRecord for testing
 */
function createMockRankedRecord(overrides: Partial<NormalizedMetaRecord> = {}): NormalizedMetaRecord {
  return {
    id: `rec_${Math.random().toString(36).slice(2, 8)}`,
    heroId: 'fanny',
    patch: ACTIVE_PATCH_CONFIG.activePatch,
    mode: 'RANKED',
    rankScope: 'Mythical Glory',
    region: 'GLOBAL',
    periodStart: '2026-09-08',
    periodEnd: '2026-09-20',
    source: 'MLBBHub Ranked',
    matches: 1000,
    picks: 1000,
    bans: 500,
    wins: 550,
    losses: 450,
    pickRate: 10.0,
    banRate: 5.0,
    winRate: 55.0,
    presenceRate: 15.0,
    sourceUrl: 'https://test.mlbb.com',
    collectedAt: '2026-09-20T10:00:00Z',
    confidence: 'primary',
    normalizedAt: '2026-09-20T10:00:00Z',
    isValidated: true,
    importedAt: '2026-09-20T10:00:00Z',
    originalRecordId: 'orig_1',
    isHistorical: false,
    ...overrides,
  };
}

/**
 * Creates mock NormalizedProRecord for testing
 */
function createMockProRecord(overrides: Partial<NormalizedProRecord> = {}): NormalizedProRecord {
  return {
    id: `pro_${Math.random().toString(36).slice(2, 8)}`,
    heroId: 'fanny',
    patch: ACTIVE_PATCH_CONFIG.activePatch,
    tournament: 'MPL ID S14',
    matchId: 'match_101',
    matchDate: '2026-09-15',
    team: 'Fnatic ONIC',
    side: 'BLUE',
    role: 'Jungle',
    picked: true,
    banned: false,
    win: true,
    source: 'MPL ID Official',
    sourceUrl: 'https://mpl.id',
    collectedAt: '2026-09-20T10:00:00Z',
    region: 'ID',
    normalizedAt: '2026-09-20T10:00:00Z',
    isValidated: true,
    importedAt: '2026-09-20T10:00:00Z',
    originalRecordId: 'orig_pro_1',
    isHistorical: false,
    ...overrides,
  };
}

/**
 * Runs 20 unit tests covering the entire Meta Metrics Engine (Phase 2C-1)
 */
export async function runMetricsTestSuite(): Promise<MetricTestSuiteSummary> {
  const results: MetricTestResult[] = [];

  function record(testId: number, name: string, condition: boolean, message: string, details?: any) {
    results.push({
      testId,
      name,
      passed: condition,
      message: condition ? 'PASSED' : `FAILED: ${message}`,
      details,
    });
  }

  // 1. Win rate calculation
  try {
    const rec = createMockRankedRecord({ matches: 200, wins: 110, losses: 90 });
    const res = calculateRankedMetrics('fanny', [rec], {});
    const expected = 55.0;
    record(
      1,
      'Win Rate Calculation',
      res.winRate === expected && res.wins === 110 && res.matches === 200,
      `Expected ${expected}%, got ${res.winRate}%`,
      { winRate: res.winRate }
    );
  } catch (err: any) {
    record(1, 'Win Rate Calculation', false, err.message);
  }

  // 2. Zero matches (no NaN or Infinity)
  try {
    const rec = createMockRankedRecord({ matches: 0, wins: 0, losses: 0, picks: 0, bans: 0 });
    const res = calculateRankedMetrics('fanny', [rec], {});
    record(
      2,
      'Zero Matches Resilience',
      res.winRate === null && res.pickRate === null && !isNaN(res.matches),
      `Expected null winRate, got ${res.winRate}`,
      { res }
    );
  } catch (err: any) {
    record(2, 'Zero Matches Resilience', false, err.message);
  }

  // 3. Weighted aggregation
  try {
    // Record A: 100 matches, 60 wins (60%)
    // Record B: 1000 matches, 510 wins (51%)
    // Weighted expected: (60 + 510) / (100 + 1000) = 570 / 1100 = 51.82%
    const recA = createMockRankedRecord({ id: 'rec_A', matches: 100, wins: 60, losses: 40 });
    const recB = createMockRankedRecord({ id: 'rec_B', matches: 1000, wins: 510, losses: 490 });
    const res = calculateRankedMetrics('fanny', [recA, recB], {});
    const expected = 51.82;
    record(
      3,
      'Weighted Aggregation',
      res.winRate === expected,
      `Expected weighted ${expected}%, got ${res.winRate}%`,
      { calculated: res.winRate, expected }
    );
  } catch (err: any) {
    record(3, 'Weighted Aggregation', false, err.message);
  }

  // 4. Pick rate
  try {
    const recA = createMockRankedRecord({ id: 'rec_p1', matches: 1000, pickRate: 15.0 });
    const recB = createMockRankedRecord({ id: 'rec_p2', matches: 1000, pickRate: 25.0 });
    const res = calculateRankedMetrics('fanny', [recA, recB], {});
    // Equal weights -> (15 + 25) / 2 = 20.0%
    record(
      4,
      'Pick Rate Weighted Calculation',
      res.pickRate === 20.0,
      `Expected 20.0%, got ${res.pickRate}%`,
      { pickRate: res.pickRate }
    );
  } catch (err: any) {
    record(4, 'Pick Rate Weighted Calculation', false, err.message);
  }

  // 5. Ban rate
  try {
    const recA = createMockRankedRecord({ id: 'rec_b1', matches: 500, banRate: 10.0 });
    const recB = createMockRankedRecord({ id: 'rec_b2', matches: 500, banRate: 30.0 });
    const res = calculateRankedMetrics('fanny', [recA, recB], {});
    record(
      5,
      'Ban Rate Weighted Calculation',
      res.banRate === 20.0,
      `Expected 20.0%, got ${res.banRate}%`,
      { banRate: res.banRate }
    );
  } catch (err: any) {
    record(5, 'Ban Rate Weighted Calculation', false, err.message);
  }

  // 6. Presence rate
  try {
    const rec = createMockRankedRecord({ matches: 1000, pickRate: 12.5, banRate: 27.5 });
    const res = calculateRankedMetrics('fanny', [rec], {});
    const expected = 40.0;
    record(
      6,
      'Presence Rate Consistency',
      res.presenceRate === expected,
      `Expected ${expected}%, got ${res.presenceRate}%`,
      { presenceRate: res.presenceRate }
    );
  } catch (err: any) {
    record(6, 'Presence Rate Consistency', false, err.message);
  }

  // 7. Current patch filter
  try {
    const currentRec = createMockRankedRecord({ patch: ACTIVE_PATCH_CONFIG.activePatch });
    const oldRec = createMockRankedRecord({ patch: '2.1.80', isHistorical: true });
    const passCurrent = filterRankedRecord(currentRec, { patch: ACTIVE_PATCH_CONFIG.activePatch, period: 'CURRENT_PATCH' });
    const passOld = filterRankedRecord(oldRec, { patch: ACTIVE_PATCH_CONFIG.activePatch, period: 'CURRENT_PATCH' });
    record(
      7,
      'Current Patch Filter',
      passCurrent === true && passOld === false,
      `Old patch was not excluded or current was excluded`,
      { passCurrent, passOld }
    );
  } catch (err: any) {
    record(7, 'Current Patch Filter', false, err.message);
  }

  // 8. Rank filter
  try {
    const gloryRec = createMockRankedRecord({ rankScope: 'Mythical Glory' });
    const epicRec = createMockRankedRecord({ rankScope: 'Epic' });
    const passGlory = filterRankedRecord(gloryRec, { rankScope: 'MYTHICAL_GLORY' });
    const passEpic = filterRankedRecord(epicRec, { rankScope: 'MYTHICAL_GLORY' });
    record(
      8,
      'Rank Filter Isolation',
      passGlory === true && passEpic === false,
      `Rank filter did not cleanly isolate rank scope`,
      { passGlory, passEpic }
    );
  } catch (err: any) {
    record(8, 'Rank Filter Isolation', false, err.message);
  }

  // 9. Source separation (Ranked vs Pro)
  try {
    const rankedCat = categorizeSource('MLBBHub Ranked');
    const mplIdCat = categorizeSource('MPL ID S14 Official');
    const mplPhCat = categorizeSource('MPL PH S14 Ingest');
    const intlCat = categorizeSource('Liquipedia M6');
    record(
      9,
      'Source Separation',
      rankedCat === 'RANKED' && mplIdCat === 'MPL_ID' && mplPhCat === 'MPL_PH' && intlCat === 'INTERNATIONAL',
      `Source category did not cleanly categorize sources`,
      { rankedCat, mplIdCat, mplPhCat, intlCat }
    );
  } catch (err: any) {
    record(9, 'Source Separation', false, err.message);
  }

  // 10. 7/14/30 day period
  try {
    // Reference date 2026-09-20
    const recWithin7Days = createMockRankedRecord({ periodStart: '2026-09-15', periodEnd: '2026-09-18' });
    const recOlderThan7Days = createMockRankedRecord({ periodStart: '2026-09-01', periodEnd: '2026-09-05' });
    const pass7 = filterRankedRecord(recWithin7Days, { period: 'LAST_7_DAYS', referenceDate: '2026-09-20' });
    const fail7 = filterRankedRecord(recOlderThan7Days, { period: 'LAST_7_DAYS', referenceDate: '2026-09-20' });
    record(
      10,
      'Sliding Window Period Filter',
      pass7 === true && fail7 === false,
      `Period filtering failed for 7-day window`,
      { pass7, fail7 }
    );
  } catch (err: any) {
    record(10, 'Sliding Window Period Filter', false, err.message);
  }

  // 11. Rising trend
  try {
    const trend = calculateMetricTrend(
      { matches: 500, winRate: 56.0, pickRate: 20.0, banRate: 10.0, periodName: 'CURRENT' },
      { matches: 500, winRate: 52.0, pickRate: 18.0, banRate: 10.0, periodName: 'PREVIOUS' },
      'RANKED'
    );
    record(
      11,
      'Rising Trend (+4% win rate)',
      trend.direction === 'RISING' && trend.winRateDelta === 4.0,
      `Expected RISING with delta +4.0, got ${trend.direction} with delta ${trend.winRateDelta}`,
      { trend }
    );
  } catch (err: any) {
    record(11, 'Rising Trend', false, err.message);
  }

  // 12. Falling trend
  try {
    const trend = calculateMetricTrend(
      { matches: 500, winRate: 48.0, pickRate: 10.0, banRate: 5.0, periodName: 'CURRENT' },
      { matches: 500, winRate: 54.0, pickRate: 15.0, banRate: 8.0, periodName: 'PREVIOUS' },
      'RANKED'
    );
    record(
      12,
      'Falling Trend (-6% win rate)',
      trend.direction === 'FALLING' && trend.winRateDelta === -6.0,
      `Expected FALLING, got ${trend.direction}`,
      { trend }
    );
  } catch (err: any) {
    record(12, 'Falling Trend', false, err.message);
  }

  // 13. Stable trend
  try {
    const trend = calculateMetricTrend(
      { matches: 500, winRate: 50.5, pickRate: 10.2, banRate: 5.0, periodName: 'CURRENT' },
      { matches: 500, winRate: 50.0, pickRate: 10.0, banRate: 5.0, periodName: 'PREVIOUS' },
      'RANKED'
    );
    record(
      13,
      'Stable Trend (delta < 1.5%)',
      trend.direction === 'STABLE' && trend.winRateDelta === 0.5,
      `Expected STABLE, got ${trend.direction}`,
      { trend }
    );
  } catch (err: any) {
    record(13, 'Stable Trend', false, err.message);
  }

  // 14. Insufficient trend data (missing comparison or sample < min)
  try {
    const trendMissing = calculateMetricTrend(
      { matches: 500, winRate: 50.0, pickRate: 10.0, banRate: 5.0, periodName: 'CURRENT' },
      null,
      'RANKED'
    );
    const trendLowSample = calculateMetricTrend(
      { matches: 20, winRate: 50.0, pickRate: 10.0, banRate: 5.0, periodName: 'CURRENT' },
      { matches: 500, winRate: 50.0, pickRate: 10.0, banRate: 5.0, periodName: 'PREVIOUS' },
      'RANKED'
    );
    record(
      14,
      'Insufficient Trend Data',
      trendMissing.direction === 'INSUFFICIENT_DATA' && trendLowSample.direction === 'INSUFFICIENT_DATA',
      `Did not return INSUFFICIENT_DATA`,
      { trendMissing, trendLowSample }
    );
  } catch (err: any) {
    record(14, 'Insufficient Trend Data', false, err.message);
  }

  // 15. Low sample threshold
  try {
    // 250 matches is between 100 and 499 (LOW_SAMPLE for Ranked)
    const rec = createMockRankedRecord({ matches: 250, wins: 125, losses: 125 });
    const res = calculateRankedMetrics('fanny', [rec], {});
    record(
      15,
      'Low Sample Status',
      res.sampleStatus === 'LOW_SAMPLE',
      `Expected LOW_SAMPLE, got ${res.sampleStatus}`,
      { sampleStatus: res.sampleStatus }
    );
  } catch (err: any) {
    record(15, 'Low Sample Status', false, err.message);
  }

  // 16. Invalid record resilience
  try {
    const badRec: any = {
      id: 'bad_1',
      heroId: 'fanny',
      matches: NaN,
      wins: -50,
      losses: 'corrupted',
      collectedAt: null,
    };
    const goodRec = createMockRankedRecord({ matches: 100, wins: 50, losses: 50 });
    const res = calculateRankedMetrics('fanny', [badRec, goodRec], {});
    record(
      16,
      'Invalid Record Resilience',
      res.matches === 100 && res.wins === 50 && !isNaN(res.matches),
      `Calculator failed to safely sanitize invalid record fields`,
      { res }
    );
  } catch (err: any) {
    record(16, 'Invalid Record Resilience', false, err.message);
  }

  // 17. Duplicate handling
  try {
    const rec1 = createMockRankedRecord({ id: 'dup_1', matches: 500, wins: 250 });
    const rec2 = createMockRankedRecord({ id: 'dup_1', matches: 500, wins: 250 }); // identical id
    const res = calculateRankedMetrics('fanny', [rec1, rec2], {});
    record(
      17,
      'Duplicate Record Deduplication',
      res.matches === 500,
      `Expected 500 matches after deduplication, got ${res.matches}`,
      { matches: res.matches }
    );
  } catch (err: any) {
    record(17, 'Duplicate Record Deduplication', false, err.message);
  }

  // 18. Patch mismatch isolation
  try {
    const oldPatchRec = createMockRankedRecord({ patch: '2.1.80', isHistorical: true });
    const isFilteredOut = !filterRankedRecord(oldPatchRec, { patch: ACTIVE_PATCH_CONFIG.activePatch });
    record(
      18,
      'Patch Mismatch Isolation',
      isFilteredOut === true,
      `Historical patch was not isolated from active patch query`,
      { isFilteredOut }
    );
  } catch (err: any) {
    record(18, 'Patch Mismatch Isolation', false, err.message);
  }

  // 19. Empty repository handling
  try {
    const res = calculateRankedMetrics('non_existent_hero', [], {});
    record(
      19,
      'Empty Repository Clean Object',
      res.matches === 0 && res.winRate === null && res.sampleStatus === 'INSUFFICIENT' && res.dataQuality.completeness === 0,
      `Empty repository resulted in invalid structure`,
      { res }
    );
  } catch (err: any) {
    record(19, 'Empty Repository Clean Object', false, err.message);
  }

  // 20. Deterministic output
  try {
    const recA = createMockRankedRecord({ id: 'det_1', matches: 600, wins: 330 });
    const recB = createMockRankedRecord({ id: 'det_2', matches: 400, wins: 200 });
    const res1 = calculateRankedMetrics('fanny', [recA, recB], { referenceDate: '2026-09-20' });
    const res2 = calculateRankedMetrics('fanny', [recA, recB], { referenceDate: '2026-09-20' });
    const isExact = JSON.stringify(res1) === JSON.stringify(res2);
    record(
      20,
      'Deterministic Output',
      isExact === true,
      `Consecutive calculations with identical inputs yielded differing results`,
      { isExact }
    );
  } catch (err: any) {
    record(20, 'Deterministic Output', false, err.message);
  }

  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;

  return {
    totalTests,
    passedTests,
    failedTests,
    allPassed: failedTests === 0,
    results,
  };
}
