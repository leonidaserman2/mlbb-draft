import { HeroMetaSignals } from '../signals/types';
import {
  calculateHeroMetaPriority,
  computeRankedComponent,
  computeProComponent,
  computeTrendComponent,
  computePatchComponent,
  computeDataQualityComponent,
} from './calculator';
import {
  DEFAULT_PRIORITY_WEIGHTS,
  validateWeightsConfig,
} from './weights';
import { MetaPriorityService } from './priorityService';
import { MetaRepositoryCoordinator } from '../repository/metaRepository';
import { RankedRepository } from '../repository/rankedRepository';
import { ProRepository } from '../repository/proRepository';
import { PatchRepository } from '../repository/patchRepository';
import { MetaSignalService } from '../signals/signalService';
import { MetaMetricsService } from '../metrics/metricsService';

export interface PriorityTestResult {
  testId: number;
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

export interface PriorityTestSuiteReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  allPassed: boolean;
  results: PriorityTestResult[];
}

function createMockSignals(overrides: Partial<HeroMetaSignals> = {}): HeroMetaSignals {
  return {
    heroId: 'fanny',
    patch: '2.2.16',
    rankedSignal: {
      heroId: 'fanny',
      level: 'HIGH',
      winRateSignal: 'HIGH',
      pickRateSignal: 'HIGH',
      banRateSignal: 'HIGH',
      presenceRateSignal: 'HIGH',
      rawWinRate: 53.0,
      rawPickRate: 4.0,
      rawBanRate: 25.0,
      rawPresenceRate: 29.0,
      matches: 1200,
      sampleSize: 1200,
      rankScope: 'MYTHICAL_GLORY',
      period: 'CURRENT_PATCH',
      patch: '2.2.16',
      sampleStatus: 'SUFFICIENT',
      notes: [],
    },
    proSignals: {
      mplId: {
        heroId: 'fanny',
        level: 'HIGH',
        tournamentCategory: 'MPL_ID',
        tournamentName: 'MPL Indonesia',
        pickPresenceRate: 30.0,
        banPresenceRate: 40.0,
        totalPresenceRate: 70.0,
        winRate: 60.0,
        picks: 6,
        bans: 8,
        matches: 14,
        tournamentGames: 20,
        sampleSize: 20,
        period: 'CURRENT_PATCH',
        patch: '2.2.16',
        notes: [],
      },
      mplPh: {
        heroId: 'fanny',
        level: 'MEDIUM',
        tournamentCategory: 'MPL_PH',
        tournamentName: 'MPL Philippines',
        pickPresenceRate: 20.0,
        banPresenceRate: 20.0,
        totalPresenceRate: 40.0,
        winRate: 50.0,
        picks: 4,
        bans: 4,
        matches: 8,
        tournamentGames: 20,
        sampleSize: 20,
        period: 'CURRENT_PATCH',
        patch: '2.2.16',
        notes: [],
      },
      international: {
        heroId: 'fanny',
        level: 'INSUFFICIENT_DATA',
        tournamentCategory: 'INTERNATIONAL',
        tournamentName: 'International Tournaments',
        pickPresenceRate: null,
        banPresenceRate: null,
        totalPresenceRate: null,
        winRate: null,
        picks: 0,
        bans: 0,
        matches: 0,
        tournamentGames: 0,
        sampleSize: 0,
        period: 'CURRENT_PATCH',
        patch: '2.2.16',
        notes: [],
      },
    },
    trendSignal: {
      heroId: 'fanny',
      direction: 'STABLE',
      winRateDelta: 0.2,
      pickRateDelta: 0.1,
      banRateDelta: 0.0,
      currentPeriod: 'CURRENT_PATCH',
      comparisonPeriod: '2.2.10',
      reason: 'Metrics are stable',
      disclaimer: 'Trend trajectory only',
    },
    patchSignal: {
      heroId: 'fanny',
      patch: '2.2.16',
      change: 'NO_CHANGE',
      description: null,
      notes: 'No changes in current patch',
    },
    sampleSignal: {
      heroId: 'fanny',
      status: 'SUFFICIENT',
      sampleSize: 1200,
      completeness: 100,
      dataAgeDays: 2,
      isStale: false,
      isDemo: false,
      confidenceRating: 'HIGH',
      notes: [],
    },
    sourceBreakdown: {
      rankedMatches: 1200,
      mplIdMatches: 14,
      mplPhMatches: 8,
      internationalMatches: 0,
    },
    generatedAt: '2026-09-20T00:00:00Z',
    ...overrides,
  };
}

export async function runPriorityTestSuite(): Promise<PriorityTestSuiteReport> {
  const results: PriorityTestResult[] = [];

  function record(testId: number, name: string, passed: boolean, message: string, details?: any) {
    results.push({ testId, name, passed, message, details });
  }

  // TEST 1: Basic Priority Calculation
  try {
    const signals = createMockSignals();
    const priority = calculateHeroMetaPriority(signals);
    const pass =
      priority.metaPriorityScore >= 0 &&
      priority.metaPriorityScore <= 100 &&
      typeof priority.rankedComponent.score === 'number' &&
      typeof priority.proComponent.score === 'number' &&
      typeof priority.trendComponent.score === 'number' &&
      typeof priority.patchComponent.score === 'number' &&
      typeof priority.dataQualityComponent.score === 'number';
    record(1, 'Basic Priority Calculation', pass, pass ? 'PASSED' : `Score: ${priority.metaPriorityScore}`);
  } catch (e: any) {
    record(1, 'Basic Priority Calculation', false, `ERROR: ${e.message}`);
  }

  // TEST 2: Weight Sum = 100%
  try {
    const isValid = validateWeightsConfig(DEFAULT_PRIORITY_WEIGHTS);
    const sum =
      DEFAULT_PRIORITY_WEIGHTS.ranked +
      DEFAULT_PRIORITY_WEIGHTS.pro +
      DEFAULT_PRIORITY_WEIGHTS.trend +
      DEFAULT_PRIORITY_WEIGHTS.patch +
      DEFAULT_PRIORITY_WEIGHTS.dataQuality;
    const pass = isValid && Math.abs(sum - 1.0) < 0.0001;
    record(2, 'Weight Sum = 100%', pass, pass ? 'PASSED' : `Sum is ${sum}`);
  } catch (e: any) {
    record(2, 'Weight Sum = 100%', false, `ERROR: ${e.message}`);
  }

  // TEST 3: Ranked Component
  try {
    const signals = createMockSignals();
    const ranked = computeRankedComponent(signals);
    // HIGH levels should yield 80 for each sub-score
    const pass =
      ranked.score === 80 &&
      ranked.weight === 0.45 &&
      ranked.weightedContribution === 36.0 &&
      ranked.presenceRateSubScore === 80;
    record(3, 'Ranked Component', pass, pass ? 'PASSED' : `Score: ${ranked.score}`);
  } catch (e: any) {
    record(3, 'Ranked Component', false, `ERROR: ${e.message}`);
  }

  // TEST 4: Pro Component
  try {
    const signals = createMockSignals();
    const pro = computeProComponent(signals);
    // MPL ID (HIGH=80), MPL PH (MEDIUM=50), equal 0.40/0.40 weight => (80*0.4 + 50*0.4)/0.8 = 65
    const pass =
      pro.hasProData &&
      pro.score === 65 &&
      pro.availableSources.includes('MPL_ID') &&
      pro.availableSources.includes('MPL_PH') &&
      !pro.availableSources.includes('INTERNATIONAL');
    record(4, 'Pro Component', pass, pass ? 'PASSED' : `Score: ${pro.score}`);
  } catch (e: any) {
    record(4, 'Pro Component', false, `ERROR: ${e.message}`);
  }

  // TEST 5: MPL ID Isolation
  try {
    const signals1 = createMockSignals();
    const signals2 = createMockSignals({
      proSignals: {
        ...signals1.proSignals,
        mplId: { ...signals1.proSignals.mplId, level: 'VERY_HIGH' }, // 95
      },
    });
    const pro1 = computeProComponent(signals1);
    const pro2 = computeProComponent(signals2);
    const pass =
      pro2.mplIdSubScore === 95 &&
      pro1.mplIdSubScore === 80 &&
      pro2.mplPhSubScore === pro1.mplPhSubScore && // MPL PH remains completely unchanged
      pro2.score > pro1.score;
    record(5, 'MPL ID Isolation', pass, pass ? 'PASSED' : 'MPL ID leaked into other sources');
  } catch (e: any) {
    record(5, 'MPL ID Isolation', false, `ERROR: ${e.message}`);
  }

  // TEST 6: MPL PH Isolation
  try {
    const signals1 = createMockSignals();
    const signals2 = createMockSignals({
      proSignals: {
        ...signals1.proSignals,
        mplPh: { ...signals1.proSignals.mplPh, level: 'VERY_HIGH' }, // 95
      },
    });
    const pro1 = computeProComponent(signals1);
    const pro2 = computeProComponent(signals2);
    const pass =
      pro2.mplPhSubScore === 95 &&
      pro1.mplPhSubScore === 50 &&
      pro2.mplIdSubScore === pro1.mplIdSubScore && // MPL ID remains completely unchanged
      pro2.score > pro1.score;
    record(6, 'MPL PH Isolation', pass, pass ? 'PASSED' : 'MPL PH leaked into other sources');
  } catch (e: any) {
    record(6, 'MPL PH Isolation', false, `ERROR: ${e.message}`);
  }

  // TEST 7: International Isolation
  try {
    const signalsWithIntl = createMockSignals({
      proSignals: {
        ...createMockSignals().proSignals,
        international: {
          heroId: 'fanny',
          level: 'HIGH',
          tournamentCategory: 'INTERNATIONAL',
          tournamentName: 'M6 World Championship',
          pickPresenceRate: 35.0,
          banPresenceRate: 25.0,
          totalPresenceRate: 60.0,
          winRate: 60.0,
          picks: 7,
          bans: 5,
          matches: 12,
          tournamentGames: 20,
          sampleSize: 20,
          period: 'CURRENT_PATCH',
          patch: '2.2.16',
          notes: [],
        },
      },
    });
    const pro = computeProComponent(signalsWithIntl);
    const pass =
      pro.internationalSubScore === 80 &&
      pro.availableSources.includes('INTERNATIONAL') &&
      pro.availableSources.length === 3;
    record(7, 'International Isolation', pass, pass ? 'PASSED' : `Available: ${pro.availableSources}`);
  } catch (e: any) {
    record(7, 'International Isolation', false, `ERROR: ${e.message}`);
  }

  // TEST 8: Trend Rising
  try {
    const signals = createMockSignals({
      trendSignal: {
        heroId: 'fanny',
        direction: 'RISING',
        winRateDelta: 3.5,
        pickRateDelta: 1.0,
        banRateDelta: 2.0,
        currentPeriod: 'CURRENT_PATCH',
        comparisonPeriod: '2.2.10',
        reason: 'Rising trend',
        disclaimer: 'Trajectory only',
      },
    });
    const trend = computeTrendComponent(signals);
    const pass = trend.direction === 'RISING' && trend.score >= 75;
    record(8, 'Trend Rising', pass, pass ? 'PASSED' : `Score: ${trend.score}`);
  } catch (e: any) {
    record(8, 'Trend Rising', false, `ERROR: ${e.message}`);
  }

  // TEST 9: Trend Stable
  try {
    const signals = createMockSignals({
      trendSignal: {
        heroId: 'fanny',
        direction: 'STABLE',
        winRateDelta: 0.1,
        pickRateDelta: 0.0,
        banRateDelta: 0.0,
        currentPeriod: 'CURRENT_PATCH',
        comparisonPeriod: '2.2.10',
        reason: 'Stable metrics',
        disclaimer: 'Trajectory only',
      },
    });
    const trend = computeTrendComponent(signals);
    const pass = trend.direction === 'STABLE' && trend.score === 50;
    record(9, 'Trend Stable', pass, pass ? 'PASSED' : `Score: ${trend.score}`);
  } catch (e: any) {
    record(9, 'Trend Stable', false, `ERROR: ${e.message}`);
  }

  // TEST 10: Trend Falling
  try {
    const signals = createMockSignals({
      trendSignal: {
        heroId: 'fanny',
        direction: 'FALLING',
        winRateDelta: -4.0,
        pickRateDelta: -1.0,
        banRateDelta: -2.0,
        currentPeriod: 'CURRENT_PATCH',
        comparisonPeriod: '2.2.10',
        reason: 'Declining metrics',
        disclaimer: 'Trajectory only',
      },
    });
    const trend = computeTrendComponent(signals);
    const pass = trend.direction === 'FALLING' && trend.score <= 25;
    record(10, 'Trend Falling', pass, pass ? 'PASSED' : `Score: ${trend.score}`);
  } catch (e: any) {
    record(10, 'Trend Falling', false, `ERROR: ${e.message}`);
  }

  // TEST 11: Patch Buff
  try {
    const signals = createMockSignals({
      patchSignal: {
        heroId: 'fanny',
        patch: '2.2.16',
        change: 'BUFF',
        description: 'Base energy regeneration increased',
        notes: 'Patch buff',
      },
    });
    const patch = computePatchComponent(signals);
    const pass = patch.change === 'BUFF' && patch.score === 75;
    record(11, 'Patch Buff', pass, pass ? 'PASSED' : `Score: ${patch.score}`);
  } catch (e: any) {
    record(11, 'Patch Buff', false, `ERROR: ${e.message}`);
  }

  // TEST 12: Patch Nerf
  try {
    const signals = createMockSignals({
      patchSignal: {
        heroId: 'fanny',
        patch: '2.2.16',
        change: 'NERF',
        description: 'Skill cooldown increased',
        notes: 'Patch nerf',
      },
    });
    const patch = computePatchComponent(signals);
    const pass = patch.change === 'NERF' && patch.score === 25;
    record(12, 'Patch Nerf', pass, pass ? 'PASSED' : `Score: ${patch.score}`);
  } catch (e: any) {
    record(12, 'Patch Nerf', false, `ERROR: ${e.message}`);
  }

  // TEST 13: Patch Adjustment
  try {
    const signals = createMockSignals({
      patchSignal: {
        heroId: 'fanny',
        patch: '2.2.16',
        change: 'ADJUSTMENT',
        description: 'Damage shifted from early to late game',
        notes: 'Adjustment',
      },
    });
    const patch = computePatchComponent(signals);
    const pass = patch.change === 'ADJUSTMENT' && patch.score === 50;
    record(13, 'Patch Adjustment', pass, pass ? 'PASSED' : `Score: ${patch.score}`);
  } catch (e: any) {
    record(13, 'Patch Adjustment', false, `ERROR: ${e.message}`);
  }

  // TEST 14: No Patch Data / Unknown
  try {
    const signals = createMockSignals({
      patchSignal: {
        heroId: 'fanny',
        patch: '2.2.16',
        change: 'UNKNOWN',
        description: null,
        notes: 'No patch notes',
      },
    });
    const patch = computePatchComponent(signals);
    const pass = patch.change === 'UNKNOWN' && patch.score === 50;
    record(14, 'No Patch Data', pass, pass ? 'PASSED' : `Score: ${patch.score}`);
  } catch (e: any) {
    record(14, 'No Patch Data', false, `ERROR: ${e.message}`);
  }

  // TEST 15: Sufficient Sample
  try {
    const signals = createMockSignals({
      sampleSignal: {
        heroId: 'fanny',
        status: 'SUFFICIENT',
        sampleSize: 1500,
        completeness: 100,
        dataAgeDays: 1,
        isStale: false,
        isDemo: false,
        confidenceRating: 'HIGH',
        notes: [],
      },
    });
    const priority = calculateHeroMetaPriority(signals);
    const pass =
      priority.dataQualityComponent.score === 100 &&
      priority.confidence === 'HIGH';
    record(15, 'Sufficient Sample', pass, pass ? 'PASSED' : `Score: ${priority.dataQualityComponent.score}`);
  } catch (e: any) {
    record(15, 'Sufficient Sample', false, `ERROR: ${e.message}`);
  }

  // TEST 16: Low Sample
  try {
    const signals = createMockSignals({
      rankedSignal: {
        ...createMockSignals().rankedSignal,
        matches: 250,
      },
      sampleSignal: {
        heroId: 'fanny',
        status: 'LOW_SAMPLE',
        sampleSize: 250,
        completeness: 85,
        dataAgeDays: 3,
        isStale: false,
        isDemo: false,
        confidenceRating: 'MEDIUM',
        notes: [],
      },
    });
    const priority = calculateHeroMetaPriority(signals);
    const pass =
      priority.dataQualityComponent.score === 60 &&
      priority.confidence === 'MEDIUM';
    record(16, 'Low Sample', pass, pass ? 'PASSED' : `Score: ${priority.dataQualityComponent.score}`);
  } catch (e: any) {
    record(16, 'Low Sample', false, `ERROR: ${e.message}`);
  }

  // TEST 17: Insufficient Sample
  try {
    const signals = createMockSignals({
      rankedSignal: {
        ...createMockSignals().rankedSignal,
        matches: 30,
      },
      sampleSignal: {
        heroId: 'fanny',
        status: 'INSUFFICIENT',
        sampleSize: 30,
        completeness: 40,
        dataAgeDays: 2,
        isStale: false,
        isDemo: false,
        confidenceRating: 'LOW',
        notes: [],
      },
    });
    const priority = calculateHeroMetaPriority(signals);
    const pass =
      priority.dataQualityComponent.score === 20 &&
      priority.confidence === 'LOW';
    record(17, 'Insufficient Sample', pass, pass ? 'PASSED' : `Score: ${priority.dataQualityComponent.score}`);
  } catch (e: any) {
    record(17, 'Insufficient Sample', false, `ERROR: ${e.message}`);
  }

  // TEST 18: Stale Data
  try {
    const signals = createMockSignals({
      sampleSignal: {
        heroId: 'fanny',
        status: 'STALE',
        sampleSize: 1000,
        completeness: 95,
        dataAgeDays: 25,
        isStale: true,
        isDemo: false,
        confidenceRating: 'LOW',
        notes: [],
      },
    });
    const priority = calculateHeroMetaPriority(signals);
    const pass =
      priority.dataQualityComponent.score === 40 &&
      priority.isStale === true &&
      priority.confidence === 'LOW';
    record(18, 'Stale Data', pass, pass ? 'PASSED' : `Score: ${priority.dataQualityComponent.score}`);
  } catch (e: any) {
    record(18, 'Stale Data', false, `ERROR: ${e.message}`);
  }

  // TEST 19: Demo Data
  try {
    const signals = createMockSignals({
      sampleSignal: {
        heroId: 'fanny',
        status: 'DEMO_ONLY',
        sampleSize: 5000,
        completeness: 100,
        dataAgeDays: 1,
        isStale: false,
        isDemo: true,
        confidenceRating: 'UNUSABLE',
        notes: ['Demo test snapshot'],
      },
    });
    const priority = calculateHeroMetaPriority(signals);
    const pass =
      priority.isDemo === true &&
      priority.confidence === 'UNUSABLE' &&
      priority.explanation.includes('Synthetic demo data');
    record(19, 'Demo Data', pass, pass ? 'PASSED' : `Confidence: ${priority.confidence}`);
  } catch (e: any) {
    record(19, 'Demo Data', false, `ERROR: ${e.message}`);
  }

  // TEST 20: Missing Pro Data
  try {
    const signals = createMockSignals({
      proSignals: {
        mplId: { ...createMockSignals().proSignals.mplId, level: 'INSUFFICIENT_DATA', tournamentGames: 0 },
        mplPh: { ...createMockSignals().proSignals.mplPh, level: 'INSUFFICIENT_DATA', tournamentGames: 0 },
        international: { ...createMockSignals().proSignals.international, level: 'INSUFFICIENT_DATA', tournamentGames: 0 },
      },
    });
    const pro = computeProComponent(signals);
    const pass =
      pro.hasProData === false &&
      pro.availableSources.length === 0 &&
      pro.score === 50; // neutral fallback
    record(20, 'Missing Pro Data', pass, pass ? 'PASSED' : `Score: ${pro.score}`);
  } catch (e: any) {
    record(20, 'Missing Pro Data', false, `ERROR: ${e.message}`);
  }

  // TEST 21: Missing Ranked Data
  try {
    const signals = createMockSignals({
      rankedSignal: {
        ...createMockSignals().rankedSignal,
        matches: 0,
        sampleSize: 0,
        level: 'INSUFFICIENT_DATA',
        presenceRateSignal: 'INSUFFICIENT_DATA',
        banRateSignal: 'INSUFFICIENT_DATA',
        winRateSignal: 'INSUFFICIENT_DATA',
        pickRateSignal: 'INSUFFICIENT_DATA',
      },
    });
    const ranked = computeRankedComponent(signals);
    const pass =
      ranked.level === 'INSUFFICIENT_DATA' &&
      ranked.matches === 0 &&
      ranked.score === 30; // conservative baseline
    record(21, 'Missing Ranked Data', pass, pass ? 'PASSED' : `Score: ${ranked.score}`);
  } catch (e: any) {
    record(21, 'Missing Ranked Data', false, `ERROR: ${e.message}`);
  }

  // TEST 22: Rank-Specific Data
  try {
    const mockRepo = new MetaRepositoryCoordinator(
      new RankedRepository(),
      new ProRepository(),
      new PatchRepository()
    );
    mockRepo.ranked.insert({
      id: 'rec1',
      heroId: 'claude',
      patch: '2.2.16',
      mode: 'RANKED',
      rankScope: 'EPIC',
      region: 'GLOBAL',
      periodStart: '2026-09-08',
      periodEnd: '2026-09-20',
      matches: 300,
      picks: 300,
      bans: 50,
      wins: 160,
      losses: 140,
      winRate: 53.3,
      pickRate: 3.5,
      banRate: 5.0,
      presenceRate: 8.5,
      source: 'RANKED',
      sourceUrl: 'https://example.com',
      collectedAt: '2026-09-20',
      confidence: 'official',
      isHistorical: false,
      normalizedAt: '2026-09-20',
      importedAt: '2026-09-20',
      isValidated: true,
    });

    const service = new MetaPriorityService(
      new MetaSignalService(new MetaMetricsService(mockRepo)),
      mockRepo
    );

    const res = service.resolveRankFallback('claude', 'EPIC', '2.2.16');
    const pass = res.effectiveRank === 'EPIC' && res.fallbackStatus === 'DIRECT_RANK_DATA';
    record(22, 'Rank-Specific Data', pass, pass ? 'PASSED' : `Status: ${res.fallbackStatus}`);
  } catch (e: any) {
    record(22, 'Rank-Specific Data', false, `ERROR: ${e.message}`);
  }

  // TEST 23: Mythic+ Fallback
  try {
    const mockRepo = new MetaRepositoryCoordinator(
      new RankedRepository(),
      new ProRepository(),
      new PatchRepository()
    );
    mockRepo.ranked.insert({
      id: 'rec2',
      heroId: 'claude',
      patch: '2.2.16',
      mode: 'RANKED',
      rankScope: 'MYTHIC_PLUS',
      region: 'GLOBAL',
      periodStart: '2026-09-08',
      periodEnd: '2026-09-20',
      matches: 400,
      picks: 400,
      bans: 100,
      wins: 210,
      losses: 190,
      winRate: 52.5,
      pickRate: 4.0,
      banRate: 10.0,
      presenceRate: 14.0,
      source: 'RANKED',
      sourceUrl: 'https://example.com',
      collectedAt: '2026-09-20',
      confidence: 'official',
      isHistorical: false,
      normalizedAt: '2026-09-20',
      importedAt: '2026-09-20',
      isValidated: true,
    });

    const service = new MetaPriorityService(
      new MetaSignalService(new MetaMetricsService(mockRepo)),
      mockRepo
    );

    // Requesting MYTHICAL_IMMORTAL when only MYTHIC_PLUS exists
    const res = service.resolveRankFallback('claude', 'MYTHICAL_IMMORTAL', '2.2.16');
    const pass = res.effectiveRank === 'MYTHIC_PLUS' && res.fallbackStatus === 'MYTHIC_PLUS_FALLBACK';
    record(23, 'Mythic+ Fallback', pass, pass ? 'PASSED' : `Status: ${res.fallbackStatus}`);
  } catch (e: any) {
    record(23, 'Mythic+ Fallback', false, `ERROR: ${e.message}`);
  }

  // TEST 24: Deterministic Output
  try {
    const signals = createMockSignals();
    const run1 = calculateHeroMetaPriority(signals);
    const run2 = calculateHeroMetaPriority(signals);
    const pass =
      run1.metaPriorityScore === run2.metaPriorityScore &&
      run1.rankedComponent.score === run2.rankedComponent.score &&
      run1.proComponent.score === run2.proComponent.score &&
      run1.explanation === run2.explanation;
    record(24, 'Deterministic Output', pass, pass ? 'PASSED' : 'Outputs differ between runs');
  } catch (e: any) {
    record(24, 'Deterministic Output', false, `ERROR: ${e.message}`);
  }

  // TEST 25: First-Pick/Second-Pick Independence
  try {
    // Meta Priority does NOT change whether draft turn is first pick or second pick
    const signals = createMockSignals();
    const priorityA = calculateHeroMetaPriority(signals);
    const priorityB = calculateHeroMetaPriority(signals);
    const pass =
      priorityA.metaPriorityScore === priorityB.metaPriorityScore &&
      !priorityA.explanation.includes('first pick') &&
      !priorityA.explanation.includes('second pick') &&
      !priorityA.explanation.includes('Pick this') &&
      !priorityA.explanation.includes('Ban this');
    record(25, 'First-Pick/Second-Pick Independence', pass, pass ? 'PASSED' : 'Draft context leaked into priority');
  } catch (e: any) {
    record(25, 'First-Pick/Second-Pick Independence', false, `ERROR: ${e.message}`);
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
