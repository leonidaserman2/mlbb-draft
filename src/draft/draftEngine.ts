import { ALL_MLBB_HEROES } from '../data/heroes';
import {
  DraftHistoryItem,
  DraftState,
  DraftTurn,
  MLBB_Rank,
  PickSide,
  TeamColor,
  TeamSide,
} from '../types/draft';
import { Hero } from '../types/hero';
import {
  RANKED_TIMER_CONFIG,
  rankedRules,
  SNAKE_PICK_SEQUENCE,
} from './rankedRules';

/**
 * Determine team side (OUR_TEAM or ENEMY_TEAM) given user's selected side and team color
 */
export const getTeamSide = (selectedSide: PickSide | null, color: TeamColor): TeamSide => {
  if (!selectedSide) return color === 'BLUE' ? 'OUR_TEAM' : 'ENEMY_TEAM';
  if (selectedSide === 'FIRST_PICK') {
    return color === 'BLUE' ? 'OUR_TEAM' : 'ENEMY_TEAM';
  } else {
    return color === 'RED' ? 'OUR_TEAM' : 'ENEMY_TEAM';
  }
};

/**
 * Calculate current turn object given state variables
 */
export const computeCurrentTurn = (
  phase: DraftState['currentPhase'],
  rank: MLBB_Rank | null,
  side: PickSide | null,
  banPhaseIndex: number,
  pickNumber: number,
  activeBanTarget: TeamColor
): DraftTurn => {
  if (phase === 'PRE_DRAFT' || !rank) {
    return {
      phase: 'PRE_DRAFT',
      action: 'BAN',
      activeTeamColor: 'BLUE',
      activeTeamSide: 'OUR_TEAM',
      slotIndex: 0,
      timeLimit: 0,
      label: 'Rank & Side Selection',
      isCompleted: false,
    };
  }

  if (phase === 'BAN_PHASE') {
    const rule = rankedRules[rank];
    const banPhaseConfig = rule.banPhases[banPhaseIndex] || rule.banPhases[0];
    const targetSide = getTeamSide(side, activeBanTarget);

    return {
      phase: 'BAN_PHASE',
      action: 'BAN',
      activeTeamColor: activeBanTarget,
      activeTeamSide: targetSide,
      slotIndex: banPhaseConfig.slotStartIndex,
      timeLimit: RANKED_TIMER_CONFIG.ban,
      label: `${banPhaseConfig.label} - Simultaneous Blind Bans`,
      isCompleted: false,
    };
  }

  if (phase === 'BAN_REVEAL') {
    return {
      phase: 'BAN_REVEAL',
      action: 'BAN',
      activeTeamColor: 'BLUE',
      activeTeamSide: 'OUR_TEAM',
      slotIndex: 0,
      timeLimit: RANKED_TIMER_CONFIG.reveal,
      label: 'Bans Revealed - Review Opponent Bans',
      isCompleted: false,
    };
  }

  if (phase === 'PICK_PHASE') {
    const pickStep = SNAKE_PICK_SEQUENCE.find(s => s.pickNumber === pickNumber) || SNAKE_PICK_SEQUENCE[0];
    const teamSide = getTeamSide(side, pickStep.teamColor);

    return {
      phase: 'PICK_PHASE',
      action: 'PICK',
      activeTeamColor: pickStep.teamColor,
      activeTeamSide: teamSide,
      slotIndex: pickStep.slotIndex,
      timeLimit: RANKED_TIMER_CONFIG.pick,
      label: `${pickStep.label} (${teamSide === 'OUR_TEAM' ? 'Our Team' : 'Enemy Team'})`,
      isCompleted: false,
    };
  }

  return {
    phase: 'DRAFT_COMPLETE',
    action: 'PICK',
    activeTeamColor: 'BLUE',
    activeTeamSide: 'OUR_TEAM',
    slotIndex: 4,
    timeLimit: 0,
    label: 'Draft Completed',
    isCompleted: true,
  };
};

/**
 * Initialize draft state
 */
export const createInitialDraftState = (
  rank: MLBB_Rank | null = null,
  side: PickSide | null = null
): DraftState => {
  if (!rank || !side) {
    return {
      selectedRank: null,
      selectedSide: null,
      currentPhase: 'PRE_DRAFT',
      currentBanPhaseIndex: 0,
      currentPickNumber: 1,
      currentTurn: computeCurrentTurn('PRE_DRAFT', null, null, 0, 1, 'BLUE'),
      timer: 0,
      isTimerRunning: false,
      totalBansPerTeam: 5,
      blueBans: Array(5).fill(null),
      redBans: Array(5).fill(null),
      hiddenBlueBans: Array(5).fill(null),
      hiddenRedBans: Array(5).fill(null),
      activeBanTargetTeam: 'BLUE',
      activeBanSlotIndex: null,
      isBanRevealed: false,
      bluePicks: Array(5).fill(null),
      redPicks: Array(5).fill(null),
      availableHeroes: [...ALL_MLBB_HEROES],
      draftHistory: [],
    };
  }

  const rule = rankedRules[rank];
  const totalBans = rule.totalBansPerTeam;
  const initialActiveTarget: TeamColor = side === 'FIRST_PICK' ? 'BLUE' : 'RED';

  return {
    selectedRank: rank,
    selectedSide: side,
    currentPhase: 'BAN_PHASE',
    currentBanPhaseIndex: 0,
    currentPickNumber: 1,
    currentTurn: computeCurrentTurn('BAN_PHASE', rank, side, 0, 1, initialActiveTarget),
    timer: RANKED_TIMER_CONFIG.ban,
    isTimerRunning: true,
    totalBansPerTeam: totalBans,
    blueBans: Array(totalBans).fill(null),
    redBans: Array(totalBans).fill(null),
    hiddenBlueBans: Array(totalBans).fill(null),
    hiddenRedBans: Array(totalBans).fill(null),
    activeBanTargetTeam: initialActiveTarget,
    activeBanSlotIndex: null,
    isBanRevealed: false,
    bluePicks: Array(5).fill(null),
    redPicks: Array(5).fill(null),
    availableHeroes: [...ALL_MLBB_HEROES],
    draftHistory: [],
  };
};

/**
 * Switch active ban input team (BLUE vs RED) and optional slot target during blind ban phase
 */
export const setActiveBanTargetTeam = (
  state: DraftState,
  targetTeam: TeamColor,
  slotIndex?: number | null
): DraftState => {
  if (state.currentPhase !== 'BAN_PHASE') return state;
  return {
    ...state,
    activeBanTargetTeam: targetTeam,
    activeBanSlotIndex: slotIndex !== undefined ? slotIndex : null,
    currentTurn: computeCurrentTurn(
      'BAN_PHASE',
      state.selectedRank,
      state.selectedSide,
      state.currentBanPhaseIndex,
      state.currentPickNumber,
      targetTeam
    ),
  };
};

/**
 * Handle hero selection during Blind Ban phase
 */
export const selectHeroForBlindBan = (
  state: DraftState,
  hero: Hero,
  targetTeam: TeamColor = state.activeBanTargetTeam,
  specificSlotIndex?: number
): DraftState => {
  if (state.currentPhase !== 'BAN_PHASE' || !state.selectedRank) return state;

  const rule = rankedRules[state.selectedRank];
  const banPhaseConfig = rule.banPhases[state.currentBanPhaseIndex];
  if (!banPhaseConfig) return state;

  const startIndex = banPhaseConfig.slotStartIndex;
  const endIndex = startIndex + banPhaseConfig.bansPerTeam;

  const isBlue = targetTeam === 'BLUE';
  const targetHidden = isBlue ? [...state.hiddenBlueBans] : [...state.hiddenRedBans];

  // If specific slot passed (or queued in state), use it; otherwise find first empty slot in current phase
  let targetSlot = specificSlotIndex ?? (state.activeBanSlotIndex ?? undefined);
  if (targetSlot === undefined || targetSlot < startIndex || targetSlot >= endIndex) {
    targetSlot = targetHidden.findIndex((h, idx) => idx >= startIndex && idx < endIndex && h === null);
  }

  // If this team is already full in this phase, check if other team still has empty slots
  let effectiveTeam = targetTeam;
  let newHiddenBlue = [...state.hiddenBlueBans];
  let newHiddenRed = [...state.hiddenRedBans];

  if (targetSlot === -1) {
    const otherTeam: TeamColor = isBlue ? 'RED' : 'BLUE';
    const otherHidden = isBlue ? newHiddenRed : newHiddenBlue;
    const otherEmptyIndex = otherHidden.findIndex((h, idx) => idx >= startIndex && idx < endIndex && h === null);

    if (otherEmptyIndex !== -1) {
      if (otherHidden.some((h, idx) => idx !== otherEmptyIndex && h?.id === hero.id)) {
        return state;
      }
      otherHidden[otherEmptyIndex] = hero;
      if (isBlue) {
        newHiddenRed = otherHidden;
      } else {
        newHiddenBlue = otherHidden;
      }

      const stillHasEmpty = otherHidden.some((h, idx) => idx >= startIndex && idx < endIndex && h === null);
      const nextActive = stillHasEmpty ? otherTeam : targetTeam;

      return {
        ...state,
        hiddenBlueBans: newHiddenBlue,
        hiddenRedBans: newHiddenRed,
        activeBanTargetTeam: nextActive,
        activeBanSlotIndex: null,
        currentTurn: computeCurrentTurn(
          'BAN_PHASE',
          state.selectedRank,
          state.selectedSide,
          state.currentBanPhaseIndex,
          state.currentPickNumber,
          nextActive
        ),
      };
    }

    // Both teams are full: replace the last slot
    targetSlot = endIndex - 1;
  }

  // Prevent duplicate within SAME team's bans
  if (targetHidden.some((h, idx) => idx !== targetSlot && h?.id === hero.id)) {
    return state;
  }

  targetHidden[targetSlot] = hero;

  if (isBlue) {
    newHiddenBlue = targetHidden;
  } else {
    newHiddenRed = targetHidden;
  }

  // If this team just became full, check if other team has empty slots and auto-switch
  const otherTeam: TeamColor = isBlue ? 'RED' : 'BLUE';
  const otherHidden = isBlue ? newHiddenRed : newHiddenBlue;
  const isThisTeamNowFull = targetHidden.slice(startIndex, endIndex).every((h) => h !== null);
  const otherHasEmpty = otherHidden.slice(startIndex, endIndex).some((h) => h === null);

  const nextActiveTeam = isThisTeamNowFull && otherHasEmpty ? otherTeam : targetTeam;

  return {
    ...state,
    hiddenBlueBans: newHiddenBlue,
    hiddenRedBans: newHiddenRed,
    activeBanTargetTeam: nextActiveTeam,
    activeBanSlotIndex: null,
    currentTurn: computeCurrentTurn(
      'BAN_PHASE',
      state.selectedRank,
      state.selectedSide,
      state.currentBanPhaseIndex,
      state.currentPickNumber,
      nextActiveTeam
    ),
  };
};

/**
 * Remove / Clear a specific hidden ban slot
 */
export const removeHeroFromBlindBan = (
  state: DraftState,
  targetTeam: TeamColor,
  slotIndex: number
): DraftState => {
  if (state.currentPhase !== 'BAN_PHASE') return state;

  if (targetTeam === 'BLUE') {
    const updated = [...state.hiddenBlueBans];
    updated[slotIndex] = null;
    return { ...state, hiddenBlueBans: updated };
  } else {
    const updated = [...state.hiddenRedBans];
    updated[slotIndex] = null;
    return { ...state, hiddenRedBans: updated };
  }
};

/**
 * Check if all required bans for the current ban phase are filled
 */
export const isCurrentBanPhaseFilled = (state: DraftState): boolean => {
  if (!state.selectedRank) return false;
  const rule = rankedRules[state.selectedRank];
  const banPhaseConfig = rule.banPhases[state.currentBanPhaseIndex];
  if (!banPhaseConfig) return false;

  const start = banPhaseConfig.slotStartIndex;
  const end = start + banPhaseConfig.bansPerTeam;

  const blueFilled = state.hiddenBlueBans.slice(start, end).every(h => h !== null);
  const redFilled = state.hiddenRedBans.slice(start, end).every(h => h !== null);

  return blueFilled && redFilled;
};

/**
 * Reveal the bans for the current ban phase
 */
export const revealCurrentBans = (state: DraftState): DraftState => {
  if (state.currentPhase !== 'BAN_PHASE' || !state.selectedRank) return state;

  const rule = rankedRules[state.selectedRank];
  const banPhaseConfig = rule.banPhases[state.currentBanPhaseIndex];
  const start = banPhaseConfig.slotStartIndex;
  const end = start + banPhaseConfig.bansPerTeam;

  const updatedBlueBans = [...state.blueBans];
  const updatedRedBans = [...state.redBans];
  const newHistory: DraftHistoryItem[] = [...state.draftHistory];

  const newlyBannedHeroIds = new Set<string>();

  for (let i = start; i < end; i++) {
    const blueHero = state.hiddenBlueBans[i];
    const redHero = state.hiddenRedBans[i];

    if (blueHero) {
      updatedBlueBans[i] = blueHero;
      newlyBannedHeroIds.add(blueHero.id);
      newHistory.push({
        id: `ban-blue-${i}-${Date.now()}-${Math.random()}`,
        stepNumber: newHistory.length + 1,
        phase: 'BAN_PHASE',
        teamColor: 'BLUE',
        teamSide: getTeamSide(state.selectedSide, 'BLUE'),
        action: 'BAN',
        slotIndex: i,
        hero: blueHero,
        isDuplicateBan: redHero?.id === blueHero.id,
        timestamp: Date.now(),
      });
    }

    if (redHero) {
      updatedRedBans[i] = redHero;
      newlyBannedHeroIds.add(redHero.id);
      newHistory.push({
        id: `ban-red-${i}-${Date.now()}-${Math.random()}`,
        stepNumber: newHistory.length + 1,
        phase: 'BAN_PHASE',
        teamColor: 'RED',
        teamSide: getTeamSide(state.selectedSide, 'RED'),
        action: 'BAN',
        slotIndex: i,
        hero: redHero,
        isDuplicateBan: blueHero?.id === redHero.id,
        timestamp: Date.now(),
      });
    }
  }

  // Remove banned heroes from available pool
  const updatedAvailable = state.availableHeroes.filter(
    h => !newlyBannedHeroIds.has(h.id)
  );

  return {
    ...state,
    currentPhase: 'BAN_REVEAL',
    isBanRevealed: true,
    blueBans: updatedBlueBans,
    redBans: updatedRedBans,
    availableHeroes: updatedAvailable,
    draftHistory: newHistory,
    timer: RANKED_TIMER_CONFIG.reveal,
    currentTurn: computeCurrentTurn(
      'BAN_REVEAL',
      state.selectedRank,
      state.selectedSide,
      state.currentBanPhaseIndex,
      state.currentPickNumber,
      'BLUE'
    ),
  };
};

/**
 * Transition from BAN_REVEAL to PICK_PHASE (or next step)
 */
export const proceedAfterBanReveal = (state: DraftState): DraftState => {
  if (state.currentPhase !== 'BAN_REVEAL' || !state.selectedRank) return state;

  return {
    ...state,
    currentPhase: 'PICK_PHASE',
    timer: RANKED_TIMER_CONFIG.pick,
    isTimerRunning: true,
    currentTurn: computeCurrentTurn(
      'PICK_PHASE',
      state.selectedRank,
      state.selectedSide,
      state.currentBanPhaseIndex,
      state.currentPickNumber,
      'BLUE'
    ),
  };
};

/**
 * Handle hero selection during PICK_PHASE
 */
export const selectHeroForPick = (state: DraftState, hero: Hero): DraftState => {
  if (state.currentPhase !== 'PICK_PHASE' || !state.selectedRank) return state;

  const currentPickStep = SNAKE_PICK_SEQUENCE.find(s => s.pickNumber === state.currentPickNumber);
  if (!currentPickStep) return state;

  const isBlue = currentPickStep.teamColor === 'BLUE';
  const slotIdx = currentPickStep.slotIndex;

  const updatedBluePicks = [...state.bluePicks];
  const updatedRedPicks = [...state.redPicks];

  if (isBlue) {
    updatedBluePicks[slotIdx] = hero;
  } else {
    updatedRedPicks[slotIdx] = hero;
  }

  // Remove hero from available
  const updatedAvailable = state.availableHeroes.filter(h => h.id !== hero.id);

  // Add to draft history
  const teamSide = getTeamSide(state.selectedSide, currentPickStep.teamColor);
  const newHistoryItem: DraftHistoryItem = {
    id: `pick-${state.currentPickNumber}-${Date.now()}`,
    stepNumber: state.draftHistory.length + 1,
    phase: 'PICK_PHASE',
    teamColor: currentPickStep.teamColor,
    teamSide,
    action: 'PICK',
    slotIndex: slotIdx,
    hero,
    timestamp: Date.now(),
  };

  const rule = rankedRules[state.selectedRank];

  // Check if mid-draft ban is required (Mythic+ after pick 6)
  if (rule.hasMidDraftBan && state.currentPickNumber === 6 && state.currentBanPhaseIndex === 0) {
    return {
      ...state,
      bluePicks: updatedBluePicks,
      redPicks: updatedRedPicks,
      availableHeroes: updatedAvailable,
      draftHistory: [...state.draftHistory, newHistoryItem],
      currentPhase: 'BAN_PHASE',
      currentBanPhaseIndex: 1,
      currentPickNumber: 7,
      isBanRevealed: false,
      activeBanTargetTeam: state.selectedSide === 'FIRST_PICK' ? 'BLUE' : 'RED',
      timer: RANKED_TIMER_CONFIG.ban,
      currentTurn: computeCurrentTurn(
        'BAN_PHASE',
        state.selectedRank,
        state.selectedSide,
        1,
        7,
        state.selectedSide === 'FIRST_PICK' ? 'BLUE' : 'RED'
      ),
    };
  }

  // Check if draft is finished (after 10 picks)
  if (state.currentPickNumber >= 10) {
    return {
      ...state,
      bluePicks: updatedBluePicks,
      redPicks: updatedRedPicks,
      availableHeroes: updatedAvailable,
      draftHistory: [...state.draftHistory, newHistoryItem],
      currentPhase: 'DRAFT_COMPLETE',
      isTimerRunning: false,
      timer: 0,
      currentTurn: computeCurrentTurn(
        'DRAFT_COMPLETE',
        state.selectedRank,
        state.selectedSide,
        state.currentBanPhaseIndex,
        10,
        'BLUE'
      ),
    };
  }

  // Advance to next pick
  const nextPickNumber = state.currentPickNumber + 1;
  return {
    ...state,
    bluePicks: updatedBluePicks,
    redPicks: updatedRedPicks,
    availableHeroes: updatedAvailable,
    draftHistory: [...state.draftHistory, newHistoryItem],
    currentPickNumber: nextPickNumber,
    timer: RANKED_TIMER_CONFIG.pick,
    currentTurn: computeCurrentTurn(
      'PICK_PHASE',
      state.selectedRank,
      state.selectedSide,
      state.currentBanPhaseIndex,
      nextPickNumber,
      'BLUE'
    ),
  };
};

/**
 * Universal hero selection router
 */
export const selectHero = (
  state: DraftState,
  hero: Hero,
  targetTeam?: TeamColor
): DraftState => {
  if (state.currentPhase === 'BAN_PHASE') {
    return selectHeroForBlindBan(
      state,
      hero,
      targetTeam || state.activeBanTargetTeam,
      state.activeBanSlotIndex ?? undefined
    );
  }
  if (state.currentPhase === 'PICK_PHASE') {
    return selectHeroForPick(state, hero);
  }
  return state;
};

/**
 * Undo last action
 */
export const undoLastAction = (state: DraftState): DraftState => {
  if (state.draftHistory.length === 0) return state;

  const lastItem = state.draftHistory[state.draftHistory.length - 1];
  const newHistory = state.draftHistory.slice(0, -1);

  if (lastItem.action === 'PICK') {
    const isBlue = lastItem.teamColor === 'BLUE';
    const updatedBluePicks = [...state.bluePicks];
    const updatedRedPicks = [...state.redPicks];

    if (isBlue) {
      updatedBluePicks[lastItem.slotIndex] = null;
    } else {
      updatedRedPicks[lastItem.slotIndex] = null;
    }

    const prevPickNumber = state.currentPhase === 'DRAFT_COMPLETE' ? 10 : Math.max(1, state.currentPickNumber - 1);

    // Return hero to available pool
    const updatedAvailable = [...state.availableHeroes, lastItem.hero];

    return {
      ...state,
      currentPhase: 'PICK_PHASE',
      bluePicks: updatedBluePicks,
      redPicks: updatedRedPicks,
      availableHeroes: updatedAvailable,
      draftHistory: newHistory,
      currentPickNumber: prevPickNumber,
      timer: RANKED_TIMER_CONFIG.pick,
      isTimerRunning: true,
      currentTurn: computeCurrentTurn(
        'PICK_PHASE',
        state.selectedRank,
        state.selectedSide,
        state.currentBanPhaseIndex,
        prevPickNumber,
        'BLUE'
      ),
    };
  }

  // Undo during ban phases
  if (lastItem.action === 'BAN') {
    // If undid ban reveal, revert to unrevealed state for that ban phase
    return createInitialDraftState(state.selectedRank, state.selectedSide);
  }

  return state;
};

/**
 * Timer tick helper
 */
export const tickTimer = (state: DraftState): DraftState => {
  if (!state.isTimerRunning || state.currentPhase === 'PRE_DRAFT' || state.currentPhase === 'DRAFT_COMPLETE') {
    return state;
  }

  if (state.timer > 1) {
    return { ...state, timer: state.timer - 1 };
  }

  // Timer reached 0
  if (state.currentPhase === 'BAN_PHASE') {
    // Auto-reveal if at least one ban or timer expired
    return revealCurrentBans(state);
  }

  if (state.currentPhase === 'BAN_REVEAL') {
    return proceedAfterBanReveal(state);
  }

  if (state.currentPhase === 'PICK_PHASE') {
    // Auto-pick first available hero to keep draft moving
    if (state.availableHeroes.length > 0) {
      return selectHeroForPick(state, state.availableHeroes[0]);
    }
  }

  return { ...state, timer: 0 };
};

/**
 * Toggle pause/run timer
 */
export const toggleTimer = (state: DraftState): DraftState => {
  return { ...state, isTimerRunning: !state.isTimerRunning };
};

/**
 * Manually set timer duration
 */
export const setTimerDuration = (state: DraftState, seconds: number): DraftState => {
  return { ...state, timer: Math.max(0, seconds) };
};
