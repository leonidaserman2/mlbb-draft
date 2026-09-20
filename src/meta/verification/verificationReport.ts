import {
  OverallVerificationSummary,
  SourceVerificationResult,
} from './verificationTypes';
import { verifySource } from './sourceVerifier';
import { dataSourceRegistry } from '../sources/registry';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';

/**
 * Runs verification across all registered meta data source adapters
 */
export async function runAllSourcesVerification(options: {
  allowNetwork?: boolean;
} = {}): Promise<OverallVerificationSummary> {
  const adapters = dataSourceRegistry.getAllAdapters();
  const results: SourceVerificationResult[] = [];

  for (const adapter of adapters) {
    const res = await verifySource(adapter, {
      allowNetwork: options.allowNetwork ?? true,
    });
    results.push(res);
  }

  const verifiedCount = results.filter((r) => r.status === 'VERIFIED').length;
  const partialCount = results.filter((r) => r.status === 'PARTIAL').length;
  const unavailableCount = results.filter((r) => r.status === 'UNAVAILABLE').length;
  const manualExternalCount = results.filter((r) => r.status === 'MANUAL_EXTERNAL').length;
  const invalidCount = results.filter((r) => r.status === 'INVALID').length;
  const demoDataDetected = results.some((r) => r.isDemoData);

  return {
    verifiedAt: new Date().toISOString(),
    activePatch: ACTIVE_PATCH_CONFIG.activePatch,
    totalSources: results.length,
    verifiedCount,
    partialCount,
    unavailableCount,
    manualExternalCount,
    invalidCount,
    demoDataDetectedInProduction: demoDataDetected,
    results,
  };
}

/**
 * Formats a clean, readable text report for developer console inspection
 */
export function formatVerificationReportText(summary: OverallVerificationSummary): string {
  const lines: string[] = [];
  lines.push('================================================================');
  lines.push('       PHASE 2A.5 — META DATA SOURCE VERIFICATION REPORT        ');
  lines.push('================================================================');
  lines.push(`Audit Timestamp: ${summary.verifiedAt}`);
  lines.push(`Active Patch:    ${summary.activePatch} (Target Season ${ACTIVE_PATCH_CONFIG.season})`);
  lines.push(`Total Sources:   ${summary.totalSources}`);
  lines.push(`Summary Counts:  VERIFIED: ${summary.verifiedCount} | PARTIAL: ${summary.partialCount} | UNAVAILABLE: ${summary.unavailableCount} | MANUAL_EXTERNAL: ${summary.manualExternalCount} | INVALID: ${summary.invalidCount}`);
  lines.push(`Demo Data Leak:  ${summary.demoDataDetectedInProduction ? 'CRITICAL ALERT (Demo Data in Prod!)' : 'CLEAN (No demo/mock in prod)'}`);
  lines.push('----------------------------------------------------------------');

  for (const r of summary.results) {
    lines.push(`\nSOURCE: ${r.source} (${r.sourceId})`);
    lines.push(`Category:      ${r.category}`);
    lines.push(`Status:        [${r.status}]`);
    lines.push(`Reachable:     ${r.reachable ? 'YES' : 'NO'}${r.httpStatus ? ` (HTTP ${r.httpStatus})` : ''}`);
    lines.push(`Source URL:    ${r.sourceUrl}`);
    lines.push(`Records:       Total: ${r.recordsReceived} | Valid: ${r.validRecords} | Invalid: ${r.invalidRecords} | Duplicates: ${r.duplicateRecords}`);
    lines.push(`Patch:         ${r.patchDetected || 'None detected'} (${r.patchStatus})`);
    lines.push(`Heroes:        Detected: ${r.heroesDetected.length} | Matched: ${r.rosterAudit.matchedHeroes.length} | Unknown: ${r.rosterAudit.unknownHeroes.length}`);
    if (r.rosterAudit.unknownHeroes.length > 0) {
      lines.push(`               Unknown: ${r.rosterAudit.unknownHeroes.join(', ')}`);
    }
    if (r.errors.length > 0) {
      lines.push('Errors/Notes:');
      r.errors.forEach((e) => lines.push(`  - ${e}`));
    }
  }

  lines.push('\n================================================================');
  return lines.join('\n');
}
