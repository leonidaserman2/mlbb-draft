import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, ChevronDown, Terminal, Layers } from 'lucide-react';
import { metaCacheManager } from '../meta/cache/metaCache';
import { ACTIVE_PATCH_CONFIG } from '../meta/config/patchConfig';
import { getDevInspectionReport, MetaDevReport } from '../meta/dev/metaDebug';

export const MetaDataStatusBadge: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [report, setReport] = useState<MetaDevReport | null>(null);
  const [showDevDetails, setShowDevDetails] = useState(false);

  // Initialize and load report
  const refreshStatus = () => {
    setReport(getDevInspectionReport());
  };

  useEffect(() => {
    // Initial sync on startup
    const init = async () => {
      await metaCacheManager.syncAllSources();
      refreshStatus();
    };
    init();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await metaCacheManager.syncAllSources();
    refreshStatus();
    setIsSyncing(false);
  };

  const dsMode = report?.dataSourceMode || 'UNAVAILABLE';
  const repoStatus = report?.repositoryStatus;

  // Mode badge styling
  let modeBadgeStyle = 'bg-slate-800 text-slate-400 border-slate-700';
  if (dsMode === 'LIVE') {
    modeBadgeStyle = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  } else if (dsMode === 'IMPORT') {
    modeBadgeStyle = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  } else if (dsMode === 'CACHE') {
    modeBadgeStyle = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  } else {
    modeBadgeStyle = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  }

  // Ranked status
  const rankedCount = repoStatus?.rankedCount ?? report?.normalizedRankedRecordsCount ?? 0;
  let rankedStatusText = 'UNAVAILABLE (0 records)';
  let rankedStatusColor = 'text-slate-500';
  if (repoStatus?.rankedStatus === 'LIVE') {
    rankedStatusText = `LIVE (${rankedCount} records)`;
    rankedStatusColor = 'text-emerald-400 font-medium';
  } else if (rankedCount > 0) {
    rankedStatusText = `${repoStatus?.rankedStatus || 'CACHED'} (${rankedCount} records)`;
    rankedStatusColor = 'text-amber-400 font-medium';
  }

  // Pro status
  const proCount = repoStatus?.proCount ?? report?.normalizedProRecordsCount ?? 0;
  let proStatusText = 'UNAVAILABLE (0 records)';
  let proStatusColor = 'text-slate-500';
  if (repoStatus?.proStatus === 'LIVE') {
    proStatusText = `LIVE (${proCount} records)`;
    proStatusColor = 'text-emerald-400 font-medium';
  } else if (proCount > 0) {
    proStatusText = `${repoStatus?.proStatus || 'CACHED'} (${proCount} records)`;
    proStatusColor = 'text-amber-400 font-medium';
  }

  // Patch notes status
  const patchNotesCount = report?.patchNotesCount ?? 0;
  const patchStatusText = repoStatus?.patchStatus || (patchNotesCount > 0 ? 'CACHED' : 'UNAVAILABLE');
  const patchStatusColor = patchStatusText === 'LIVE' ? 'text-emerald-400 font-medium' : patchNotesCount > 0 ? 'text-amber-400' : 'text-slate-500';

  const formatTime = (iso: string | null | undefined) => {
    if (!iso) return 'Not synced';
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const hasActiveData = (rankedCount > 0 || proCount > 0);

  return (
    <div className="relative inline-block text-left select-none">
      {/* Trigger Button */}
      <button
        id="meta-data-status-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
          hasActiveData
            ? 'bg-slate-900/80 text-slate-300 border-slate-700/70 hover:bg-slate-850 hover:border-slate-600'
            : 'bg-slate-900/40 text-slate-500 border-slate-800 hover:bg-slate-900'
        }`}
        title="MLBB Meta Data Infrastructure Status (Phase 2B Data Pipeline)"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            dsMode === 'LIVE'
              ? 'bg-emerald-400 animate-pulse'
              : dsMode === 'IMPORT'
              ? 'bg-blue-400'
              : dsMode === 'CACHE'
              ? 'bg-amber-400'
              : 'bg-rose-400'
          }`}
        />
        <span className="text-slate-400">Patch</span>
        <span className="font-semibold text-slate-200">{ACTIVE_PATCH_CONFIG.activePatch}</span>
        <span className="text-slate-500">•</span>
        <span className="text-slate-400 font-mono text-[10px] uppercase">{dsMode}</span>
        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            id="meta-data-status-popover"
            className="absolute right-0 mt-1.5 w-88 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl shadow-black/80 z-50 p-3 text-xs backdrop-blur-md animate-fade-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Database className="w-3 h-3" />
                </div>
                <div>
                  <div className="font-bold text-slate-100 text-[11px] tracking-wide">META DATA REPOSITORY (2B)</div>
                  <div className="text-[10px] text-slate-400">Patch {ACTIVE_PATCH_CONFIG.activePatch} • Season {ACTIVE_PATCH_CONFIG.season}</div>
                </div>
              </div>
              <button
                id="btn-sync-meta-sources"
                onClick={handleManualSync}
                disabled={isSyncing}
                title="Verify and sync from real endpoints"
                className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>

            {/* Source Mode Badge Block */}
            <div className="mb-2.5 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400 text-[11px]">Data Source Mode:</span>
              <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold border ${modeBadgeStyle}`}>
                {dsMode}
              </span>
            </div>

            {/* Core Status Block */}
            <div className="space-y-1.5 text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Active Patch:</span>
                <span className="text-slate-200 font-semibold">{ACTIVE_PATCH_CONFIG.activePatch}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Ranked Status:</span>
                <span className={rankedStatusColor}>
                  {rankedStatusText}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Pro Status:</span>
                <span className={proStatusColor}>
                  {proStatusText}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Patch Notes Status:</span>
                <span className={patchStatusColor}>
                  {patchStatusText} ({patchNotesCount} notes)
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800/60 text-[10px]">
                <span className="text-slate-500">Active Records:</span>
                <span className="text-slate-300 font-medium">Ranked: {rankedCount} | Pro: {proCount}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-500">Last Ingest/Sync:</span>
                <span className="text-slate-400">{formatTime(report?.lastSuccessfulSync || report?.lastUpdateAttempt)}</span>
              </div>
            </div>

            {/* Source Adapters Status List */}
            <div className="mt-2.5">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">
                Adapters / Ingestion Sources
              </div>
              <div className="space-y-1">
                {report?.sourcesOverview.map((src) => {
                  const cacheDetails = report?.sourcesCacheDetails?.[src.id];
                  const displayStatus: string = (cacheDetails?.status || src.status || '') as string;

                  let badgeStyle = 'bg-slate-800 text-slate-400 border-slate-700';
                  let label: string = displayStatus;

                  if (displayStatus === 'VERIFIED' || displayStatus === 'LIVE_VERIFIED') {
                    badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                    label = 'VERIFIED';
                  } else if (displayStatus === 'PARTIAL') {
                    badgeStyle = 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30';
                    label = 'PARTIAL';
                  } else if (displayStatus === 'STALE_CACHE') {
                    badgeStyle = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                    label = 'STALE CACHE';
                  } else if (displayStatus === 'MANUAL_EXTERNAL') {
                    badgeStyle = 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
                    label = 'MANUAL_EXT';
                  } else if (displayStatus === 'UNAVAILABLE') {
                    badgeStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                    label = 'UNAVAILABLE';
                  } else if (displayStatus === 'INVALID') {
                    badgeStyle = 'bg-red-500/10 text-red-400 border-red-500/30';
                    label = 'INVALID';
                  }

                  return (
                    <div
                      key={src.id}
                      className="flex items-center justify-between px-2 py-1 rounded bg-slate-800/40 border border-slate-800 text-[10px]"
                    >
                      <span className="text-slate-300 truncate max-w-[175px]" title={src.name}>{src.name}</span>
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] border ${badgeStyle}`}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Developer Diagnostic Toggle */}
            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
              <button
                id="btn-toggle-dev-diagnostics"
                onClick={() => setShowDevDetails(!showDevDetails)}
                className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <Terminal className="w-3 h-3 text-amber-400" />
                <span>Developer Pipeline Test</span>
              </button>
              <span className="text-[9px] text-slate-500 font-mono">
                Err: {report?.validationErrors?.length || 0}
              </span>
            </div>

            {/* Expanded Developer Diagnostics */}
            {showDevDetails && (
              <div
                id="dev-diagnostics-drawer"
                className="mt-2 p-2 bg-black/70 rounded border border-slate-800 font-mono text-[9px] text-slate-300 space-y-1"
              >
                <div className="flex items-center justify-between text-amber-400 font-semibold pb-1 border-b border-slate-800">
                  <span>Pipeline Dev Helpers</span>
                  <Layers className="w-3 h-3" />
                </div>
                <div>Repository Ranked Records: {rankedCount}</div>
                <div>Repository Pro Matches: {proCount}</div>
                <div>Repository Patch Notes: {patchNotesCount}</div>
                <div>Verified Hero Roster: {report?.totalVerifiedHeroesInGame} heroes</div>
                <div className="text-emerald-400/90 pt-1">
                  Run test in console:
                  <div className="text-slate-300 bg-slate-950 p-1 rounded mt-0.5 select-all font-mono">
                    window.__MLBB_META_DEV__.testPriority()
                  </div>
                  <div className="text-slate-400 bg-slate-950 p-1 rounded mt-0.5 select-all font-mono">
                    window.__MLBB_META_DEV__.inspectPriority('fanny')
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
