import { MLBB_Rank, TeamColor } from '../types/draft';

export interface RankBanPhaseConfig {
  phaseIndex: number;
  bansPerTeam: number;
  slotStartIndex: number;
  label: string;
}

export interface RankRuleConfig {
  rank: MLBB_Rank;
  displayName: string;
  totalBansPerTeam: number;
  banPhases: RankBanPhaseConfig[];
  hasMidDraftBan: boolean;
  description: string;
  badgeColor: string;
}

export interface SnakePickStep {
  pickNumber: number; // 1 to 10
  teamColor: TeamColor;
  slotIndex: number; // 0 to 4
  label: string;
}

export const RANKED_TIMER_CONFIG = {
  ban: 35,
  pick: 35,
  reveal: 5,
};

export const SNAKE_PICK_SEQUENCE: SnakePickStep[] = [
  { pickNumber: 1, teamColor: 'BLUE', slotIndex: 0, label: 'Pick 1 (Blue)' },
  { pickNumber: 2, teamColor: 'RED', slotIndex: 0, label: 'Pick 2 (Red)' },
  { pickNumber: 3, teamColor: 'RED', slotIndex: 1, label: 'Pick 3 (Red)' },
  { pickNumber: 4, teamColor: 'BLUE', slotIndex: 1, label: 'Pick 4 (Blue)' },
  { pickNumber: 5, teamColor: 'BLUE', slotIndex: 2, label: 'Pick 5 (Blue)' },
  { pickNumber: 6, teamColor: 'RED', slotIndex: 2, label: 'Pick 6 (Red)' },
  // If rank has mid-draft ban (Mythic+), BAN PHASE 2 occurs here
  { pickNumber: 7, teamColor: 'RED', slotIndex: 3, label: 'Pick 7 (Red)' },
  { pickNumber: 8, teamColor: 'BLUE', slotIndex: 3, label: 'Pick 8 (Blue)' },
  { pickNumber: 9, teamColor: 'BLUE', slotIndex: 4, label: 'Pick 9 (Blue)' },
  { pickNumber: 10, teamColor: 'RED', slotIndex: 4, label: 'Pick 10 (Red)' },
];

export const rankedRules: Record<MLBB_Rank, RankRuleConfig> = {
  EPIC: {
    rank: 'EPIC',
    displayName: 'Epic',
    totalBansPerTeam: 3,
    banPhases: [
      { phaseIndex: 0, bansPerTeam: 3, slotStartIndex: 0, label: 'Ban Phase (3 Bans per team)' },
    ],
    hasMidDraftBan: false,
    description: '3 Blind Bans per team (6 total), followed by 10 Snake Picks.',
    badgeColor: '#10b981',
  },
  LEGEND: {
    rank: 'LEGEND',
    displayName: 'Legend',
    totalBansPerTeam: 4,
    banPhases: [
      { phaseIndex: 0, bansPerTeam: 4, slotStartIndex: 0, label: 'Ban Phase (4 Bans per team)' },
    ],
    hasMidDraftBan: false,
    description: '4 Blind Bans per team (8 total), followed by 10 Snake Picks.',
    badgeColor: '#f59e0b',
  },
  MYTHIC: {
    rank: 'MYTHIC',
    displayName: 'Mythic',
    totalBansPerTeam: 5,
    banPhases: [
      { phaseIndex: 0, bansPerTeam: 5, slotStartIndex: 0, label: 'Ban Phase (5 Bans per team)' },
    ],
    hasMidDraftBan: false,
    description: '5 Blind Bans per team (10 total), followed by 10 Snake Picks.',
    badgeColor: '#ec4899',
  },
  MYTHICAL_HONOR: {
    rank: 'MYTHICAL_HONOR',
    displayName: 'Mythical Honor',
    totalBansPerTeam: 5,
    banPhases: [
      { phaseIndex: 0, bansPerTeam: 5, slotStartIndex: 0, label: 'Ban Phase (5 Bans per team)' },
    ],
    hasMidDraftBan: false,
    description: '5 Blind Bans per team (10 total), followed by 10 Snake Picks.',
    badgeColor: '#8b5cf6',
  },
  MYTHICAL_GLORY: {
    rank: 'MYTHICAL_GLORY',
    displayName: 'Mythical Glory',
    totalBansPerTeam: 5,
    banPhases: [
      { phaseIndex: 0, bansPerTeam: 5, slotStartIndex: 0, label: 'Ban Phase (5 Bans per team)' },
    ],
    hasMidDraftBan: false,
    description: '5 Blind Bans per team (10 total), followed by 10 Snake Picks.',
    badgeColor: '#ef4444',
  },
  MYTHICAL_IMMORTAL: {
    rank: 'MYTHICAL_IMMORTAL',
    displayName: 'Mythical Immortal',
    totalBansPerTeam: 5,
    banPhases: [
      { phaseIndex: 0, bansPerTeam: 5, slotStartIndex: 0, label: 'Ban Phase (5 Bans per team)' },
    ],
    hasMidDraftBan: false,
    description: '5 Blind Bans per team (10 total), followed by 10 Snake Picks.',
    badgeColor: '#eab308',
  },
};
