import { MetaTimeframe } from '../types/snapshot';

export interface PatchConfiguration {
  activePatch: string;
  season: string;
  releaseDate: string;
  serverTarget: string;
  previousPatches: string[];
}

/**
 * Single source of truth for Active Patch in the application.
 * All meta records and filters reference this configuration.
 */
export const ACTIVE_PATCH_CONFIG: PatchConfiguration = {
  activePatch: '2.2.16',
  season: '42',
  releaseDate: '2026-09-08',
  serverTarget: 'Original Server',
  previousPatches: ['2.2.10', '2.2.04', '2.1.98', '2.1.80'],
};

/**
 * Timeframe date range calculator relative to active reference date
 */
export function calculateTimeframeDates(
  timeframe: MetaTimeframe,
  referenceDate: string = '2026-09-20'
): { start: string; end: string } {
  const ref = new Date(referenceDate);
  const end = ref.toISOString().split('T')[0];

  switch (timeframe) {
    case 'CURRENT_PATCH':
      return { start: ACTIVE_PATCH_CONFIG.releaseDate, end };
    case 'LAST_7_DAYS': {
      const d = new Date(ref);
      d.setDate(d.getDate() - 7);
      return { start: d.toISOString().split('T')[0], end };
    }
    case 'LAST_14_DAYS': {
      const d = new Date(ref);
      d.setDate(d.getDate() - 14);
      return { start: d.toISOString().split('T')[0], end };
    }
    case 'LAST_30_DAYS': {
      const d = new Date(ref);
      d.setDate(d.getDate() - 30);
      return { start: d.toISOString().split('T')[0], end };
    }
    case 'HISTORICAL':
    default:
      return { start: '2025-01-01', end };
  }
}
