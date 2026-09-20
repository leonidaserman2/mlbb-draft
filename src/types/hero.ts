export type HeroRole = 'Tank' | 'Fighter' | 'Assassin' | 'Mage' | 'Marksman' | 'Support';

export type HeroLane = 'Gold Lane' | 'EXP Lane' | 'Mid Lane' | 'Roamer' | 'Jungler';

export interface Hero {
  id: string;
  name: string;
  role: string[];
  lane: string[];
  portrait: string;
  searchKeywords: string[];
  
  // Compatibility fields for existing sub-components and recommendation calculations
  roles: HeroRole[] | string[];
  lanes: HeroLane[] | string[];
  damageType?: 'Physical' | 'Magic' | 'True';
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}
