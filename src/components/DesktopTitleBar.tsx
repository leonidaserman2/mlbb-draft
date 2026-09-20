import React from 'react';
import { Minus, Square, X, Volume2, VolumeX, ShieldAlert, RotateCcw } from 'lucide-react';
import { soundFx } from '../utils/formatters';
import { MetaDataStatusBadge } from './MetaDataStatusBadge';

interface DesktopTitleBarProps {
  onReset?: () => void;
  isSoundMuted: boolean;
  onToggleSound: () => void;
  currentPhaseText?: string;
}

export const DesktopTitleBar: React.FC<DesktopTitleBarProps> = ({
  onReset,
  isSoundMuted,
  onToggleSound,
  currentPhaseText,
}) => {
  return (
    <div
      id="desktop-title-bar"
      className="h-9 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between px-3 text-xs select-none backdrop-blur-sm z-50 text-slate-400"
    >
      {/* Left: App Identity */}
      <div className="flex items-center space-x-2.5">
        <div className="w-4 h-4 rounded bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-[9px] text-slate-950 shadow-sm shadow-amber-500/30">
          M
        </div>
        <span className="font-semibold text-slate-200 tracking-wider">
          MLBB DRAFT COACH
        </span>
        <span className="text-[10px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/50">
          v1.0 Windows Native
        </span>
        {currentPhaseText && (
          <span className="hidden sm:inline-flex items-center text-[10px] text-amber-300 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {currentPhaseText}
          </span>
        )}
      </div>

      {/* Right: Quick Controls & Windows buttons */}
      <div className="flex items-center space-x-1.5">
        <MetaDataStatusBadge />

        {onReset && (
          <button
            id="titlebar-reset-button"
            onClick={onReset}
            title="Reset Draft / Change Side"
            className="flex items-center space-x-1 px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 rounded transition-colors mr-2 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="text-[11px]">New Draft</span>
          </button>
        )}

        <button
          id="titlebar-sound-toggle"
          onClick={onToggleSound}
          title={isSoundMuted ? 'Unmute Audio' : 'Mute Audio'}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 rounded transition-colors cursor-pointer"
        >
          {isSoundMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        <div className="h-3.5 w-px bg-slate-800 mx-1" />

        {/* Windows style control buttons */}
        <button
          id="window-minimize-btn"
          aria-label="Minimize"
          className="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          id="window-maximize-btn"
          aria-label="Maximize"
          className="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
        >
          <Square className="w-2.5 h-2.5" />
        </button>
        <button
          id="window-close-btn"
          aria-label="Close"
          onClick={onReset}
          className="w-8 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
