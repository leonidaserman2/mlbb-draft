import React, { useState, useEffect, useCallback } from 'react';
import { PickSide, MLBB_Rank, DraftState, TeamColor } from './types/draft';
import { Hero } from './types/hero';
import { ALL_MLBB_HEROES } from './data/heroes';
import {
  createInitialDraftState,
  selectHero,
  undoLastAction,
  tickTimer,
  toggleTimer,
  revealCurrentBans,
  proceedAfterBanReveal,
  setActiveBanTargetTeam,
  removeHeroFromBlindBan,
} from './draft/draftEngine';
import { rankedRules } from './draft/rankedRules';
import { DesktopTitleBar } from './components/DesktopTitleBar';
import { RankSelectionScreen } from './components/RankSelectionScreen';
import { DraftHeader } from './components/DraftHeader';
import { TeamDraftSection } from './components/TeamDraftSection';
import { HeroSelectionGrid } from './components/HeroSelectionGrid';
import { RecommendationPanel } from './components/RecommendationPanel';
import { DraftHistoryPanel } from './components/DraftHistoryPanel';
import { HeroAvatar } from './components/HeroAvatar';
import { soundFx, formatDraftPhase } from './utils/formatters';
import { Trophy, RotateCcw, Swords, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize draft when rank and side are chosen
  const handleStartDraft = (rank: MLBB_Rank, side: PickSide) => {
    soundFx.playSelect();
    const initial = createInitialDraftState(rank, side);
    setDraftState(initial);
  };

  // Reset or return to rank & side selection
  const handleResetDraft = () => {
    soundFx.playClick();
    setDraftState(null);
  };

  // Toggle audio
  const handleToggleSound = () => {
    const nextMuted = !isSoundMuted;
    setIsSoundMuted(nextMuted);
    soundFx.enabled = !nextMuted;
  };

  // Select hero for current turn or blind ban
  const handleSelectHero = useCallback(
    (hero: Hero) => {
      if (!draftState) return;
      const nextState = selectHero(draftState, hero);
      setDraftState(nextState);
    },
    [draftState]
  );

  // Undo last action
  const handleUndo = useCallback(() => {
    if (!draftState) return;
    const nextState = undoLastAction(draftState);
    setDraftState(nextState);
  }, [draftState]);

  // Toggle timer
  const handleToggleTimer = useCallback(() => {
    if (!draftState) return;
    setDraftState((prev) => (prev ? toggleTimer(prev) : null));
  }, [draftState]);

  // Reveal bans
  const handleRevealBans = useCallback(() => {
    if (!draftState) return;
    const nextState = revealCurrentBans(draftState);
    setDraftState(nextState);
  }, [draftState]);

  // Proceed after reveal
  const handleProceedAfterReveal = useCallback(() => {
    if (!draftState) return;
    const nextState = proceedAfterBanReveal(draftState);
    setDraftState(nextState);
  }, [draftState]);

  // Switch ban target during blind ban
  const handleSwitchBanTarget = useCallback((team: TeamColor, slotIndex?: number) => {
    soundFx.playClick();
    setDraftState((prev) => (prev ? setActiveBanTargetTeam(prev, team, slotIndex) : null));
  }, []);

  // Remove hero from blind ban
  const handleRemoveBan = useCallback((team: TeamColor, slotIndex: number) => {
    soundFx.playClick();
    setDraftState((prev) => (prev ? removeHeroFromBlindBan(prev, team, slotIndex) : null));
  }, []);

  // Timer Tick Interval
  useEffect(() => {
    if (!draftState?.isTimerRunning) return;

    const interval = setInterval(() => {
      setDraftState((prevState) => {
        if (!prevState || !prevState.isTimerRunning) return prevState;
        return tickTimer(prevState);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [draftState?.isTimerRunning]);

  const currentPhaseTitle = draftState?.selectedRank
    ? `${rankedRules[draftState.selectedRank].displayName} • ${formatDraftPhase(
        draftState.currentPhase,
        draftState.currentBanPhaseIndex,
        rankedRules[draftState.selectedRank].hasMidDraftBan
      )}`
    : undefined;

  return (
    <div
      id="mlbb-app-container"
      className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none"
    >
      {/* Windows Native Desktop Title Bar */}
      <DesktopTitleBar
        onReset={draftState ? handleResetDraft : undefined}
        isSoundMuted={isSoundMuted}
        onToggleSound={handleToggleSound}
        currentPhaseText={currentPhaseTitle}
      />

      {/* Main Content Area */}
      {!draftState ? (
        /* STEP 1 & 2: Rank & Side Selection Screen */
        <RankSelectionScreen onStartDraft={handleStartDraft} />
      ) : (
        /* ACTIVE DRAFT WORKSPACE */
        <div id="draft-workspace" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Header Panel */}
          <DraftHeader
            draftState={draftState}
            onUndo={handleUndo}
            onReset={handleResetDraft}
            onToggleTimer={handleToggleTimer}
            onRevealBans={handleRevealBans}
            onProceedAfterReveal={handleProceedAfterReveal}
            onSwitchBanTarget={handleSwitchBanTarget}
          />

          {/* Toast Notification */}
          {toastMessage && (
            <div
              id="draft-toast"
              className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-red-600/90 text-white text-xs font-semibold shadow-xl border border-red-400 backdrop-blur-md animate-fade-in flex items-center space-x-2"
            >
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Draft Center Stage */}
          <div className="flex-1 flex flex-col min-h-0 p-2.5 md:p-3 overflow-hidden">
            {/* Upper Grid: Blue Team | Hero Pool | Red Team */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2.5 min-h-0 overflow-hidden mb-2.5">
              {/* Blue Team Section (Left) */}
              <div className="lg:col-span-3 min-h-0 flex flex-col">
                <TeamDraftSection
                  draftState={draftState}
                  teamColor="BLUE"
                  onTargetBanTeam={handleSwitchBanTarget}
                  onRemoveBan={handleRemoveBan}
                />
              </div>

              {/* Hero Selection Center Stage */}
              <div className="lg:col-span-6 min-h-0 flex flex-col">
                <HeroSelectionGrid
                  draftState={draftState}
                  allHeroes={ALL_MLBB_HEROES}
                  onSelectHero={handleSelectHero}
                />
              </div>

              {/* Red Team Section (Right) */}
              <div className="lg:col-span-3 min-h-0 flex flex-col">
                <TeamDraftSection
                  draftState={draftState}
                  teamColor="RED"
                  onTargetBanTeam={handleSwitchBanTarget}
                  onRemoveBan={handleRemoveBan}
                />
              </div>
            </div>

            {/* Lower Row: Recommendation & Draft History Panels */}
            <div className="h-44 shrink-0 grid grid-cols-1 md:grid-cols-2 gap-2.5 min-h-0 overflow-hidden">
              <RecommendationPanel draftState={draftState} />
              <DraftHistoryPanel draftState={draftState} onUndo={handleUndo} />
            </div>
          </div>
        </div>
      )}

      {/* Draft Complete Modal Summary */}
      {draftState?.currentPhase === 'DRAFT_COMPLETE' && (
        <div
          id="draft-complete-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="max-w-2xl w-full bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl shadow-amber-500/10 text-center flex flex-col items-center animate-scale-up">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3">
              <Trophy className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-1">
              Ranked Draft Completed
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Lineup kedua tim telah terkunci sesuai aturan {draftState.selectedRank && rankedRules[draftState.selectedRank].displayName} Ranked Draft.
            </p>

            {/* Lineup comparison */}
            <div className="grid grid-cols-2 gap-4 w-full mb-6">
              {/* Blue Lineup */}
              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-900/50 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-blue-400 uppercase">BLUE TEAM</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {draftState.selectedSide === 'FIRST_PICK' ? 'Our Team' : 'Enemy'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {draftState.bluePicks.map((hero, idx) => (
                    <div key={`modal-blue-${idx}`} className="flex items-center space-x-2 text-xs">
                      <div className="w-6 h-6 rounded overflow-hidden shrink-0">
                        <HeroAvatar hero={hero} className="w-full h-full" />
                      </div>
                      <span className="font-bold text-slate-200 truncate">{hero?.name}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {Array.isArray(hero?.role) ? hero?.role.join('/') : hero?.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Red Lineup */}
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/50 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-rose-400 uppercase">RED TEAM</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {draftState.selectedSide === 'SECOND_PICK' ? 'Our Team' : 'Enemy'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {draftState.redPicks.map((hero, idx) => (
                    <div key={`modal-red-${idx}`} className="flex items-center space-x-2 text-xs">
                      <div className="w-6 h-6 rounded overflow-hidden shrink-0">
                        <HeroAvatar hero={hero} className="w-full h-full" />
                      </div>
                      <span className="font-bold text-slate-200 truncate">{hero?.name}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {Array.isArray(hero?.role) ? hero?.role.join('/') : hero?.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              id="btn-new-draft"
              onClick={handleResetDraft}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start New Draft</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
