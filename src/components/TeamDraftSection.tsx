import React from 'react';
import { DraftState, TeamColor } from '../types/draft';
import { HeroAvatar } from './HeroAvatar';
import { getTeamSide } from '../draft/draftEngine';
import { rankedRules, SNAKE_PICK_SEQUENCE } from '../draft/rankedRules';
import { Ban, Shield, Sparkles, User, Crosshair, EyeOff, Lock, Check } from 'lucide-react';

interface TeamDraftSectionProps {
  draftState: DraftState;
  teamColor: TeamColor;
  onTargetBanTeam?: (team: TeamColor, slotIndex?: number) => void;
  onRemoveBan?: (team: TeamColor, slotIndex: number) => void;
}

export const TeamDraftSection: React.FC<TeamDraftSectionProps> = ({
  draftState,
  teamColor,
  onTargetBanTeam,
  onRemoveBan,
}) => {
  const {
    selectedSide,
    selectedRank,
    currentPhase,
    currentTurn,
    blueBans,
    redBans,
    hiddenBlueBans,
    hiddenRedBans,
    bluePicks,
    redPicks,
    activeBanTargetTeam,
    currentPickNumber,
  } = draftState;

  const isBlue = teamColor === 'BLUE';
  const teamSide = getTeamSide(selectedSide, teamColor);
  const isOurTeam = teamSide === 'OUR_TEAM';

  const bans = isBlue ? blueBans : redBans;
  const hiddenBans = isBlue ? hiddenBlueBans : hiddenRedBans;
  const picks = isBlue ? bluePicks : redPicks;

  const rule = selectedRank ? rankedRules[selectedRank] : null;
  const totalBans = rule?.totalBansPerTeam || 5;

  // Active states
  const isBanPhase = currentPhase === 'BAN_PHASE';
  const isBanReveal = currentPhase === 'BAN_REVEAL';
  const isPickPhase = currentPhase === 'PICK_PHASE';
  const isCompleted = currentPhase === 'DRAFT_COMPLETE';

  const isThisTeamActiveBanInput = isBanPhase && activeBanTargetTeam === teamColor;
  const currentPickStep = isPickPhase ? SNAKE_PICK_SEQUENCE.find(s => s.pickNumber === currentPickNumber) : null;
  const isThisTeamPicking = isPickPhase && currentPickStep?.teamColor === teamColor;

  return (
    <div
      id={`${teamColor.toLowerCase()}-team-draft-section`}
      className={`flex flex-col h-full rounded-xl border p-3 md:p-3.5 transition-all select-none backdrop-blur-sm ${
        isBlue
          ? isThisTeamPicking
            ? 'bg-slate-900/85 border-blue-500 shadow-xl shadow-blue-500/20 ring-1 ring-blue-500/50'
            : 'bg-slate-900/65 border-blue-900/40 shadow-lg shadow-blue-950/20'
          : isThisTeamPicking
            ? 'bg-slate-900/85 border-rose-500 shadow-xl shadow-rose-500/20 ring-1 ring-rose-500/50'
            : 'bg-slate-900/65 border-rose-900/40 shadow-lg shadow-rose-950/20'
      }`}
    >
      {/* Team Header & Ban Slots */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isBlue ? 'bg-blue-400 shadow-sm shadow-blue-400/50' : 'bg-rose-500 shadow-sm shadow-rose-500/50'
            }`}
          />
          <div>
            <div className="flex items-center space-x-1.5">
              <h2
                className={`text-sm md:text-base font-black tracking-wider uppercase ${
                  isBlue ? 'text-blue-300' : 'text-rose-300'
                }`}
              >
                {teamColor} SIDE
              </h2>
              <span
                className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                  isOurTeam
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isOurTeam ? 'OUR TEAM' : 'ENEMY TEAM'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {isBlue ? 'First Pick Side' : 'Second Pick Side'}
            </div>
          </div>
        </div>

        {/* Ban Slots Bar (Dynamic based on Rank: 3, 4, or 5) */}
        <div className="flex flex-col items-end">
          <div className="flex items-center justify-between w-full space-x-2 mb-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <Ban className="w-3 h-3 text-slate-400" />
              <span>Bans ({totalBans})</span>
            </span>

            {isBanPhase && onTargetBanTeam && (
              <button
                type="button"
                onClick={() => onTargetBanTeam(teamColor)}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  isThisTeamActiveBanInput
                    ? isBlue
                      ? 'bg-blue-500 text-white'
                      : 'bg-rose-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {isThisTeamActiveBanInput ? '● Active Input' : 'Select'}
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1.5">
            {Array.from({ length: totalBans }).map((_, idx) => {
              const revealedHero = bans[idx];
              const hiddenHero = hiddenBans[idx];
              const isFilledHidden = hiddenHero !== null;

              // Check duplicate ban
              const otherBans = isBlue ? redBans : blueBans;
              const isDuplicate = revealedHero && otherBans.some(h => h?.id === revealedHero.id);

              return (
                <div
                  key={`ban-slot-${teamColor}-${idx}`}
                  id={`ban-slot-${teamColor.toLowerCase()}-${idx}`}
                  onClick={() => {
                    if (!isBanPhase) return;
                    if (isFilledHidden && onRemoveBan) {
                      onRemoveBan(teamColor, idx);
                    } else if (onTargetBanTeam) {
                      onTargetBanTeam(teamColor, idx);
                    }
                  }}
                  title={
                    isBanPhase
                      ? hiddenHero
                        ? `Klik untuk batalkan ban: ${hiddenHero.name}`
                        : `Klik untuk pilih slot ban ${idx + 1} (${teamColor})`
                      : revealedHero
                        ? `Banned: ${revealedHero.name}`
                        : `Empty Ban Slot ${idx + 1}`
                  }
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md border relative overflow-hidden transition-all flex items-center justify-center ${
                    isBanPhase ? 'cursor-pointer hover:scale-105' : ''
                  } ${
                    revealedHero
                      ? 'border-red-500/70 bg-slate-950 shadow-sm shadow-red-500/20'
                      : isFilledHidden && isBanPhase
                        ? isBlue
                          ? 'border-blue-400 bg-blue-950/40 ring-1 ring-blue-400/50'
                          : 'border-rose-400 bg-rose-950/40 ring-1 ring-rose-400/50'
                        : isThisTeamActiveBanInput && draftState.activeBanSlotIndex === idx
                          ? isBlue
                            ? 'border-blue-400 bg-blue-950/50 ring-2 ring-blue-400 animate-pulse'
                            : 'border-rose-400 bg-rose-950/50 ring-2 ring-rose-400 animate-pulse'
                          : 'border-slate-800 bg-slate-950/60'
                  }`}
                >
                  {/* Revealed Ban State */}
                  {revealedHero ? (
                    <>
                      <HeroAvatar hero={revealedHero} className="w-full h-full grayscale brightness-75" compact={true} />
                      <div className="absolute inset-0 bg-red-950/40 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-red-500 rotate-45 transform" />
                      </div>
                      {isDuplicate && (
                        <div className="absolute bottom-0 inset-x-0 bg-amber-500 text-slate-950 text-[7px] font-black text-center uppercase tracking-tighter leading-tight">
                          Both
                        </div>
                      )}
                    </>
                  ) : isBanPhase && isFilledHidden ? (
                    /* Blind Ban State (User preview) */
                    <div className="w-full h-full relative group">
                      <HeroAvatar hero={hiddenHero} className="w-full h-full opacity-70" compact={true} />
                      <div className="absolute inset-0 bg-slate-950/60 group-hover:bg-red-950/80 transition-colors flex flex-col items-center justify-center">
                        <EyeOff className="w-3.5 h-3.5 text-slate-300 group-hover:hidden" />
                        <span className="text-[7px] font-mono text-slate-300 uppercase mt-0.5 font-bold group-hover:hidden">Blind</span>
                        <span className="hidden group-hover:inline text-[9px] font-black text-red-300">BATAL</span>
                      </div>
                    </div>
                  ) : (
                    /* Empty Ban Slot */
                    <Ban className="w-3.5 h-3.5 text-slate-700" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5 Pick Slots */}
      <div className="flex-1 flex flex-col justify-between space-y-2">
        {picks.map((pickedHero, idx) => {
          const isSlotActive = isThisTeamPicking && currentPickStep?.slotIndex === idx;

          return (
            <div
              key={`pick-slot-${teamColor}-${idx}`}
              id={`pick-slot-${teamColor.toLowerCase()}-${idx}`}
              className={`relative flex items-center p-2 rounded-lg border transition-all duration-200 overflow-hidden ${
                isSlotActive
                  ? isBlue
                    ? 'bg-blue-950/40 border-blue-400 shadow-md shadow-blue-500/20 ring-1 ring-blue-400'
                    : 'bg-rose-950/40 border-rose-400 shadow-md shadow-rose-500/20 ring-1 ring-rose-400'
                  : pickedHero
                    ? 'bg-slate-900/80 border-slate-700/80'
                    : 'bg-slate-950/50 border-slate-800/80 border-dashed'
              }`}
            >
              {/* Pick Avatar Slot */}
              <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-md overflow-hidden shrink-0 border border-slate-700 bg-slate-950">
                {pickedHero ? (
                  <HeroAvatar hero={pickedHero} className="w-full h-full" showRoleIcon />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-950/80">
                    {isSlotActive ? (
                      <Crosshair
                        className={`w-5 h-5 animate-spin-slow ${
                          isBlue ? 'text-blue-400' : 'text-rose-400'
                        }`}
                      />
                    ) : (
                      <User className="w-5 h-5 text-slate-700" />
                    )}
                    <span className="text-[9px] font-mono mt-0.5 text-slate-500">
                      P{idx + 1}
                    </span>
                  </div>
                )}
              </div>

              {/* Hero Details or Active Pick Prompt */}
              <div className="ml-3 flex-1 min-w-0">
                {pickedHero ? (
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-slate-100 truncate">
                        {pickedHero.name}
                      </h3>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {Array.isArray(pickedHero.role) ? pickedHero.role.join(' / ') : pickedHero.role}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] text-slate-400 font-medium truncate">
                        {(pickedHero.lane || pickedHero.lanes || []).join(', ')}
                      </span>
                      {pickedHero.damageType && (
                        <span className="text-[9px] font-mono text-slate-500">
                          • {pickedHero.damageType}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isSlotActive
                            ? isBlue
                              ? 'text-blue-400 animate-pulse'
                              : 'text-rose-400 animate-pulse'
                            : 'text-slate-500'
                        }`}
                      >
                        {isSlotActive ? 'CHOOSING HERO...' : `Pick Slot ${idx + 1}`}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {isSlotActive
                        ? isOurTeam
                          ? 'Select hero for our lineup'
                          : 'Waiting for enemy selection'
                        : 'Awaiting turn in pick order'}
                    </div>
                  </div>
                )}
              </div>

              {/* Slot Number Tag */}
              <div className="ml-2 shrink-0">
                <span className="text-[10px] font-mono font-bold text-slate-600 px-1.5 py-0.5 rounded bg-slate-950/60 border border-slate-800/80">
                  #{idx + 1}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
