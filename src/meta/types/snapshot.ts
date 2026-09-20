// MLBB Meta Data Infrastructure Types (Phase 2A)

export type SourceConfidence = 'official' | 'primary' | 'secondary' | 'community';

export type MetaMode = 'RANKED' | 'PRO';

export type RankScope = 
  | 'Epic'
  | 'Legend'
  | 'Mythic'
  | 'Mythical Honor'
  | 'Mythical Glory'
  | 'Mythical Immortal'
  | 'MYTHIC_PLUS'
  | 'GLOBAL';

export type MetaTimeframe = 
  | 'CURRENT_PATCH' 
  | 'LAST_7_DAYS' 
  | 'LAST_14_DAYS' 
  | 'LAST_30_DAYS' 
  | 'HISTORICAL';

/**
 * 1. Meta Snapshot Model
 * Unified snapshot representing hero performance metrics within a specific scope.
 */
export interface MetaSnapshot {
  id: string; // generated unique id `${heroId}_${patch}_${mode}_${region}_${rankScope}_${periodStart}`
  heroId: string;
  patch: string;
  mode: MetaMode;
  rankScope: string; // e.g. 'Epic', 'Legend', 'Mythic', 'Mythical Honor', 'Mythical Glory', 'Mythical Immortal', 'MYTHIC_PLUS', 'GLOBAL'
  region: string; // e.g. 'GLOBAL', 'ID', 'PH'
  periodStart: string; // ISO Date YYYY-MM-DD
  periodEnd: string;   // ISO Date YYYY-MM-DD
  source: string;
  matches: number;
  picks: number;
  bans: number;
  wins: number;
  losses: number;
  pickRate: number;     // 0 - 100 percentage
  banRate: number;      // 0 - 100 percentage
  winRate: number;      // 0 - 100 percentage
  presenceRate: number; // pickRate + banRate (0 - 100 percentage)
  sourceUrl: string;
  collectedAt: string;  // ISO timestamp
  confidence: SourceConfidence;
}

/**
 * 2. Pro Match Data Model
 * Granular individual match records for competitive pro tournaments.
 */
export interface ProMatchRecord {
  id: string; // e.g. match_${tournament}_${matchDate}_${gameIndex}_${heroId}
  heroId: string;
  patch: string;
  tournament: string; // e.g. 'MPL ID S14', 'MPL PH S14', 'M6 World Championship'
  season?: string;
  region: string;     // e.g. 'ID', 'PH', 'GLOBAL'
  team?: string;       // e.g. 'Fnatic ONIC', 'RRQ Hoshi', 'Team Liquid PH'
  role?: string;       // e.g. 'Jungler', 'Roamer', 'Gold Lane', 'EXP Lane', 'Mid Lane'
  side?: 'BLUE' | 'RED';
  picked: boolean;
  banned: boolean;
  win: boolean;
  matchId?: string;
  matchDate: string;  // ISO Date YYYY-MM-DD
  source: string;
  sourceUrl: string;
  collectedAt?: string;
}

/**
 * 3. Patch Data Model
 */
export type PatchHeroChangeType = 'BUFF' | 'NERF' | 'ADJUST' | 'REVAMP';

export interface PatchHeroChange {
  heroId: string;
  patch: string;
  changeType: PatchHeroChangeType;
  description: string;
  attributeChanges?: Record<string, { before: string | number; after: string | number }>;
}

export interface PatchData {
  patchId: string;
  version: string;
  releaseDate: string; // ISO Date YYYY-MM-DD
  changes: PatchHeroChange[];
  source: string;
  sourceUrl: string;
  collectedAt: string; // ISO timestamp
}

/**
 * Filter query for querying meta snapshots
 */
export interface MetaQueryFilter {
  patch?: string;
  timeframe?: MetaTimeframe;
  mode?: MetaMode;
  rankScope?: string;
  region?: string;
  heroId?: string;
}
