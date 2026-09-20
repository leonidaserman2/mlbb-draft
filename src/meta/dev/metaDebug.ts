import { metaCacheManager, SourceCacheEntry } from '../cache/metaCache';
import { dataSourceRegistry } from '../sources/registry';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';
import { ALL_MLBB_HEROES } from '../../data/heroes';
import { ValidationError } from '../validation/validator';
import {
  runAllSourcesVerification,
  formatVerificationReportText,
} from '../verification/verificationReport';
import { runVerificationTestSuite } from '../verification/sourceVerifier.test';
import { OverallVerificationSummary } from '../verification/verificationTypes';
import { runImportPipelineTestSuite } from '../importers/pipeline.test';
import { metaRepository } from '../repository/metaRepository';
import { importRankedJson, importProJson } from '../importers/jsonImporter';
import { importRankedCsv, importProCsv } from '../importers/csvImporter';
import { runMetricsTestSuite } from '../metrics/metrics.test';
import { metaMetricsService } from '../metrics/metricsService';
import { MetricFilterOptions } from '../metrics/types';
import { runSignalsTestSuite } from '../signals/signals.test';
import { metaSignalService } from '../signals/signalService';
import { SignalFilterOptions } from '../signals/types';
import { runPriorityTestSuite } from '../priority/priority.test';
import { metaPriorityService } from '../priority/priorityService';
import { PriorityFilterOptions } from '../priority/types';

export interface MetaDevReport {
  activePatch: string;
  season: string;
  totalVerifiedHeroesInGame: number;
  normalizedRankedRecordsCount: number;
  normalizedProRecordsCount: number;
  patchNotesCount: number;
  lastUpdateAttempt: string | null;
  lastSuccessfulSync: string | null;
  syncSuccess: boolean;
  sourcesOverview: Array<{
    id: string;
    name: string;
    status: string;
    category: string;
    confidence: string;
    recordCount: number;
    lastSync?: string;
  }>;
  sourcesCacheDetails: Record<string, SourceCacheEntry>;
  validationErrors: ValidationError[];
  isCacheActive: boolean;
  dataSourceMode: 'LIVE' | 'IMPORT' | 'CACHE' | 'UNAVAILABLE';
  repositoryStatus: {
    overallStatus: string;
    rankedStatus: string;
    proStatus: string;
    patchStatus: string;
    rankedCount: number;
    proCount: number;
    lastSuccessfulSync: string | null;
    isStale: boolean;
  };
}

/**
 * Generates an inspection report for developers
 */
export function getDevInspectionReport(): MetaDevReport {
  const cache = metaCacheManager.getCache();
  const sources = dataSourceRegistry.getAllSourceInfos();
  const repoStatus = metaRepository.getStatus();

  let dataSourceMode: 'LIVE' | 'IMPORT' | 'CACHE' | 'UNAVAILABLE' = 'UNAVAILABLE';
  if (repoStatus.overallStatus === 'LIVE') {
    dataSourceMode = 'LIVE';
  } else if (repoStatus.rankedCount > 0 || repoStatus.proCount > 0) {
    // Check if there are records marked with IMPORT or cached
    const hasImportSource = metaRepository.ranked.query().some(r => r.source.toLowerCase().includes('import') || r.source.toLowerCase().includes('manual')) ||
      metaRepository.pro.query().some(r => r.source.toLowerCase().includes('import') || r.source.toLowerCase().includes('manual'));
    dataSourceMode = hasImportSource ? 'IMPORT' : 'CACHE';
  } else if (cache.rankedSnapshots.length > 0 || cache.proSnapshots.length > 0) {
    dataSourceMode = 'CACHE';
  }

  return {
    activePatch: ACTIVE_PATCH_CONFIG.activePatch,
    season: ACTIVE_PATCH_CONFIG.season,
    totalVerifiedHeroesInGame: ALL_MLBB_HEROES.length,
    normalizedRankedRecordsCount: cache.rankedSnapshots.length,
    normalizedProRecordsCount: cache.proSnapshots.length,
    patchNotesCount: cache.patchNotes.length,
    lastUpdateAttempt: cache.lastUpdateAttempt,
    lastSuccessfulSync: cache.lastSuccessfulSync,
    syncSuccess: cache.syncSuccess,
    dataSourceMode,
    repositoryStatus: repoStatus,
    sourcesOverview: sources.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      category: s.category,
      confidence: s.confidence,
      recordCount: s.recordCount,
      lastSync: s.lastSync,
    })),
    sourcesCacheDetails: cache.sourcesCacheDetails,
    validationErrors: cache.validationErrors,
    isCacheActive: cache.lastUpdateAttempt !== null,
  };
}

/**
 * Developer Verification Command
 * Call via: window.__MLBB_META_DEV__.verifySources()
 */
export async function verifySourcesDevCommand(options: {
  allowNetwork?: boolean;
} = {}): Promise<OverallVerificationSummary> {
  const summary = await runAllSourcesVerification(options);
  const text = formatVerificationReportText(summary);
  console.log(text);
  return summary;
}

// Attach developer helper to window for browser devtools access
if (typeof window !== 'undefined') {
  (window as any).__MLBB_META_DEV__ = {
    verifySources: verifySourcesDevCommand,
    runTests: async () => {
      const suite = await runVerificationTestSuite();
      console.table(suite.results);
      console.log(`Test Suite Finished: ${suite.passedTests}/${suite.totalTests} passed.`);
      return suite;
    },
    getReport: getDevInspectionReport,
    syncNow: () => metaCacheManager.syncAllSources(),
    clearCache: () => metaCacheManager.clearCache(),
    registry: dataSourceRegistry,
    cache: metaCacheManager,
    repository: metaRepository,
    testImportPipeline: async () => {
      const suite = await runImportPipelineTestSuite();
      console.table(suite.results);
      console.log(`Import Pipeline Test Suite Finished: ${suite.passedTests}/${suite.totalTests} passed.`);
      return suite;
    },
    testMetrics: async () => {
      const suite = await runMetricsTestSuite();
      console.table(suite.results);
      console.log(
        `%cMeta Metrics Test Suite: ${suite.passedTests}/${suite.totalTests} tests passed (${suite.allPassed ? 'ALL PASS' : 'SOME FAILED'}).`,
        suite.allPassed ? 'color: #10b981; font-weight: bold;' : 'color: #ef4444; font-weight: bold;'
      );
      return suite;
    },
    inspectMetrics: (heroId: string, filters?: MetricFilterOptions) => {
      const res = metaMetricsService.getHeroMetrics(heroId, filters);
      console.log(`[Meta Metrics Inspector] Hero: ${heroId}`);
      console.dir(res);
      return res;
    },
    metricsService: metaMetricsService,
    testSignals: async () => {
      const suite = await runSignalsTestSuite();
      console.table(suite.results);
      console.log(
        `%cMeta Signals Test Suite: ${suite.passedTests}/${suite.totalTests} tests passed (${suite.allPassed ? 'ALL PASS' : 'SOME FAILED'}).`,
        suite.allPassed ? 'color: #10b981; font-weight: bold;' : 'color: #ef4444; font-weight: bold;'
      );
      return suite;
    },
    inspectSignals: (heroId: string, filters?: SignalFilterOptions) => {
      const res = metaSignalService.getHeroSignals(heroId, filters);
      console.log(`[Meta Signals Inspector] Hero: ${heroId}`);
      console.dir(res);
      return res;
    },
    signalsService: metaSignalService,
    testPriority: async () => {
      const suite = await runPriorityTestSuite();
      console.table(suite.results);
      console.log(
        `%cMeta Priority Test Suite: ${suite.passedTests}/${suite.totalTests} tests passed (${suite.allPassed ? 'ALL PASS' : 'SOME FAILED'}).`,
        suite.allPassed ? 'color: #10b981; font-weight: bold;' : 'color: #ef4444; font-weight: bold;'
      );
      return suite;
    },
    inspectPriority: (heroId: string, filters?: PriorityFilterOptions) => {
      const res = metaPriorityService.getHeroPriority(heroId, filters);
      console.log(`[Meta Priority Inspector] Hero: ${heroId}`);
      console.log(`Meta Priority Score: ${res.metaPriorityScore}/100 | Confidence: ${res.confidence} | Fallback: ${res.fallbackStatus}`);
      console.dir(res);
      return res;
    },
    priorityService: metaPriorityService,
    importRankedJson,
    importProJson,
    importRankedCsv,
    importProCsv,
  };
}
