import { DraftState } from '../types/draft';
import { HeroLane } from '../types/hero';
import { RecommendationResult } from '../types/recommendation';

const ALL_LANES: HeroLane[] = [
  'Gold Lane',
  'EXP Lane',
  'Mid Lane',
  'Roamer',
  'Jungler',
];

/**
 * getRecommendations receives the full DraftState and produces
 * the RecommendationResult data structure.
 * 
 * In this foundation phase, it provides the clean interface and
 * draft state mapping (such as lane coverage tracking) while
 * displaying the required preparation placeholder:
 * "Draft engine is preparing recommendations..."
 * 
 * No meta AI yet in Phase 1!
 */
export function getRecommendations(draftState: DraftState): RecommendationResult {
  const isFirstPick = draftState.selectedSide === 'FIRST_PICK';
  const ourPicks = (isFirstPick ? draftState.bluePicks : draftState.redPicks).filter(Boolean);
  const enemyPicks = (isFirstPick ? draftState.redPicks : draftState.bluePicks).filter(Boolean);

  const laneStatus = ALL_LANES.map((lane) => {
    const ourHeroInLane = ourPicks.find((h) => (h?.lane || h?.lanes || []).includes(lane as any));
    const enemyHeroInLane = enemyPicks.find((h) => (h?.lane || h?.lanes || []).includes(lane as any));

    return {
      lane,
      ourTeamFilled: !!ourHeroInLane,
      enemyTeamFilled: !!enemyHeroInLane,
      filledByOur: ourHeroInLane?.name,
      filledByEnemy: enemyHeroInLane?.name,
    };
  });

  return {
    status: 'PREPARING',
    placeholderMessage: 'Draft engine is preparing recommendations...',
    recommendedBans: [],
    recommendedPicks: [],
    laneStatus,
    generatedAt: Date.now(),
  };
}
