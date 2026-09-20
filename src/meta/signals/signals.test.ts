import { computeRankedSignal } from './rankedSignal';
import { computeProSignal } from './proSignal';
import { computeTrendSignal } from './trendSignal';
import { computePatchSignal } from './patchSignal';
import { computeSampleSignal } from './sampleSignal';
import { MetaSignalService } from './signalService';
import { PatchRepository } from '../repository/patchRepository';
import { HeroMetaMetrics } from '../metrics/types';
import { PatchData } from '../types/snapshot';

export interface SignalTestResult {
  testId: number;
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

export interface SignalTestSuiteReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  allPassed: boolean;
  results: SignalTestResult[];
}

function createMockRankedMetrics(overrides: Partial<HeroMetaMetrics> = {}): HeroMetaMetrics {
  return {
    heroId: 'fanny',
    patch: '2.2.16',
    rankScope: 'MYTHICAL_GLORY',
    region: 'GLOBAL',
    period: 'CURRENT_PATCH',
    source: 'RANKED',
    sourceCategory: 'RANKED',
    matches: 1000,
    wins: 540,
    losses: 460,
    picks: 1000,
    bans: 350,
    winRate: 54.0,
    pickRate: 5.0,
    banRate: 25.0,
    presenceRate: 30.0,
    sampleSize: 1000,
    sampleStatus: 'SUFFICIENT',
    trend: {
      direction: 'STABLE',
      winRateDelta: 0.5,
      pickRateDelta: 0.1,
      banRateDelta: 0.0,
      currentPeriod: 'CURRENT_PATCH',
      comparisonPeriod: '2.2.10',
    },
    dataQuality: {
      status: 'SUFFICIENT',
      sampleSize: 1000,
      dataAgeDays: 2,
      completeness: 100,
      isStale: false,
      isDemo: false,
    },
    collectedAt: '2026-09-20',
    isHistorical: false,
    ...overrides,
  };
}

export async function runSignalsTestSuite(): Promise<SignalTestSuiteReport> {
  const results: SignalTestResult[] = [];

  function record(testId: number, name: string, passed: boolean, message: string, details?: any) {
    results.push({ testId, name, passed, message, details });
  }

  // TEST 1: Ranked High Signal
  try {
    const metrics = createMockRankedMetrics({
      winRate: 54.0,
      pickRate: 5.0,
      banRate: 25.0,
      presenceRate: 30.0,
      matches: 1000,
    });
    const signal = computeRankedSignal(metrics);
    const pass =
      signal.level === 'HIGH' &&
      signal.winRateSignal === 'VERY_HIGH' &&
      signal.banRateSignal === 'HIGH';
    record(1, 'Ranked High Signal', pass, pass ? 'PASSED' : `FAILED: level=${signal.level}`);
  } catch (e: any) {
    record(1, 'Ranked High Signal', false, `ERROR: ${e.message}`);
  }

  // TEST 2: Ranked Low Signal
  try {
    const metrics = createMockRankedMetrics({
      winRate: 45.0,
      pickRate: 0.4,
      banRate: 0.1,
      presenceRate: 0.5,
      matches: 800,
    });
    const signal = computeRankedSignal(metrics);
    const pass =
      signal.level === 'VERY_LOW' &&
      signal.winRateSignal === 'VERY_LOW' &&
      signal.presenceRateSignal === 'VERY_LOW';
    record(2, 'Ranked Low Signal', pass, pass ? 'PASSED' : `FAILED: level=${signal.level}`);
  } catch (e: any) {
    record(2, 'Ranked Low Signal', false, `ERROR: ${e.message}`);
  }

  // TEST 3: Insufficient Ranked Data
  try {
    const metrics = createMockRankedMetrics({
      matches: 40,
      sampleSize: 40,
      sampleStatus: 'INSUFFICIENT',
      winRate: 60.0,
    });
    const signal = computeRankedSignal(metrics);
    const pass =
      signal.level === 'INSUFFICIENT_DATA' &&
      signal.winRateSignal === 'INSUFFICIENT_DATA' &&
      signal.notes.some((n) => n.includes('below minimum threshold'));
    record(3, 'Insufficient Ranked Data', pass, pass ? 'PASSED' : `FAILED: level=${signal.level}`);
  } catch (e: any) {
    record(3, 'Insufficient Ranked Data', false, `ERROR: ${e.message}`);
  }

  // TEST 4: Pro Signal MPL ID
  try {
    const metrics = createMockRankedMetrics({
      sourceCategory: 'MPL_ID',
      source: 'MPL ID S14',
      sampleSize: 20, // 20 tournament games
      matches: 16,
      presenceRate: 80.0,
      banRate: 45.0,
      pickRate: 35.0,
      winRate: 62.5,
    });
    const signal = computeProSignal(metrics, 'MPL_ID', 'MPL Indonesia');
    const pass =
      signal.level === 'VERY_HIGH' &&
      signal.tournamentCategory === 'MPL_ID' &&
      signal.totalPresenceRate === 80.0;
    record(4, 'Pro Signal MPL ID', pass, pass ? 'PASSED' : `FAILED: level=${signal.level}`);
  } catch (e: any) {
    record(4, 'Pro Signal MPL ID', false, `ERROR: ${e.message}`);
  }

  // TEST 5: Pro Signal MPL PH
  try {
    const metrics = createMockRankedMetrics({
      sourceCategory: 'MPL_PH',
      source: 'MPL PH S14',
      sampleSize: 20,
      matches: 11,
      presenceRate: 55.0,
      banRate: 30.0,
      pickRate: 25.0,
    });
    const signal = computeProSignal(metrics, 'MPL_PH', 'MPL Philippines');
    const pass =
      signal.level === 'HIGH' &&
      signal.tournamentCategory === 'MPL_PH' &&
      signal.totalPresenceRate === 55.0;
    record(5, 'Pro Signal MPL PH', pass, pass ? 'PASSED' : `FAILED: level=${signal.level}`);
  } catch (e: any) {
    record(5, 'Pro Signal MPL PH', false, `ERROR: ${e.message}`);
  }

  // TEST 6: International Signal
  try {
    const metrics = createMockRankedMetrics({
      sourceCategory: 'INTERNATIONAL',
      source: 'M6 World Championship',
      sampleSize: 30,
      matches: 8,
      presenceRate: 26.67,
      banRate: 13.33,
      pickRate: 13.33,
    });
    const signal = computeProSignal(metrics, 'INTERNATIONAL', 'International Tournaments');
    const pass =
      signal.level === 'MEDIUM' &&
      signal.tournamentCategory === 'INTERNATIONAL' &&
      signal.totalPresenceRate !== null;
    record(6, 'International Signal', pass, pass ? 'PASSED' : `FAILED: level=${signal.level}`);
  } catch (e: any) {
    record(6, 'International Signal', false, `ERROR: ${e.message}`);
  }

  // TEST 7: Source Separation
  try {
    const rankedMetrics = createMockRankedMetrics({ matches: 1500 });
    const mplMetrics = createMockRankedMetrics({
      sourceCategory: 'MPL_ID',
      sampleSize: 25,
      matches: 18,
      presenceRate: 72.0,
    });
    const rankedSignal = computeRankedSignal(rankedMetrics);
    const mplSignal = computeProSignal(mplMetrics, 'MPL_ID', 'MPL Indonesia');

    const pass =
      rankedSignal.matches === 1500 &&
      mplSignal.matches === 18 &&
      mplSignal.tournamentGames === 25 &&
      rankedSignal.rankScope === 'MYTHICAL_GLORY' &&
      mplSignal.tournamentCategory === 'MPL_ID';
    record(7, 'Source Separation', pass, pass ? 'PASSED' : 'FAILED: Data leakage between sources detected');
  } catch (e: any) {
    record(7, 'Source Separation', false, `ERROR: ${e.message}`);
  }

  // TEST 8: Rising Trend
  try {
    const signal = computeTrendSignal({
      direction: 'RISING',
      winRateDelta: 3.5,
      pickRateDelta: 1.2,
      banRateDelta: 4.0,
      currentPeriod: 'CURRENT_PATCH',
      comparisonPeriod: '2.2.10',
    });
    const pass =
      signal.direction === 'RISING' &&
      signal.winRateDelta === 3.5 &&
      signal.disclaimer.includes('RISING indicates an upward metric trajectory');
    record(8, 'Rising Trend', pass, pass ? 'PASSED' : `FAILED: direction=${signal.direction}`);
  } catch (e: any) {
    record(8, 'Rising Trend', false, `ERROR: ${e.message}`);
  }

  // TEST 9: Stable Trend
  try {
    const signal = computeTrendSignal({
      direction: 'STABLE',
      winRateDelta: 0.4,
      pickRateDelta: -0.2,
      banRateDelta: 0.1,
      currentPeriod: 'CURRENT_PATCH',
      comparisonPeriod: '2.2.10',
    });
    const pass = signal.direction === 'STABLE' && signal.winRateDelta === 0.4;
    record(9, 'Stable Trend', pass, pass ? 'PASSED' : `FAILED: direction=${signal.direction}`);
  } catch (e: any) {
    record(9, 'Stable Trend', false, `ERROR: ${e.message}`);
  }

  // TEST 10: Falling Trend
  try {
    const signal = computeTrendSignal({
      direction: 'FALLING',
      winRateDelta: -4.2,
      pickRateDelta: -1.5,
      banRateDelta: -2.0,
      currentPeriod: 'CURRENT_PATCH',
      comparisonPeriod: '2.2.10',
    });
    const pass = signal.direction === 'FALLING' && signal.winRateDelta === -4.2;
    record(10, 'Falling Trend', pass, pass ? 'PASSED' : `FAILED: direction=${signal.direction}`);
  } catch (e: any) {
    record(10, 'Falling Trend', false, `ERROR: ${e.message}`);
  }

  // TEST 11: Insufficient Trend
  try {
    const signal = computeTrendSignal({
      direction: 'INSUFFICIENT_DATA',
      winRateDelta: null,
      pickRateDelta: null,
      banRateDelta: null,
      currentPeriod: 'CURRENT_PATCH',
      comparisonPeriod: null,
    });
    const pass = signal.direction === 'INSUFFICIENT_DATA' && signal.winRateDelta === null;
    record(11, 'Insufficient Trend', pass, pass ? 'PASSED' : `FAILED: direction=${signal.direction}`);
  } catch (e: any) {
    record(11, 'Insufficient Trend', false, `ERROR: ${e.message}`);
  }

  // TEST 12: Buff Patch Signal
  try {
    const patchRepo = new PatchRepository();
    const patchData: PatchData = {
      patchId: 'p1',
      version: '2.2.16',
      releaseDate: '2026-09-08',
      source: 'Official',
      sourceUrl: 'https://mlbb.com',
      collectedAt: '2026-09-08T00:00:00Z',
      changes: [
        {
          heroId: 'fanny',
          patch: '2.2.16',
          changeType: 'BUFF',
          description: 'Energy cost reduced on S2',
        },
      ],
    };
    patchRepo.insert({ ...patchData, normalizedAt: '2026-09-08T00:00:00Z', isValidated: true });

    const signal = computePatchSignal('fanny', '2.2.16', patchRepo);
    const pass =
      signal.change === 'BUFF' &&
      Boolean(signal.description?.includes('Energy cost reduced')) &&
      signal.notes.includes('BUFF does not guarantee high meta priority');
    record(12, 'Buff Patch Signal', pass, pass ? 'PASSED' : `FAILED: change=${signal.change}`);
  } catch (e: any) {
    record(12, 'Buff Patch Signal', false, `ERROR: ${e.message}`);
  }

  // TEST 13: Nerf Patch Signal
  try {
    const patchRepo = new PatchRepository();
    const patchData: PatchData = {
      patchId: 'p2',
      version: '2.2.16',
      releaseDate: '2026-09-08',
      source: 'Official',
      sourceUrl: 'https://mlbb.com',
      collectedAt: '2026-09-08T00:00:00Z',
      changes: [
        {
          heroId: 'ling',
          patch: '2.2.16',
          changeType: 'NERF',
          description: 'Base damage reduced',
        },
      ],
    };
    patchRepo.insert({ ...patchData, normalizedAt: '2026-09-08T00:00:00Z', isValidated: true });

    const signal = computePatchSignal('ling', '2.2.16', patchRepo);
    const pass = signal.change === 'NERF' && signal.notes.includes('NERF does not guarantee low viability');
    record(13, 'Nerf Patch Signal', pass, pass ? 'PASSED' : `FAILED: change=${signal.change}`);
  } catch (e: any) {
    record(13, 'Nerf Patch Signal', false, `ERROR: ${e.message}`);
  }

  // TEST 14: Adjustment Patch Signal
  try {
    const patchRepo = new PatchRepository();
    const patchData: PatchData = {
      patchId: 'p3',
      version: '2.2.16',
      releaseDate: '2026-09-08',
      source: 'Official',
      sourceUrl: 'https://mlbb.com',
      collectedAt: '2026-09-08T00:00:00Z',
      changes: [
        {
          heroId: 'hayabusa',
          patch: '2.2.16',
          changeType: 'ADJUST',
          description: 'Cooldown mechanics tweaked',
        },
      ],
    };
    patchRepo.insert({ ...patchData, normalizedAt: '2026-09-08T00:00:00Z', isValidated: true });

    const signal = computePatchSignal('hayabusa', '2.2.16', patchRepo);
    const pass = signal.change === 'ADJUSTMENT';
    record(14, 'Adjustment Patch Signal', pass, pass ? 'PASSED' : `FAILED: change=${signal.change}`);
  } catch (e: any) {
    record(14, 'Adjustment Patch Signal', false, `ERROR: ${e.message}`);
  }

  // TEST 15: Unknown Patch
  try {
    const patchRepo = new PatchRepository(); // empty repository
    const signal = computePatchSignal('fanny', '9.9.99', patchRepo);
    const pass = signal.change === 'UNKNOWN' && signal.patch === '9.9.99';
    record(15, 'Unknown Patch', pass, pass ? 'PASSED' : `FAILED: change=${signal.change}`);
  } catch (e: any) {
    record(15, 'Unknown Patch', false, `ERROR: ${e.message}`);
  }

  // TEST 16: Sufficient Sample
  try {
    const signal = computeSampleSignal({
      status: 'SUFFICIENT',
      sampleSize: 1200,
      dataAgeDays: 2,
      completeness: 100,
      isStale: false,
      isDemo: false,
    });
    const pass = signal.status === 'SUFFICIENT' && signal.confidenceRating === 'HIGH';
    record(16, 'Sufficient Sample', pass, pass ? 'PASSED' : `FAILED: status=${signal.status}`);
  } catch (e: any) {
    record(16, 'Sufficient Sample', false, `ERROR: ${e.message}`);
  }

  // TEST 17: Low Sample
  try {
    const signal = computeSampleSignal({
      status: 'LOW_SAMPLE',
      sampleSize: 180,
      dataAgeDays: 3,
      completeness: 90,
      isStale: false,
      isDemo: false,
    });
    const pass = signal.status === 'LOW_SAMPLE' && signal.confidenceRating === 'MEDIUM';
    record(17, 'Low Sample', pass, pass ? 'PASSED' : `FAILED: status=${signal.status}`);
  } catch (e: any) {
    record(17, 'Low Sample', false, `ERROR: ${e.message}`);
  }

  // TEST 18: Stale Data
  try {
    const signal = computeSampleSignal({
      status: 'SUFFICIENT',
      sampleSize: 800,
      dataAgeDays: 25, // past 14 days threshold
      completeness: 95,
      isStale: true,
      isDemo: false,
    });
    const pass = signal.status === 'STALE' && signal.isStale === true && signal.confidenceRating === 'LOW';
    record(18, 'Stale Data', pass, pass ? 'PASSED' : `FAILED: status=${signal.status}`);
  } catch (e: any) {
    record(18, 'Stale Data', false, `ERROR: ${e.message}`);
  }

  // TEST 19: Demo Data
  try {
    const signal = computeSampleSignal({
      status: 'SUFFICIENT',
      sampleSize: 5000,
      dataAgeDays: 1,
      completeness: 100,
      isStale: false,
      isDemo: true,
    });
    const pass =
      signal.status === 'DEMO_ONLY' &&
      signal.isDemo === true &&
      signal.confidenceRating === 'UNUSABLE' &&
      signal.notes.some((n) => n.includes('must NOT be considered live competitive meta'));
    record(19, 'Demo Data', pass, pass ? 'PASSED' : `FAILED: status=${signal.status}`);
  } catch (e: any) {
    record(19, 'Demo Data', false, `ERROR: ${e.message}`);
  }

  // TEST 20: Deterministic Output
  try {
    const metrics = createMockRankedMetrics({ heroId: 'claude', winRate: 52.3, matches: 600 });
    const run1 = computeRankedSignal(metrics);
    const run2 = computeRankedSignal(metrics);
    const pass =
      JSON.stringify(run1) === JSON.stringify(run2) &&
      run1.level === run2.level &&
      run1.winRateSignal === run2.winRateSignal;
    record(20, 'Deterministic Output', pass, pass ? 'PASSED' : 'FAILED: Output variance detected');
  } catch (e: any) {
    record(20, 'Deterministic Output', false, `ERROR: ${e.message}`);
  }

  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.length - passedTests;

  return {
    totalTests: results.length,
    passedTests,
    failedTests,
    allPassed: failedTests === 0,
    results,
  };
}
