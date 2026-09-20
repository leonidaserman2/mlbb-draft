import { HeroRole } from '../types/hero';
import manifestData from '../data/heroAssetManifest.json';

/**
 * Deterministic portrait paths for MLBB heroes.
 * Standard asset structure: `src/assets/heroes/${heroId}.png`
 */
export const getLocalHeroPortraitPath = (heroId: string): string => {
  return `src/assets/heroes/${heroId}.png`;
};

/**
 * Verified hero asset manifest mapping
 */
export interface HeroAssetInfo {
  heroId: string;
  heroName: string;
  success: boolean;
  localPath: string;
  sourceUrl?: string;
  bytes?: number;
  error?: string;
}

export const HERO_ASSET_MANIFEST: Record<string, HeroAssetInfo> = (manifestData as HeroAssetInfo[]).reduce(
  (acc, item) => {
    acc[item.heroId] = item;
    return acc;
  },
  {} as Record<string, HeroAssetInfo>
);

/**
 * Query local assets using Vite's eager import
 */
const localHeroAssets: Record<string, string> =
  typeof import.meta !== 'undefined' && typeof (import.meta as any).glob === 'function'
    ? (import.meta as any).glob('/src/assets/heroes/*.{png,webp,jpg,jpeg}', {
        eager: true,
        import: 'default',
      })
    : {};

/**
 * Deterministically resolves the exact hero portrait asset.
 * Guaranteed resolution order:
 * 1. Vite-bundled local asset `/src/assets/heroes/${heroId}.png` (or `.webp`)
 * 2. Verified official source URL from Moonton MLBB CDN
 */
export const resolveHeroAsset = (heroId: string): string | null => {
  const possiblePaths = [
    `/src/assets/heroes/${heroId}.png`,
    `/src/assets/heroes/${heroId}.webp`,
    `/src/assets/heroes/${heroId}.jpg`,
    `/src/assets/heroes/${heroId}.jpeg`,
  ];

  for (const p of possiblePaths) {
    if (localHeroAssets[p]) {
      return localHeroAssets[p];
    }
  }

  // Fallback to verified source URL in manifest if local import not resolved
  const manifestEntry = HERO_ASSET_MANIFEST[heroId];
  if (manifestEntry?.sourceUrl) {
    return manifestEntry.sourceUrl;
  }

  return null;
};

/**
 * Check if the asset is officially available for this hero
 */
export const isHeroAssetAvailable = (heroId: string): boolean => {
  return !!resolveHeroAsset(heroId);
};

/**
 * Color codes for MLBB roles to build high-contrast, professional UI indicators
 */
export const ROLE_THEME_COLORS: Record<
  HeroRole,
  { bg: string; border: string; text: string; badge: string; accent: string }
> = {
  Tank: {
    bg: 'from-amber-950/60 to-slate-900',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    accent: '#f59e0b',
  },
  Fighter: {
    bg: 'from-orange-950/60 to-slate-900',
    border: 'border-orange-500/40',
    text: 'text-orange-400',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    accent: '#f97316',
  },
  Assassin: {
    bg: 'from-purple-950/60 to-slate-900',
    border: 'border-purple-500/40',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    accent: '#a855f7',
  },
  Mage: {
    bg: 'from-sky-950/60 to-slate-900',
    border: 'border-sky-500/40',
    text: 'text-sky-400',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    accent: '#38bdf8',
  },
  Marksman: {
    bg: 'from-emerald-950/60 to-slate-900',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    accent: '#10b981',
  },
  Support: {
    bg: 'from-teal-950/60 to-slate-900',
    border: 'border-teal-500/40',
    text: 'text-teal-400',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    accent: '#14b8a6',
  },
};
