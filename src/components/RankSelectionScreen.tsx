import React, { useState } from 'react';
import { MLBB_Rank, PickSide } from '../types/draft';
import { rankedRules } from '../draft/rankedRules';
import { Shield, Zap, Swords, ChevronRight, ArrowLeft, Trophy, Crown, Sparkles } from 'lucide-react';

interface RankSelectionScreenProps {
  onStartDraft: (rank: MLBB_Rank, side: PickSide) => void;
}

const RANK_OPTIONS: { rank: MLBB_Rank; label: string; sub: string; bans: string; icon: React.ReactNode }[] = [
  {
    rank: 'EPIC',
    label: 'EPIC',
    sub: 'Beginner Draft Pick',
    bans: '3 Bans / Team (6 Total)',
    icon: <Shield className="w-5 h-5 text-emerald-400" />,
  },
  {
    rank: 'LEGEND',
    label: 'LEGEND',
    sub: 'Advanced Draft Pick',
    bans: '4 Bans / Team (8 Total)',
    icon: <Swords className="w-5 h-5 text-amber-400" />,
  },
  {
    rank: 'MYTHIC',
    label: 'MYTHIC',
    sub: 'Simultaneous 5 Blind Bans',
    bans: '5 Bans / Team (10 Total)',
    icon: <Trophy className="w-5 h-5 text-rose-400" />,
  },
  {
    rank: 'MYTHICAL_HONOR',
    label: 'MYTHICAL HONOR',
    sub: 'Simultaneous 5 Blind Bans',
    bans: '5 Bans / Team (10 Total)',
    icon: <Crown className="w-5 h-5 text-purple-400" />,
  },
  {
    rank: 'MYTHICAL_GLORY',
    label: 'MYTHICAL GLORY',
    sub: 'Simultaneous 5 Blind Bans',
    bans: '5 Bans / Team (10 Total)',
    icon: <Crown className="w-5 h-5 text-red-400" />,
  },
  {
    rank: 'MYTHICAL_IMMORTAL',
    label: 'MYTHICAL IMMORTAL',
    sub: 'Simultaneous 5 Blind Bans',
    bans: '5 Bans / Team (10 Total)',
    icon: <Sparkles className="w-5 h-5 text-amber-300" />,
  },
];

export const RankSelectionScreen: React.FC<RankSelectionScreenProps> = ({ onStartDraft }) => {
  const [selectedRank, setSelectedRank] = useState<MLBB_Rank | null>(null);

  const handleRankClick = (rank: MLBB_Rank) => {
    setSelectedRank(rank);
  };

  const handleSideClick = (side: PickSide) => {
    if (!selectedRank) return;
    onStartDraft(selectedRank, side);
  };

  return (
    <div
      id="rank-selection-container"
      className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 relative overflow-hidden bg-radial from-slate-900 via-slate-950 to-black select-none text-slate-100"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-4xl w-full z-10 flex flex-col items-center text-center">
        {/* MLBB Title Badge */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold tracking-wider uppercase mb-3">
          <Swords className="w-3.5 h-3.5" />
          <span>Mobile Legends: Bang Bang</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-2 uppercase">
          MLBB DRAFT COACH
        </h1>

        {/* STEP 1: SELECT RANK */}
        {!selectedRank ? (
          <>
            <p className="text-slate-400 text-sm md:text-base max-w-xl mb-8 leading-relaxed">
              Pilih tingkatan rank untuk mengaktifkan aturan ban ranked yang sesuai:
            </p>

            <div className="w-full mb-3 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                SELECT RANK:
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {RANK_OPTIONS.map((opt) => {
                const rule = rankedRules[opt.rank];
                return (
                  <button
                    key={opt.rank}
                    id={`btn-select-rank-${opt.rank.toLowerCase()}`}
                    onClick={() => handleRankClick(opt.rank)}
                    className="group relative flex flex-col items-start p-5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-600 text-left transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shadow-lg hover:shadow-cyan-500/5 overflow-hidden"
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-700/60">
                          {opt.icon}
                        </div>
                        <span className="font-extrabold text-base tracking-wide text-white group-hover:text-amber-300 transition-colors">
                          {opt.label}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </div>

                    <p className="text-xs text-slate-400 mb-2.5">
                      {opt.sub}
                    </p>

                    <div className="mt-auto inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-950/90 text-slate-300 border border-slate-800">
                      {opt.bans}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          /* STEP 2: SELECT SIDE */
          <>
            <div className="flex items-center justify-center space-x-3 mb-6">
              <button
                id="btn-back-to-rank"
                onClick={() => setSelectedRank(null)}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-xs font-semibold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ubah Rank ({rankedRules[selectedRank].displayName})</span>
              </button>
            </div>

            <div className="w-full mb-3 text-left max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                SELECT SIDE:
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mb-6">
              {/* FIRST PICK (BLUE) */}
              <button
                id="btn-select-first-pick"
                onClick={() => handleSideClick('FIRST_PICK')}
                className="group relative flex flex-col items-start p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-2 border-blue-600/50 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/20 text-left transition-all duration-200 hover:-translate-y-1 cursor-pointer overflow-hidden"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                    <Zap className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    Blue Side
                  </span>
                </div>

                <h3 className="text-2xl font-black text-white group-hover:text-blue-300 transition-colors mb-1 uppercase tracking-tight">
                  FIRST PICK
                </h3>
                <p className="text-xs text-slate-300 mb-4 font-medium">
                  Tim Kita mengontrol posisi <span className="text-blue-400 font-bold">BLUE</span>.
                </p>

                <div className="mt-auto w-full pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div>✓ Prioritas hero OP pertama (Pick 1)</div>
                  <div>✓ Aturan Snake Pick: Blue 1, Blue 2, Blue 2</div>
                </div>
              </button>

              {/* SECOND PICK (RED) */}
              <button
                id="btn-select-second-pick"
                onClick={() => handleSideClick('SECOND_PICK')}
                className="group relative flex flex-col items-start p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-2 border-rose-600/50 hover:border-rose-400 hover:shadow-xl hover:shadow-rose-500/20 text-left transition-all duration-200 hover:-translate-y-1 cursor-pointer overflow-hidden"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                    <Shield className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Red Side
                  </span>
                </div>

                <h3 className="text-2xl font-black text-white group-hover:text-rose-300 transition-colors mb-1 uppercase tracking-tight">
                  SECOND PICK
                </h3>
                <p className="text-xs text-slate-300 mb-4 font-medium">
                  Tim Kita mengontrol posisi <span className="text-rose-400 font-bold">RED</span>.
                </p>

                <div className="mt-auto w-full pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div>✓ Double-pick langsung pada giliran pertama (Pick 2 & 3)</div>
                  <div>✓ Last pick counter (Pick 10)</div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
