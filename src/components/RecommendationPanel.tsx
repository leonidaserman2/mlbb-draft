import React, { useMemo } from 'react';
import { DraftState } from '../types/draft';
import { getRecommendations } from '../engine/recommendationEngine';
import { Sparkles, BrainCircuit, Check, Clock, Layers } from 'lucide-react';

interface RecommendationPanelProps {
  draftState: DraftState;
}

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({ draftState }) => {
  // Call the separate recommendation engine function with the full draftState
  const recommendations = useMemo(() => {
    return getRecommendations(draftState);
  }, [draftState]);

  return (
    <div
      id="recommendation-panel"
      className="flex flex-col bg-slate-900/80 rounded-xl border border-slate-800 p-3 select-none backdrop-blur-sm"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BrainCircuit className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs md:text-sm font-black tracking-wider text-slate-100 uppercase">
            RECOMMENDATION
          </h3>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          Engine Standby
        </span>
      </div>

      {/* Main Required Placeholder Notice */}
      <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center space-x-3 mb-3">
        <div className="relative flex shrink-0">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        </div>
        <div className="text-left">
          <p className="text-xs font-semibold text-amber-200/90 leading-tight">
            {recommendations.placeholderMessage}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Phase 1 foundation active. Heuristic synergy & counter engine will attach in Phase 2.
          </p>
        </div>
      </div>

      {/* Draft State Analysis: Lane Coverage Matrix */}
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
          <span>Lane Structure</span>
          <span className="flex items-center space-x-3">
            <span className="text-blue-400">Our Team</span>
            <span className="text-rose-400">Enemy</span>
          </span>
        </div>

        {recommendations.laneStatus.map((laneItem) => (
          <div
            key={laneItem.lane}
            className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs"
          >
            <div className="flex items-center space-x-2">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-200">{laneItem.lane}</span>
            </div>

            <div className="flex items-center space-x-3 font-mono text-[11px]">
              {/* Our Team Status */}
              <div className="flex items-center space-x-1 min-w-[70px] justify-end">
                {laneItem.ourTeamFilled ? (
                  <span className="text-blue-300 font-bold flex items-center space-x-1">
                    <Check className="w-3 h-3 text-blue-400" />
                    <span className="truncate max-w-[50px]">{laneItem.filledByOur}</span>
                  </span>
                ) : (
                  <span className="text-slate-600 text-[10px]">Open</span>
                )}
              </div>

              <span className="text-slate-700">|</span>

              {/* Enemy Team Status */}
              <div className="flex items-center space-x-1 min-w-[70px] justify-end">
                {laneItem.enemyTeamFilled ? (
                  <span className="text-rose-300 font-bold flex items-center space-x-1">
                    <Check className="w-3 h-3 text-rose-400" />
                    <span className="truncate max-w-[50px]">{laneItem.filledByEnemy}</span>
                  </span>
                ) : (
                  <span className="text-slate-600 text-[10px]">Open</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
