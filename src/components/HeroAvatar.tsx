import React, { useState } from 'react';
import { Hero, HeroRole } from '../types/hero';
import { 
  Shield, 
  Swords, 
  Zap, 
  Wand2, 
  Crosshair, 
  HeartHandshake,
  ImageOff
} from 'lucide-react';
import { ROLE_THEME_COLORS, resolveHeroAsset } from '../utils/portraitHelper';

interface HeroAvatarProps {
  hero: Hero | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showRoleIcon?: boolean;
  compact?: boolean;
}

export const HeroAvatar: React.FC<HeroAvatarProps> = ({
  hero,
  className = '',
  size = 'md',
  showRoleIcon = false,
  compact = false,
}) => {
  const [imageError, setImageError] = useState(false);

  if (!hero) {
    return (
      <div 
        className={`w-full h-full bg-slate-900/60 border border-slate-800/80 rounded-lg flex items-center justify-center text-slate-600 ${className}`}
      >
        <span className="text-[10px] uppercase tracking-wider font-mono">Empty</span>
      </div>
    );
  }

  // Resolve primary role for theme coloring
  const primaryRole: HeroRole = (
    Array.isArray(hero.role) ? hero.role[0] : (hero as any).role || 'Fighter'
  ) as HeroRole;

  const roleTheme = ROLE_THEME_COLORS[primaryRole] || ROLE_THEME_COLORS.Fighter;

  const renderRoleIcon = (iconClass: string = "w-3 h-3") => {
    switch (primaryRole) {
      case 'Tank': return <Shield className={iconClass} />;
      case 'Fighter': return <Swords className={iconClass} />;
      case 'Assassin': return <Zap className={iconClass} />;
      case 'Mage': return <Wand2 className={iconClass} />;
      case 'Marksman': return <Crosshair className={iconClass} />;
      case 'Support': return <HeartHandshake className={iconClass} />;
      default: return <Shield className={iconClass} />;
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Deterministic local asset resolution
  const resolvedAssetUrl = resolveHeroAsset(hero.id);
  const hasLocalAsset = !!resolvedAssetUrl && !imageError;

  return (
    <div 
      className={`relative w-full h-full overflow-hidden rounded-lg bg-slate-950 select-none ${className}`}
      title={`${hero.name} (${primaryRole}) - File: ${hero.portrait}`}
    >
      {hasLocalAsset ? (
        <img
          src={resolvedAssetUrl!}
          alt={hero.name}
          onError={() => setImageError(true)}
          className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-108"
          loading="lazy"
        />
      ) : (
        /* Clean Local Missing-Asset Placeholder */
        <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-1 bg-gradient-to-b ${roleTheme.bg} text-center`}>
          <div className="absolute inset-0 bg-slate-950/40 pointer-events-none" />

          {/* Initials & Missing Asset Badge */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-950 border ${roleTheme.border} shadow-sm relative mb-0.5`}>
              <span className={`text-[11px] sm:text-[12px] font-black tracking-tighter ${roleTheme.text}`}>
                {getInitials(hero.name)}
              </span>
              <div 
                className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-900 border border-slate-700 text-amber-400"
                title={`Portrait file missing: ${hero.portrait}`}
              >
                <ImageOff className="w-2.5 h-2.5 text-amber-400" />
              </div>
            </div>

            {!compact && (
              <span className="text-[7px] font-bold text-amber-400/90 tracking-tighter uppercase px-1 py-0.2 rounded bg-slate-950/90 border border-amber-500/30 leading-none">
                Asset Missing
              </span>
            )}
          </div>
        </div>
      )}

      {showRoleIcon && (
        <div 
          className="absolute top-1 right-1 p-0.5 rounded bg-slate-950/80 backdrop-blur-xs border border-slate-700/80 shadow z-10"
          title={`${hero.role.join('/')} - ${hero.lane.join(', ')}`}
        >
          {renderRoleIcon("w-2.5 h-2.5 text-white")}
        </div>
      )}
    </div>
  );
};
