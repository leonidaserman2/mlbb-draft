import { Hero } from './hero';

export type MLBB_Rank = 
  | 'EPIC'
  | 'LEGEND'
  | 'MYTHIC'
  | 'MYTHICAL_HONOR'
  | 'MYTHICAL_GLORY'
  | 'MYTHICAL_IMMORTAL';

export type PickSide = 'FIRST_PICK' | 'SECOND_PICK';

export type TeamColor = 'BLUE' | 'RED';

export type TeamSide = 'OUR_TEAM' | 'ENEMY_TEAM';

export type DraftStatePhase = 
  | 'PRE_DRAFT'
  | 'BAN_PHASE'
  | 'BAN_REVEAL'
  | 'PICK_PHASE'
  | 'DRAFT_COMPLETE';

export type DraftActionType = 'BAN' | 'PICK';

export interface DraftTurn {
  phase: DraftStatePhase;
  action: DraftActionType;
  activeTeamColor: TeamColor;
  activeTeamSide: TeamSide;
  slotIndex: number;
  timeLimit: number;
  label: string;
  isCompleted: boolean;
}

export interface DraftHistoryItem {
  id: string;
  stepNumber: number;
  phase: DraftStatePhase;
  teamColor: TeamColor;
  teamSide: TeamSide;
  action: DraftActionType;
  slotIndex: number;
  hero: Hero;
  isDuplicateBan?: boolean;
  timestamp: number;
}

export interface DraftState {
  selectedRank: MLBB_Rank | null;
  selectedSide: PickSide | null;
  currentPhase: DraftStatePhase;
  currentBanPhaseIndex: number; // 0 for Phase 1, 1 for Phase 2 (Mythic+)
  currentPickNumber: number; // 1 through 10
  currentTurn: DraftTurn;
  timer: number;
  isTimerRunning: boolean;
  
  // Bans
  totalBansPerTeam: number;
  blueBans: (Hero | null)[];
  redBans: (Hero | null)[];
  hiddenBlueBans: (Hero | null)[];
  hiddenRedBans: (Hero | null)[];
  activeBanTargetTeam: TeamColor; // During blind ban, which team's slot user is filling
  activeBanSlotIndex?: number | null; // Optional targeted slot index
  isBanRevealed: boolean;

  // Picks
  bluePicks: (Hero | null)[];
  redPicks: (Hero | null)[];

  // Pool & History
  availableHeroes: Hero[];
  draftHistory: DraftHistoryItem[];
}
