import React, { useState, useMemo, useRef } from 'react';
import { Hero, HeroRole, HeroLane } from '../types/hero';
import { DraftState } from '../types/draft';
import { HeroAvatar } from './HeroAvatar';
import { Search, X, Ban, Shield, Sparkles, Filter, Check } from 'lucide-react';
import { soundFx } from '../utils/formatters';
import { CURRENT_PATCH } from '../data/heroes';

interface HeroSelectionGridProps {
  draftState: DraftState;
  allHeroes: Hero[];
  onSelectHero: (hero: Hero) => void;
}

const ROLES: (HeroRole | 'ALL')[] = [
  'ALL',
  'Tank',
  'Fighter',
  'Assassin',
  'Mage',
  'Marksman',
  'Support',
];

const LANES: (HeroLane | 'ALL')[] = [
  'ALL',
  'Gold Lane',
  'EXP Lane',
  'Mid Lane',
  'Roamer',
  'Jungler',
];

export const HeroSelectionGrid: React.FC<HeroSelectionGridProps> = ({
  draftState,
  allHeroes,
  onSelectHero,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<HeroRole | 'ALL'>('ALL');
  const [selectedLane, setSelectedLane] = useState<HeroLane | 'ALL'>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    currentPhase,
    currentTurn,
    blueBans,
    redBans,
    hiddenBlueBans,
    hiddenRedBans,
    bluePicks,
    redPicks,
    activeBanTargetTeam,
  } = draftState;

  const isBanPhase = currentPhase === 'BAN_PHASE';
  const isCompleted = currentPhase === 'DRAFT_COMPLETE';

  // Revealed bans set
  const bannedIds = useMemo(() => {
    const set = new Set<string>();
    blueBans.forEach((h) => h && set.add(h.id));
    redBans.forEach((h) => h && set.add(h.id));
    return set;
  }, [blueBans, redBans]);

  // Picks set
  const pickedIds = useMemo(() => {
    const set = new Set<string>();
    bluePicks.forEach((h) => h && set.add(h.id));
    redPicks.forEach((h) => h && set.add(h.id));
    return set;
  }, [bluePicks, redPicks]);

  // Hidden bans for current active team
  const currentTeamHiddenBansSet = useMemo(() => {
    const set = new Set<string>();
    if (!isBanPhase) return set;
    const targetHidden = activeBanTargetTeam === 'BLUE' ? hiddenBlueBans : hiddenRedBans;
    targetHidden.forEach((h) => h && set.add(h.id));
    return set;
  }, [isBanPhase, activeBanTargetTeam, hiddenBlueBans, hiddenRedBans]);

  // Filter and sort heroes alphabetically
  const filteredHeroes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return allHeroes
      .filter((hero) => {
        // Role match
        if (selectedRole !== 'ALL' && !hero.role.includes(selectedRole)) {
          return false;
        }

        // Lane match
        if (selectedLane !== 'ALL' && !hero.lane.includes(selectedLane)) {
          return false;
        }

        // Search match
        if (query) {
          const matchesName = hero.name.toLowerCase().includes(query);
          const matchesRole = hero.role.some((r) => r.toLowerCase().includes(query));
          const matchesKeywords = hero.searchKeywords?.some((k) => k.toLowerCase().includes(query));
          const matchesLanes = hero.lane.some((l) => l.toLowerCase().includes(query));

          if (!matchesName && !matchesRole && !matchesKeywords && !matchesLanes) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allHeroes, searchTerm, selectedRole, selectedLane]);

  const handleRoleSelect = (role: HeroRole | 'ALL') => {
    setSelectedRole(role);
    if (role === 'ALL') {
      setSelectedLane('ALL');
    }
  };

  const handleResetFilters = () => {
    setSelectedRole('ALL');
    setSelectedLane('ALL');
    setSearchTerm('');
  };

  const hasActiveFilters = selectedRole !== 'ALL' || selectedLane !== 'ALL' || searchTerm.trim() !== '';

  const handleHeroClick = (hero: Hero, isSelectable: boolean) => {
    if (!isSelectable || isCompleted) return;
    soundFx.playSelect();
    onSelectHero(hero);
  };

  return (
    <div
      id="hero-selection-panel"
      className="flex-1 flex flex-col h-full bg-slate-900/80 border border-slate-800 rounded-xl p-3 md:p-3.5 select-none shadow-md overflow-hidden min-h-0"
    >
      {/* Header & Controls */}
      <div className="flex flex-col space-y-2.5 pb-2.5 border-b border-slate-800/80 shrink-0">
        {/* Top bar: Search + Patch Info + Quick Reset */}
        <div className="flex items-center justify-between gap-2">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              id="hero-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari hero, nama, atau role..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-950/90 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                id="clear-search-btn"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Current Patch & Hero Count Badge */}
          <div className="flex items-center space-x-2 shrink-0">
            <span 
              className="text-[10px] font-mono px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400"
              title={`Original Server Patch ${CURRENT_PATCH.patch} (Season ${CURRENT_PATCH.season})`}
            >
              Patch <span className="text-amber-400 font-bold">{CURRENT_PATCH.patch}</span> • S{CURRENT_PATCH.season} ({filteredHeroes.length}/{CURRENT_PATCH.totalVerifiedHeroes})
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                id="reset-filter-btn"
                onClick={handleResetFilters}
                className="text-[10px] font-semibold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Role Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto custom-scrollbar pb-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mr-1 shrink-0">
            Role:
          </span>
          {ROLES.map((role) => {
            const isSelected = selectedRole === role;
            return (
              <button
                key={role}
                id={`filter-role-${role.toLowerCase()}`}
                type="button"
                onClick={() => handleRoleSelect(role)}
                className={`px-3 py-1 rounded-md text-xs font-bold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                    : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {role === 'ALL' ? 'Semua Role' : role}
              </button>
            );
          })}
        </div>

        {/* Lane Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto custom-scrollbar pb-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mr-1 shrink-0">
            Lane:
          </span>
          {LANES.map((lane) => {
            const isSelected = selectedLane === lane;
            return (
              <button
                key={lane}
                id={`filter-lane-${lane.toLowerCase().replace(/\s+/g, '-')}`}
                type="button"
                onClick={() => setSelectedLane(lane)}
                className={`px-2.5 py-0.5 rounded text-[10px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-slate-200 text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80'
                }`}
              >
                {lane === 'ALL' ? 'Semua Lane' : lane}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Grid Container: dynamic minmax auto-fill ensures clear, uncompressed tiles */}
      <div
        id="hero-grid-list"
        className="flex-1 overflow-y-auto custom-scrollbar pt-3 pr-1.5 grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2.5 content-start min-h-0"
      >
        {filteredHeroes.map((hero) => {
          const isBanned = bannedIds.has(hero.id);
          const isPicked = pickedIds.has(hero.id);
          const isHiddenBannedSameTeam = currentTeamHiddenBansSet.has(hero.id);

          const isSelectable = !isCompleted && !isBanned && !isPicked && !isHiddenBannedSameTeam;

          let statusBadge: string | null = null;
          if (isBanned) statusBadge = 'BANNED';
          else if (isPicked) statusBadge = 'PICKED';
          else if (isHiddenBannedSameTeam) statusBadge = 'CHOSEN';

          return (
            <button
              key={hero.id}
              id={`hero-card-${hero.id}`}
              type="button"
              onClick={() => handleHeroClick(hero, isSelectable)}
              disabled={!isSelectable}
              title={`${hero.name} (${hero.role.join('/')} - ${hero.lane.join(', ')})`}
              className={`group relative flex flex-col items-center w-full p-2 rounded-xl border transition-all duration-150 cursor-pointer ${
                isSelectable
                  ? 'bg-slate-950/80 border-slate-800/90 hover:border-amber-400 hover:bg-slate-900 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5'
                  : 'bg-slate-950/40 border-slate-900/80 opacity-40 cursor-not-allowed grayscale'
              }`}
            >
              {/* Hero Portrait: Fixed 1:1 Aspect Container */}
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-900 border border-slate-800/80 shrink-0 shadow-inner mb-1.5">
                <HeroAvatar hero={hero} className="w-full h-full" compact={true} />

                {/* Status Overlay */}
                {statusBadge && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[1px] flex items-center justify-center p-1 z-20">
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shadow-sm ${
                        statusBadge === 'BANNED'
                          ? 'bg-red-600 text-white'
                          : statusBadge === 'PICKED'
                            ? 'bg-slate-700 text-slate-200'
                            : 'bg-blue-600 text-white'
                      }`}
                    >
                      {statusBadge}
                    </span>
                  </div>
                )}
              </div>

              {/* Hero Name & Role Info */}
              <div className="w-full flex flex-col items-center justify-center min-w-0">
                <span className="text-xs font-bold text-slate-100 group-hover:text-amber-300 truncate w-full text-center leading-tight tracking-tight">
                  {hero.name}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase truncate w-full text-center tracking-tighter mt-0.5">
                  {hero.role[0]}
                </span>
              </div>
            </button>
          );
        })}

        {filteredHeroes.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-500">
            <Search className="w-8 h-8 mb-2 stroke-1" />
            <span className="text-sm font-semibold text-slate-300">Tidak ada hero yang sesuai filter</span>
            <span className="text-xs text-slate-500 mt-1 mb-3">Coba bersihkan pencarian atau ubah filter role/lane</span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 cursor-pointer shadow"
            >
              Reset ke Semua Hero
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
