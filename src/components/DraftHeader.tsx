import React from 'react';
import { DraftState, TeamColor } from '../types/draft';
import { formatDraftPhase, formatTimerSeconds, soundFx } from '../utils/formatters';
import { rankedRules } from '../draft/rankedRules';
import {
  Undo2,
  RotateCcw,
  Play,
  Pause,
  AlertCircle,
  Swords,
  Clock,
  Eye,
  ArrowRight,
  Shield,
  Zap,
} from 'lucide-react';

interface DraftHeaderProps {
  draftState: DraftState;
  onUndo: () => void;
  onReset: () => void;
  onToggleTimer: () => void;
  onRevealBans: () => void;
  onProceedAfterReveal: () => void;
  onSwitchBanTarget: (team: TeamColor) => void;
}

export const DraftHeader: React.FC<DraftHeaderProps> = ({
  draftState,
  onUndo,
  onReset,
  onToggleTimer,
  onRevealBans,
  onProceedAfterReveal,
  onSwitchBanTarget,
}) => {
  const {
    selectedRank,
    selectedSide,
    currentPhase,
    currentBanPhaseIndex,
    currentPickNumber,
    currentTurn,
    timer,
    isTimerRunning,
    activeBanTargetTeam,
    draftHistory,
  } = draftState;

  const rule = selectedRank ? rankedRules[selectedRank] : null;
  const isUrgentTimer = timer <= 10 && currentPhase !== 'DRAFT_COMPLETE' && timer > 0;
  const isBanPhase = currentPhase === 'BAN_PHASE';
  const isBanReveal = currentPhase === 'BAN_REVEAL';
  const isPickPhase = currentPhase === 'PICK_PHASE';
  const isCompleted = currentPhase === 'DRAFT_COMPLETE';

  const handleUndoClick = () => {
    soundFx.playClick();
    onUndo();
  };

  const handleResetClick = () => {
    soundFx.playClick();
    onReset();
  };

  const handleToggleTimerClick = () => {
    soundFx.playClick();
    onToggleTimer();
  };

  const handleRevealClick = () => {
    soundFx.playSelect();
    onRevealBans();
  };

  const handleProceedClick = () => {
    soundFx.playSelect();
    onProceedAfterReveal();
  };

  return (
    <header
      id="draft-header-panel"
      className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 select-none flex flex-wrap items-center justify-between gap-3 shadow-md backdrop-blur-md"
    >
      {/* Left: Rank Badge & Pick Side */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black shadow-sm shadow-amber-500/20">
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-sm tracking-wider uppercase text-slate-100">
                MLBB DRAFT COACH
              </span>
              {rule && (
                <span
                  className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded shadow-xs"
                  style={{
                    backgroundColor: `${rule.badgeColor}22`,
                    color: rule.badgeColor,
                    border: `1px solid ${rule.badgeColor}55`,
                  }}
                >
                  {rule.displayName}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
              <span className="flex items-center space-x-1">
                {selectedSide === 'FIRST_PICK' ? (
                  <>
                    <Zap className="w-3 h-3 text-blue-400" />
                    <span className="text-blue-300 font-semibold">FIRST PICK (BLUE)</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3 h-3 text-rose-400" />
                    <span className="text-rose-300 font-semibold">SECOND PICK (RED)</span>
                  </>
                )}
              </span>
              <span>•</span>
              <span className="font-semibold text-slate-300 uppercase">
                {formatDraftPhase(currentPhase, currentBanPhaseIndex, rule?.hasMidDraftBan)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Active Phase Controller & Current Turn Status */}
      <div className="flex items-center space-x-3">
        {/* BAN PHASE CONTROLS */}
        {isBanPhase && (
          <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 rounded-lg p-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
              Blind Ban Target:
            </span>
            <button
              type="button"
              id="btn-target-blue-bans"
              onClick={() => onSwitchBanTarget('BLUE')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                activeBanTargetTeam === 'BLUE'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Blue Team
            </button>
            <button
              type="button"
              id="btn-target-red-bans"
              onClick={() => onSwitchBanTarget('RED')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                activeBanTargetTeam === 'RED'
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Red Team
            </button>
            <button
              type="button"
              id="btn-reveal-bans"
              onClick={handleRevealClick}
              className="ml-2 inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Reveal Bans</span>
            </button>
          </div>
        )}

        {/* BAN REVEAL CONTROLS */}
        {isBanReveal && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-amber-300">
              Bans Revealed! Review and proceed:
            </span>
            <button
              type="button"
              id="btn-proceed-picks"
              onClick={handleProceedClick}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <span>Start Picks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* PICK PHASE STATUS */}
        {isPickPhase && (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-400">
              Pick {currentPickNumber} of 10:
            </span>
            <span
              className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded ${
                currentTurn.activeTeamColor === 'BLUE'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {currentTurn.activeTeamColor} ({currentTurn.activeTeamSide === 'OUR_TEAM' ? 'Our Team' : 'Enemy Team'})
            </span>
          </div>
        )}

        {isCompleted && (
          <div className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            ✓ Draft Completed
          </div>
        )}
      </div>

      {/* Right: Timer & Utility Actions */}
      <div className="flex items-center space-x-3">
        {/* Ranked Timer */}
        <div
          id="draft-timer-display"
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border font-mono transition-all ${
            isUrgentTimer
              ? 'bg-red-950/70 border-red-500 text-red-300 shadow-md shadow-red-500/30 animate-pulse'
              : 'bg-slate-950/80 border-slate-800 text-slate-200'
          }`}
        >
          <Clock className={`w-4 h-4 ${isUrgentTimer ? 'text-red-400' : 'text-slate-400'}`} />
          <span className="text-base font-black tracking-tight">
            {formatTimerSeconds(timer)}
          </span>
          <button
            type="button"
            id="btn-toggle-timer"
            onClick={handleToggleTimerClick}
            title={isTimerRunning ? 'Pause Timer' : 'Resume Timer'}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Undo Button */}
        <button
          type="button"
          id="btn-undo-draft"
          onClick={handleUndoClick}
          disabled={draftHistory.length === 0}
          title="Undo last pick or action"
          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            draftHistory.length > 0
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600'
              : 'bg-slate-900/50 text-slate-600 border-slate-800/80 cursor-not-allowed'
          }`}
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        {/* Reset Draft Button */}
        <button
          type="button"
          id="btn-reset-draft"
          onClick={handleResetClick}
          title="Reset Draft and re-select Rank/Side"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-900/50 text-xs font-semibold transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </header>
  );
};
