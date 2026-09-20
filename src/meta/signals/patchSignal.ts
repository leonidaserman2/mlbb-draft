import { patchRepository, PatchRepository } from '../repository/patchRepository';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';
import { PatchSignal, PatchSignalType } from './types';
import { PatchHeroChange } from '../types/snapshot';

/**
 * Computes Patch Change Signal for a specific hero and patch version
 * Distinguishes: BUFF | NERF | ADJUSTMENT | NO_CHANGE | UNKNOWN
 * IMPORTANT: Buff is NOT automatic proof of meta status; Nerf is not automatic proof of weakness.
 */
export function computePatchSignal(
  heroId: string,
  targetPatch?: string,
  repository: PatchRepository = patchRepository,
  explicitChange?: PatchHeroChange
): PatchSignal {
  const cleanId = heroId.toLowerCase().trim();
  const patchVersion = targetPatch || ACTIVE_PATCH_CONFIG.activePatch;

  const disclaimer =
    'Patch adjustments represent developer tuning; a BUFF does not guarantee high meta priority, and a NERF does not guarantee low viability.';

  // 1. If explicit change is passed (for direct testing or isolated calculation)
  if (explicitChange) {
    let change: PatchSignalType = 'UNKNOWN';
    if (explicitChange.changeType === 'BUFF') change = 'BUFF';
    else if (explicitChange.changeType === 'NERF') change = 'NERF';
    else if (explicitChange.changeType === 'ADJUST' || explicitChange.changeType === 'REVAMP') change = 'ADJUSTMENT';

    return {
      heroId: cleanId,
      patch: patchVersion,
      change,
      description: explicitChange.description || null,
      attributeChanges: explicitChange.attributeChanges,
      notes: `${change} applied in patch ${patchVersion}. ${disclaimer}`,
    };
  }

  // 2. Query repository
  const patchData = repository.getByPatch(patchVersion);

  if (!patchData) {
    return {
      heroId: cleanId,
      patch: patchVersion,
      change: 'UNKNOWN',
      description: null,
      notes: `No verified patch notes registered for patch ${patchVersion} in repository. ${disclaimer}`,
    };
  }

  // Find hero in patch changes
  const heroChange = patchData.changes?.find(
    (c) => c.heroId?.toLowerCase().trim() === cleanId
  );

  if (!heroChange) {
    return {
      heroId: cleanId,
      patch: patchVersion,
      change: 'NO_CHANGE',
      description: null,
      notes: `Hero was not adjusted in patch ${patchVersion}. ${disclaimer}`,
    };
  }

  let change: PatchSignalType = 'ADJUSTMENT';
  if (heroChange.changeType === 'BUFF') {
    change = 'BUFF';
  } else if (heroChange.changeType === 'NERF') {
    change = 'NERF';
  } else if (heroChange.changeType === 'ADJUST' || heroChange.changeType === 'REVAMP') {
    change = 'ADJUSTMENT';
  }

  return {
    heroId: cleanId,
    patch: patchVersion,
    change,
    description: heroChange.description || null,
    attributeChanges: heroChange.attributeChanges,
    notes: `${change} recorded for ${cleanId} in patch ${patchVersion}: ${heroChange.description || 'Stat/skill adjustment.'} ${disclaimer}`,
  };
}
