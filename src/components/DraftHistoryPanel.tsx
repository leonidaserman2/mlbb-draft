import React from 'react';
import { DraftState, DraftHistoryItem } from '../types/draft';
import { HeroAvatar } from './HeroAvatar';
import { History, Ban, Shield, Undo2, ArrowUpRight } from 'lucide-react';
import { soundFx } from '../utils/formatters';

interface DraftHistoryPanelProps {
  draftState: DraftState;
  onUndo: () => void;
}

export const DraftHistoryPanel: React.FC<DraftHistoryPanelProps> = ({
  draftState,
  onUndo,
}) => {
  const { draftHistory } = draftState;

  const handleUndo = () => {
    soundFx.playClick();
    onUndo();
  };

  return (
    <div
      id="draft-history-panel"
      className="flex flex-col bg-slate-900/80 rounded-xl border border-slate-800 p-3 select-none backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <History className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs md:text-sm font-black tracking-wider text-slate-100 uppercase">
            Draft History ({draftHistory.length})
          </h3>
        </div>

        {draftHistory.length > 0 && (
          <button
            type="button"
            id="history-undo-btn"
            onClick={handleUndo}
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] font-semibold cursor-pointer active:scale-95 transition-all"
            title="Revert last action"
          >
            <Undo2 className="w-3 h-3" />
            <span>Revert Last</span>
          </button>
        )}
      </div>

      {/* History Log List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar max-h-48 pr-1 min-h-[90px]">
        {draftHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-center text-slate-600 text-xs">
            <span>No draft actions yet.</span>
            <span className="text-[10px] text-slate-600 mt-0.5">Selections will be logged here in order.</span>
          </div>
        ) : (
          [...draftHistory].reverse().map((item, idx) => {
            const isBlue = item.teamColor === 'BLUE';
            const isOurTeam = item.teamSide === 'OUR_TEAM';
            const isBan = item.action === 'BAN';

            return (
              <div
                key={item.id || `history-item-${idx}`}
                className={`flex items-center justify-between p-1.5 rounded-lg border text-xs transition-colors ${
                  isBlue
                    ? 'bg-blue-950/20 border-blue-900/30'
                    : 'bg-rose-950/20 border-rose-900/30'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  {/* Hero Thumbnail */}
                  <div className="w-7 h-7 rounded overflow-hidden shrink-0 border border-slate-700 bg-slate-950">
                    <HeroAvatar hero={item.hero} className="w-full h-full" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-slate-200 truncate">
                        {item.hero.name}
                      </span>
                      {item.isDuplicateBan && (
                        <span className="text-[9px] font-extrabold uppercase px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Duplicate
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-[10px]">
                      <span
                        className={`font-semibold ${
                          isBlue ? 'text-blue-400' : 'text-rose-400'
                        }`}
                      >
                        {item.teamColor} ({isOurTeam ? 'Our' : 'Enemy'})
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">
                        {Array.isArray(item.hero.role) ? item.hero.role.join('/') : item.hero.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Badge */}
                <div className="shrink-0 flex items-center space-x-1 ml-2">
                  <span
                    className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isBan
                        ? 'bg-red-950/60 text-red-400 border border-red-800/40'
                        : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                    }`}
                  >
                    {isBan ? <Ban className="w-2.5 h-2.5" /> : <ArrowUpRight className="w-2.5 h-2.5" />}
                    <span>{item.action}</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
