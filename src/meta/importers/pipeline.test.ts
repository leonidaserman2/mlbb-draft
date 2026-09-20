import { importRankedJson, importProJson } from './jsonImporter';
import { importRankedCsv, importProCsv } from './csvImporter';
import { RankedRepository } from '../repository/rankedRepository';
import { ProRepository } from '../repository/proRepository';
import { metaRepository } from '../repository/metaRepository';
import { metaCacheManager } from '../cache/metaCache';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';

export interface ImportPipelineTestResult {
  scenarioId: number;
  scenarioName: string;
  passed: boolean;
  expectedOutcome: string;
  observedOutcome: string;
  details?: any;
}

export interface ImportTestSuiteSummary {
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: ImportPipelineTestResult[];
}

/**
 * Runs the 10-scenario Import Pipeline & Repository Test Suite
 */
export async function runImportPipelineTestSuite(): Promise<ImportTestSuiteSummary> {
  const results: ImportPipelineTestResult[] = [];
  const activePatch = ACTIVE_PATCH_CONFIG.activePatch;

  // ----------------------------------------------------
  // SCENARIO 1: JSON Ranked Import
  // ----------------------------------------------------
  try {
    const testRepo = new RankedRepository();
    const rankedJson = [
      {
        heroId: 'fanny',
        patch: activePatch,
        rankScope: 'MYTHIC_PLUS',
        region: 'GLOBAL',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-15',
        matches: 12000,
        picks: 12000,
        bans: 18500,
        wins: 6480,
        losses: 5520,
      },
    ];

    const importRes = importRankedJson(rankedJson, {
      source: 'Test Ranked Source',
      sourceUrl: 'https://test.ranked/data',
      patch: activePatch,
      region: 'GLOBAL',
      isDemo: false,
    }, { saveToRepository: false });

    // Insert into isolated test repository
    testRepo.insert(importRes.importedRecords![0]);

    const passed = importRes.status === 'SUCCESS' &&
      importRes.recordsAccepted === 1 &&
      testRepo.count() === 1 &&
      testRepo.getLatest().length === 1 &&
      testRepo.getLatest()[0].heroId === 'fanny' &&
      testRepo.getLatest()[0].winRate === 54; // 6480 / 12000 = 54%

    results.push({
      scenarioId: 1,
      scenarioName: 'JSON Ranked Import',
      passed,
      expectedOutcome: 'Valid Ranked JSON parsed, normalized, winRate computed accurately, stored in repository.',
      observedOutcome: passed
        ? `SUCCESS: 1 accepted, winRate: ${testRepo.getLatest()[0]?.winRate}%, hero: ${testRepo.getLatest()[0]?.heroId}`
        : `FAILED: status=${importRes.status}, errors=${importRes.validationErrors.join(', ')}`,
    });
  } catch (err: any) {
    results.push({
      scenarioId: 1,
      scenarioName: 'JSON Ranked Import',
      passed: false,
      expectedOutcome: 'Ranked JSON parsed and normalized without throwing.',
      observedOutcome: `Exception: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // SCENARIO 2: CSV Ranked Import
  // ----------------------------------------------------
  try {
    const testRepo = new RankedRepository();
    const csvContent = `heroId,patch,rankScope,region,periodStart,periodEnd,matches,picks,bans,wins,losses
tigreal,${activePatch},Mythic,ID,2026-09-01,2026-09-15,10000,10000,3000,5200,4800
ling,${activePatch},MYTHIC_PLUS,GLOBAL,2026-09-01,2026-09-15,8000,8000,7500,4400,3600`;

    const importRes = importRankedCsv(csvContent, {
      source: 'Community CSV Export',
      patch: activePatch,
      isDemo: false,
    }, { saveToRepository: false });

    for (const rec of importRes.importedRecords || []) {
      testRepo.insert(rec);
    }

    const passed = importRes.status === 'SUCCESS' &&
      importRes.recordsAccepted === 2 &&
      testRepo.count() === 2 &&
      testRepo.getByHero('tigreal').length === 1 &&
      testRepo.getByHero('ling').length === 1;

    results.push({
      scenarioId: 2,
      scenarioName: 'CSV Ranked Import',
      passed,
      expectedOutcome: 'CSV rows parsed, coerced, normalized, and correctly indexed.',
      observedOutcome: passed
        ? `SUCCESS: 2 records accepted from CSV, tigreal winRate=${testRepo.getByHero('tigreal')[0]?.winRate}%`
        : `FAILED: status=${importRes.status}, errors=${importRes.validationErrors.join(', ')}`,
    });
  } catch (err: any) {
    results.push({
      scenarioId: 2,
      scenarioName: 'CSV Ranked Import',
      passed: false,
      expectedOutcome: 'Ranked CSV parsed and normalized.',
      observedOutcome: `Exception: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // SCENARIO 3: Pro JSON Import
  // ----------------------------------------------------
  try {
    const testRepo = new ProRepository();
    const proJson = [
      {
        heroId: 'benedetta',
        patch: activePatch,
        tournament: 'MPL ID S14',
        season: 'S14',
        region: 'ID',
        team: 'Fnatic ONIC',
        role: 'EXP Lane',
        side: 'BLUE',
        picked: true,
        banned: false,
        win: true,
        matchId: 'MPL_ID_S14_W1_G1',
        matchDate: '2026-09-10',
      },
      {
        heroId: 'harith',
        patch: activePatch,
        tournament: 'MPL ID S14',
        season: 'S14',
        region: 'ID',
        team: 'RRQ Hoshi',
        role: 'Gold Lane',
        side: 'RED',
        picked: true,
        banned: false,
        win: false,
        matchId: 'MPL_ID_S14_W1_G1',
        matchDate: '2026-09-10',
      },
    ];

    const importRes = importProJson(proJson, {
      source: 'MPL Official Logs',
      patch: activePatch,
      isDemo: false,
    }, { saveToRepository: false });

    for (const rec of importRes.importedRecords || []) {
      testRepo.insert(rec);
    }

    const blueBenedetta = testRepo.query({ heroId: 'benedetta', side: 'BLUE' });
    const redHarith = testRepo.query({ heroId: 'harith', side: 'RED' });

    const passed = importRes.status === 'SUCCESS' &&
      importRes.recordsAccepted === 2 &&
      blueBenedetta.length === 1 &&
      blueBenedetta[0].side === 'BLUE' &&
      redHarith.length === 1 &&
      redHarith[0].side === 'RED';

    results.push({
      scenarioId: 3,
      scenarioName: 'Pro JSON Import',
      passed,
      expectedOutcome: 'Pro match records parsed with tournament, matchId, team, and side (BLUE/RED) preserved.',
      observedOutcome: passed
        ? `SUCCESS: 2 pro records accepted, BLUE/RED sides distinct and preserved.`
        : `FAILED: status=${importRes.status}, errors=${importRes.validationErrors.join(', ')}`,
    });
  } catch (err: any) {
    results.push({
      scenarioId: 3,
      scenarioName: 'Pro JSON Import',
      passed: false,
      expectedOutcome: 'Pro JSON parsed and normalized.',
      observedOutcome: `Exception: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // SCENARIO 4: Duplicate Prevention
  // ----------------------------------------------------
  try {
    const testRepo = new RankedRepository();
    const duplicateJson = [
      {
        heroId: 'akai',
        patch: activePatch,
        rankScope: 'MYTHIC_PLUS',
        region: 'GLOBAL',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-10',
        matches: 5000,
        picks: 5000,
        bans: 1000,
        wins: 2600,
        losses: 2400,
      },
    ];

    // First import
    const res1 = importRankedJson(duplicateJson, {
      source: 'Dedup Source',
      patch: activePatch,
      isDemo: false,
    }, { saveToRepository: false });
    testRepo.insert(res1.importedRecords![0]);

    // Second import identical
    const insertRes2 = testRepo.insert(res1.importedRecords![0]);

    const passed = testRepo.count() === 1 && insertRes2.isDuplicate === true && insertRes2.success === false;

    results.push({
      scenarioId: 4,
      scenarioName: 'Duplicate Prevention',
      passed,
      expectedOutcome: 'Deterministic ID prevents identical record from being stored twice.',
      observedOutcome: passed
        ? `SUCCESS: Duplicate record cleanly rejected. Repository count remained 1 (isDuplicate=true).`
        : `FAILED: Duplicate was inserted. Repository count=${testRepo.count()}`,
    });
  } catch (err: any) {
    results.push({
      scenarioId: 4,
      scenarioName: 'Duplicate Prevention',
      passed: false,
      expectedOutcome: 'Duplicate record rejected.',
      observedOutcome: `Exception: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // SCENARIO 5: Unknown Hero Rejection
  // ----------------------------------------------------
  try {
    const invalidHeroJson = [
      {
        heroId: 'invoker_dota', // Non-MLBB hero
        patch: activePatch,
        rankScope: 'MYTHIC_PLUS',
        region: 'GLOBAL',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-10',
        matches: 1000,
        picks: 1000,
        bans: 200,
        wins: 500,
        losses: 500,
      },
    ];

    const importRes = importRankedJson(invalidHeroJson, {
      source: 'Test Source',
      patch: activePatch,
      isDemo: false,
    }, { saveToRepository: false });

    const passed = importRes.recordsAccepted === 0 &&
      importRes.recordsRejected === 1 &&
      importRes.unknownHeroes.includes('invoker_dota');

    results.push({
      scenarioId: 5,
      scenarioName: 'Unknown Hero Rejection',
      passed,
      expectedOutcome: 'Heroes not in Phase 1 roster are flagged in unknownHeroes and rejected.',
      observedOutcome: passed
        ? `SUCCESS: Unknown hero "invoker_dota" rejected. unknownHeroes=[${importRes.unknownHeroes.join(', ')}].`
        : `FAILED: Unknown hero was accepted. recordsAccepted=${importRes.recordsAccepted}`,
    });
  } catch (err: any) {
    results.push({
      scenarioId: 5,
      scenarioName: 'Unknown Hero Rejection',
      passed: false,
      expectedOutcome: 'Unknown hero rejected.',
      observedOutcome: `Exception: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // SCENARIO 6: Patch Mismatch
  // ----------------------------------------------------
  try {
    const olderPatch = '2.2.14';
    const mismatchJson = [
      {
        heroId: 'nolan',
        patch: olderPatch,
        rankScope: 'MYTHIC_PLUS',
        region: 'GLOBAL',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-15',
        matches: 3000,
        picks: 3000,
        bans: 1200,
        wins: 1600,
        losses: 1400,
      },
    ];

    const importRes = importRankedJson(mismatchJson, {
      source: 'Archive Source',
      patch: olderPatch,
      isDemo: false,
    }, { saveToRepository: false });

    const rec = importRes.importedRecords?.[0];
    const passed = importRes.status === 'PATCH_MISMATCH' &&
      importRes.patchMismatch === true &&
      rec?.isHistorical === true &&
      rec?.patch === olderPatch;

    results.push({
      scenarioId: 6,
      scenarioName: 'Patch Mismatch',
      passed,
      expectedOutcome: 'Records with patch != activePatch return PATCH_MISMATCH status and marked historical.',
      observedOutcome: passed
        ? `SUCCESS: Status PATCH_MISMATCH returned. isHistorical=true, patch preserved as ${olderPatch}.`
        : `FAILED: Status was ${importRes.status}, patchMismatch=${importRes.patchMismatch}`,
    });
  } catch (err: any) {
    results.push({
      scenarioId: 6,
      scenarioName: 'Patch Mismatch',
      passed: false,
      expectedOutcome: 'Patch mismatch handled without mutation.',
      observedOutcome: `Exception: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // SCENARIO 7: Demo Data Rejection
  // ----------------------------------------------------
  try {
    const demoPayload = [
      {
        heroId: 'layla',
        patch: activePatch,
        rankScope: 'GLOBAL',
        region: 'GLOBAL',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-10',
        matches: 9999,
        picks: 9999,
        bans: 1,
        wins: 5000,
        losses: 4999,
        _sourceTag: 'DEMO_ONLY',
      },
    ];

    const importRes = importRankedJson(demoPayload, {
      source: 'Synthetic Demo Source',
      patch: activePatch,
      isDemo: true, // Tagged DEMO
    });

    const passed = importRes.status === 'FAILED' &&
      importRes.recordsAccepted === 0 &&
      importRes.validationErrors.some((e) => e.includes('DEMO_ONLY'));

    results.push({
      scenarioId: 7,
      scenarioName: 'Demo Data Rejection',
      passed,
      expectedOutcome: 'Data with isDemo=true or DEMO_ONLY tag blocked from production repository.',
      observedOutcome: passed
        ? `SUCCESS: Demo dataset blocked from production. recordsAccepted=0, status=FAILED.`
        : `FAILED: Demo data was accepted. recordsAccepted=${importRes.recordsAccepted}`,
    });
  } catch (err: any) {
    results.push({
      scenarioId: 7,
      scenarioName: 'Demo Data Rejection',
      passed: false,
      expectedOutcome: 'Demo data rejected.',
      observedOutcome: `Exception: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // SCENARIO 8: Provenance Preservation
  // ----------------------------------------------------
  try {
    const jsonItem = [
      {
        heroId: 'chou',
        patch: activePatch,
        rankScope: 'MYTHIC_PLUS',
        region: 'ID',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-10',
        matches: 5000,
        picks: 5000,
        bans: 2000,
        wins: 2550,
        losses: 2450,
        sourceUrl: 'https://community.archive/chou-stats',
      },
    ];

    const importRes = importRankedJson(jsonItem, {
      source: 'Verified Community Log',
      sourceUrl: 'https://community.archive/chou-stats',
      patch: activePatch,
      isDemo: false,
    }, { saveToRepository: false });

    const rec = importRes.importedRecords?.[0];
    const passed = rec !== undefined &&
      rec.source === 'Verified Community Log' &&
      rec.sourceUrl === 'https://community.archive/chou-stats' &&
      rec.patch === activePatch &&
      rec.periodStart === '2026-09-01' &&
      rec.periodEnd === '2026-09-10' &&
      Boolean(rec.importedAt) &&
      rec.originalRecordId === 'chou';

    results.push({
      scenarioId: 8,
      scenarioName: 'Provenance Preservation',
      passed,
      expectedOutcome: 'Record preserves source, sourceUrl, importedAt, originalRecordId, patch, periodStart/End.',
      observedOutcome: passed
        ? `SUCCESS: Full provenance preserved (source: ${rec?.source}, importedAt: ${rec?.importedAt}, originalId: ${rec?.originalRecordId}).`
        : `FAILED: Provenance fields missing or mutated.`,
    });
  } catch (err: any) {
    results.push({
      scenarioId: 8,
      scenarioName: 'Provenance Preservation',
      passed: false,
      expectedOutcome: 'Provenance fields preserved.',
      observedOutcome: `Exception: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // SCENARIO 9: Historical Patch Storage
  // ----------------------------------------------------
  try {
    const testRepo = new RankedRepository();
    const oldPatch = '2.2.10';

    const oldRecordJson = [
      {
        heroId: 'gusion',
        patch: oldPatch,
        rankScope: 'MYTHIC_PLUS',
        region: 'GLOBAL',
        periodStart: '2026-05-01',
        periodEnd: '2026-05-15',
        matches: 1000,
        picks: 1000,
        bans: 500,
        wins: 510,
        losses: 490,
      },
    ];

    const importRes = importRankedJson(oldRecordJson, {
      source: 'Old Historical Archive',
      patch: oldPatch,
      isDemo: false,
    }, { saveToRepository: false });

    testRepo.insert(importRes.importedRecords![0]);

    // getLatest() should return 0 because activePatch is 2.2.16
    const latest = testRepo.getLatest();
    // getByPatch('2.2.10') should return 1
    const historical = testRepo.getByPatch(oldPatch);

    const passed = latest.length === 0 && historical.length === 1 && historical[0].isHistorical === true;

    results.push({
      scenarioId: 9,
      scenarioName: 'Historical Patch Storage',
      passed,
      expectedOutcome: 'Historical patch stored in repository but excluded from active patch getLatest().',
      observedOutcome: passed
        ? `SUCCESS: getLatest() count=0 (not active), getByPatch('${oldPatch}') count=1 (isHistorical=true).`
        : `FAILED: latest.length=${latest.length}, historical.length=${historical.length}`,
    });
  } catch (err: any) {
    results.push({
      scenarioId: 9,
      scenarioName: 'Historical Patch Storage',
      passed: false,
      expectedOutcome: 'Historical patch isolated from active queries.',
      observedOutcome: `Exception: ${err?.message}`,
    });
  }

  // ----------------------------------------------------
  // SCENARIO 10: Cache Retrieval
  // ----------------------------------------------------
  try {
    const status = metaRepository.getStatus();
    const cache = metaCacheManager.getCache();

    // Cache retrieval differentiates statuses: LIVE, CACHED, STALE_CACHE, NO_DATA
    const validStatuses = ['LIVE', 'CACHED', 'STALE_CACHE', 'NO_DATA'];
    const passed = validStatuses.includes(status.overallStatus) &&
      typeof status.isStale === 'boolean' &&
      cache !== null;

    results.push({
      scenarioId: 10,
      scenarioName: 'Cache Retrieval',
      passed,
      expectedOutcome: 'Repository evaluates cache distinguishing LIVE, CACHED, STALE_CACHE, NO_DATA.',
      observedOutcome: passed
        ? `SUCCESS: Cache status resolved as "${status.overallStatus}", isStale=${status.isStale}.`
        : `FAILED: Invalid cache status resolved: ${status.overallStatus}`,
    });
  } catch (err: any) {
    results.push({
      scenarioId: 10,
      scenarioName: 'Cache Retrieval',
      passed: false,
      expectedOutcome: 'Cache retrieval evaluated cleanly.',
      observedOutcome: `Exception: ${err?.message}`,
    });
  }

  const passedTests = results.filter((r) => r.passed).length;

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedTests,
    failedTests: results.length - passedTests,
    results,
  };
}
