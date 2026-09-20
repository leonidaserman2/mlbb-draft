import { Hero, HeroLane } from './hero';

export interface HeroRecommendationItem {
  hero: Hero;
  score?: number;
  priorityTier?: 'S' | 'A' | 'B';
  reason?: string;
  suggestedLane?: HeroLane;
}

export interface RecommendationResult {
  status: 'PREPARING' | 'READY' | 'IDLE';
  placeholderMessage: string;
  recommendedBans: HeroRecommendationItem[];
  recommendedPicks: HeroRecommendationItem[];
  laneStatus: {
    lane: HeroLane;
    ourTeamFilled: boolean;
    enemyTeamFilled: boolean;
    filledByOur?: string;
    filledByEnemy?: string;
  }[];
  generatedAt: number;
}
