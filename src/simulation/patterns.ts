import { BallOutcome } from './types';

export type PatternVariation = {
  outcomes: BallOutcome[];
  contextTags: string[];
};

export interface OverPattern {
  id: string;
  description: string;
  baseWeight: number;
  tags: ('powerplay' | 'middle' | 'death' | 'pressure' | 'momentum-swing' | 'normal')[];
  variations: PatternVariation[];
}

export const overPatterns: OverPattern[] = [
  // --- Defensive/Pressure Build-up ---
  {
    id: 'TIGHT_OVER',
    description: 'Very few runs, building pressure.',
    baseWeight: 10,
    tags: ['normal', 'middle'],
    variations: [
      { outcomes: [{ type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['building'] },
      { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'DOT' }], contextTags: ['rotating'] },
      { outcomes: [{ type: 'DOT' }, { type: 'DOT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'WIDE', runs: 1 }], contextTags: ['extras'] },
    ],
  },

  // --- Standard Overs ---
  {
    id: 'STEADY_ACCUMULATION',
    description: 'A standard over with a mix of singles and doubles.',
    baseWeight: 15,
    tags: ['normal', 'middle'],
    variations: [
        { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'DOUBLE', runs: 2 }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'DOUBLE', runs: 2 }, { type: 'SINGLE', runs: 1 }], contextTags: ["middle", "partnership"] },
        { outcomes: [{ type: 'DOUBLE', runs: 2 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'DOUBLE', runs: 2 }, { type: 'DOT' }], contextTags: ["powerplay", "building"] },
        { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }], contextTags: ["easy_singles"] },
        { outcomes: [{ type: 'DOT' }, { type: 'FOUR', runs: 4 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ["boundary_release"] },
    ],
  },

  // --- Wicket-taking Overs ---
  {
    id: 'PRESSURE_WICKET',
    description: 'A wicket falls due to building pressure.',
    baseWeight: 7,
    tags: ['pressure', 'normal'],
    variations: [
        { outcomes: [{ type: 'DOT' }, { type: 'DOT' }, { type: 'DOT' }, { type: 'WICKET', wicketType: 'BOWLED' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ["pressure", "tight_bowling"] },
        { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'WICKET', wicketType: 'CAUGHT' }, { type: 'DOT' }, { type: 'DOT' }, { type: 'DOT' }], contextTags: ["batsman_error"] },
        { outcomes: [{ type: 'FOUR', runs: 4 }, { type: 'WICKET', wicketType: 'CAUGHT' }, { type: 'DOT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ["aggressive_error"] },
    ],
  },
];
