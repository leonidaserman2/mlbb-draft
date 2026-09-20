import { NormalizedPatchData } from '../normalized/types';
import { ACTIVE_PATCH_CONFIG } from '../config/patchConfig';

export class PatchRepository {
  private patches = new Map<string, NormalizedPatchData>();

  insert(patch: NormalizedPatchData): void {
    this.patches.set(patch.version, patch);
  }

  getByPatch(version: string): NormalizedPatchData | undefined {
    return this.patches.get(version);
  }

  getLatest(): NormalizedPatchData | undefined {
    return this.patches.get(ACTIVE_PATCH_CONFIG.activePatch) || Array.from(this.patches.values())[0];
  }

  getAll(): NormalizedPatchData[] {
    return Array.from(this.patches.values());
  }

  clear(): void {
    this.patches.clear();
  }

  count(): number {
    return this.patches.size;
  }
}

export const patchRepository = new PatchRepository();
