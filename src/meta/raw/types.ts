/**
 * RAW DATA LAYER
 * Represents data exactly as ingested from external APIs, match scrapers, or manual dumps.
 * Strictly no calculation or normalization applied here.
 */

export interface RawMLBBHubRankedHero {
  hero_key: string;       // e.g. "miya", "ling", "marcel"
  hero_title: string;     // e.g. "Miya", "Ling", "Marcel"
  patch_ver: string;      // e.g. "2.2.16"
  tier_bracket: string;   // e.g. "Mythic+", "All Ranks"
  server_region: string;  // e.g. "GLOBAL", "ID"
  sample_games: number;
  picks_total: number;
  bans_total: number;
  wins_total: number;
  losses_total: number;
  date_start: string;     // YYYY-MM-DD
  date_end: string;       // YYYY-MM-DD
  ingested_at: string;    // ISO timestamp
  origin_url: string;
}

export interface RawProMatchPayload {
  match_ref: string;
  league: string;         // e.g. "MPL Indonesia Season 14"
  game_date: string;      // YYYY-MM-DD
  hero_key: string;
  squad: string;          // e.g. "Fnatic ONIC"
  lane_role: string;
  map_side: 'BLUE' | 'RED';
  was_picked: boolean;
  was_banned: boolean;
  outcome: 'WIN' | 'LOSS';
  game_patch: string;
  geo_region: string;
  data_origin: string;
}

export interface RawPatchPayload {
  patch_label: string;
  deployment_date: string;
  source_channel: string;
  source_web_url: string;
  modifications: Array<{
    target_hero: string;
    action: 'BUFF' | 'NERF' | 'ADJUST' | 'REVAMP';
    summary: string;
    stat_deltas?: Record<string, { before: string | number; after: string | number }>;
  }>;
}
