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
    // --- Original Patterns ---
    {
        id: 'TIGHT_FINISH',
        description: 'A very tight over at the end of the innings.',
        baseWeight: 3,
        tags: ['death', 'pressure'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOUBLE', runs: 2 }, { type: 'DOT' }], contextTags: ['yorkers'] },
        ],
    },
    {
        id: 'PARTNERSHIP_BUILDER',
        description: 'A steady over focused on building a partnership.',
        baseWeight: 8,
        tags: ['middle'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }], contextTags: ['rotating_strike'] },
        ],
    },
    {
        id: 'POWERPLAY_ONSLAUGHT',
        description: 'An expensive powerplay over.',
        baseWeight: 9,
        tags: ['powerplay', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'FOUR', runs: 4 }, { type: 'FOUR', runs: 4 }, { type: 'DOT' }, { type: 'SIX', runs: 6 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['attacking_batting'] },
        ],
    },
    {
        id: 'MIDDLE_OVERS_BREAKTHROUGH',
        description: 'A wicket falls in the middle overs, breaking a partnership.',
        baseWeight: 6,
        tags: ['middle', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'WICKET', wicketType: 'STUMPED' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['spin_bowling'] },
        ],
    },
    {
        id: 'DEATH_OVERS_WICKET',
        description: 'A wicket falls in the death overs.',
        baseWeight: 7,
        tags: ['death', 'pressure'],
        variations: [
            { outcomes: [{ type: 'SIX', runs: 6 }, { type: 'WICKET', wicketType: 'CAUGHT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['slogging_error'] },
        ],
    },
    {
        id: 'EXPENSIVE_WICKET_OVER',
        description: 'A wicket falls, but the over is still expensive.',
        baseWeight: 4,
        tags: ['powerplay', 'death', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'FOUR', runs: 4 }, { type: 'WICKET', wicketType: 'CAUGHT' }, { type: 'SIX', runs: 6 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['aggressive_batting'] },
        ],
    },
    {
        id: 'RUN_OUT_MIXUP',
        description: 'A run-out occurs due to a mix-up between the batsmen.',
        baseWeight: 2,
        tags: ['middle', 'pressure'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'WICKET', wicketType: 'RUN_OUT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['miscommunication'] },
        ],
    },
    {
        id: 'NO_BALL_WICKET',
        description: 'A wicket falls on a no-ball (run-out).',
        baseWeight: 1,
        tags: ['pressure'],
        variations: [
            { outcomes: [{ type: 'NO_BALL', runs: 1 }, { type: 'WICKET', wicketType: 'RUN_OUT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'FOUR', runs: 4 }], contextTags: ['drama'] },
        ],
    },
    {
        id: 'HAT_TRICK_BALL',
        description: 'A bowler is on a hat-trick.',
        baseWeight: 0.1,
        tags: ['pressure', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'WICKET', wicketType: 'BOWLED' }, { type: 'WICKET', wicketType: 'LBW' }, { type: 'WICKET', wicketType: 'CAUGHT' }], contextTags: ['history'] },
        ],
    },
    {
        id: 'LAST_BALL_THRILLER',
        description: 'The match goes down to the last ball.',
        baseWeight: 1,
        tags: ['death', 'pressure'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'DOUBLE', runs: 2 }, { type: 'WICKET', wicketType: 'RUN_OUT' }, { type: 'SINGLE', runs: 1 }, { type: 'SIX', runs: 6 }], contextTags: ['clutch'] },
        ],
    },

    // --- New Patterns (50 Additional) ---
    {
        id: 'MAIDEN_OVER',
        description: 'A maiden over with no runs scored.',
        baseWeight: 3,
        tags: ['pressure', 'middle'],
        variations: [
            { outcomes: [{ type: 'DOT' }, { type: 'DOT' }, { type: 'DOT' }, { type: 'DOT' }, { type: 'DOT' }, { type: 'DOT' }], contextTags: ['tight_bowling'] },
        ],
    },
    {
        id: 'BOUNDARY_BURST',
        description: 'An over with multiple boundaries.',
        baseWeight: 6,
        tags: ['powerplay', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'FOUR', runs: 4 }, { type: 'FOUR', runs: 4 }, { type: 'SINGLE', runs: 1 }, { type: 'FOUR', runs: 4 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['aggressive_batting'] },
        ],
    },
    {
        id: 'SPIN_CONTROL',
        description: 'A controlled over by a spinner in the middle overs.',
        baseWeight: 8,
        tags: ['middle'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['spin_bowling'] },
        ],
    },
    {
        id: 'DEATH_SLOG',
        description: 'A high-scoring over in the death overs.',
        baseWeight: 5,
        tags: ['death', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'SIX', runs: 6 }, { type: 'FOUR', runs: 4 }, { type: 'SIX', runs: 6 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOUBLE', runs: 2 }], contextTags: ['slogging'] },
        ],
    },
    {
        id: 'WIDE_AND_DOT',
        description: 'An over with a mix of wides and dot balls.',
        baseWeight: 4,
        tags: ['pressure', 'normal'],
        variations: [
            { outcomes: [{ type: 'WIDE', runs: 1 }, { type: 'DOT' }, { type: 'DOT' }, { type: 'WIDE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['erratic_bowling'] },
        ],
    },
    {
        id: 'DOUBLE_WICKET',
        description: 'Two wickets fall in a single over.',
        baseWeight: 3,
        tags: ['middle', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'WICKET', wicketType: 'BOWLED' }, { type: 'SINGLE', runs: 1 }, { type: 'WICKET', wicketType: 'CAUGHT' }, { type: 'DOT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['collapse'] },
        ],
    },
    {
        id: 'EXPENSIVE_POWERPLAY',
        description: 'A very expensive powerplay over with boundaries and extras.',
        baseWeight: 5,
        tags: ['powerplay', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'FOUR', runs: 4 }, { type: 'WIDE', runs: 1 }, { type: 'SIX', runs: 6 }, { type: 'FOUR', runs: 4 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['loose_bowling'] },
        ],
    },
    {
        id: 'CAUTIOUS_START',
        description: 'A cautious start in the powerplay with minimal risks.',
        baseWeight: 9,
        tags: ['powerplay', 'normal'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['defensive_batting'] },
        ],
    },
    {
        id: 'SPINNER_SQUEEZE',
        description: 'A spinner bowls a tight over with no boundaries.',
        baseWeight: 7,
        tags: ['middle', 'pressure'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['spin_bowling'] },
        ],
    },
    {
        id: 'DEATH_YORKERS',
        description: 'An over dominated by pinpoint yorkers in the death.',
        baseWeight: 6,
        tags: ['death', 'pressure'],
        variations: [
            { outcomes: [{ type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'WICKET', wicketType: 'BOWLED' }], contextTags: ['yorkers'] },
        ],
    },
    {
        id: 'MIDDLE_OVERS_STEADY',
        description: 'A steady over with singles and doubles in the middle.',
        baseWeight: 8,
        tags: ['middle', 'normal'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'DOUBLE', runs: 2 }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['partnership'] },
        ],
    },
    {
        id: 'NO_BALL_BONANZA',
        description: 'An over with multiple no-balls and runs.',
        baseWeight: 3,
        tags: ['powerplay', 'death'],
        variations: [
            { outcomes: [{ type: 'NO_BALL', runs: 1 }, { type: 'FOUR', runs: 4 }, { type: 'NO_BALL', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SIX', runs: 6 }], contextTags: ['erratic_bowling'] },
        ],
    },
    {
        id: 'SLOW_BOUNCER_TRAP',
        description: 'A wicket falls due to a well-executed slow bouncer.',
        baseWeight: 4,
        tags: ['middle', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'WICKET', wicketType: 'CAUGHT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['pace_bowling'] },
        ],
    },
    {
        id: 'DEFENSIVE_MIDDLE',
        description: 'A defensive over in the middle with minimal scoring.',
        baseWeight: 7,
        tags: ['middle', 'pressure'],
        variations: [
            { outcomes: [{ type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'DOT' }], contextTags: ['tight_bowling'] },
        ],
    },
    {
        id: 'POWERPLAY_STEADY',
        description: 'A balanced powerplay over with cautious batting.',
        baseWeight: 8,
        tags: ['powerplay', 'normal'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'DOUBLE', runs: 2 }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['cautious_batting'] },
        ],
    },
    {
        id: 'SPIN_WICKET',
        description: 'A spinner takes a wicket with a well-disguised delivery.',
        baseWeight: 5,
        tags: ['middle', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'WICKET', wicketType: 'STUMPED' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['spin_bowling'] },
        ],
    },
    {
        id: 'DEATH_EXTRAVAGANZA',
        description: 'A very expensive over in the death with big hits.',
        baseWeight: 4,
        tags: ['death', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'SIX', runs: 6 }, { type: 'SIX', runs: 6 }, { type: 'FOUR', runs: 4 }, { type: 'SINGLE', runs: 1 }, { type: 'SIX', runs: 6 }, { type: 'DOT' }], contextTags: ['slogging'] },
        ],
    },
    {
        id: 'WICKET_AND_DOT',
        description: 'A wicket followed by tight bowling.',
        baseWeight: 6,
        tags: ['middle', 'pressure'],
        variations: [
            { outcomes: [{ type: 'WICKET', wicketType: 'LBW' }, { type: 'DOT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'DOT' }], contextTags: ['tight_bowling'] },
        ],
    },
    {
        id: 'BOUNDARY_AND_WICKET',
        description: 'A boundary followed by a wicket in the same over.',
        baseWeight: 5,
        tags: ['powerplay', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'FOUR', runs: 4 }, { type: 'WICKET', wicketType: 'CAUGHT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['mixed_momentum'] },
        ],
    },
    {
        id: 'SLOW_OVER',
        description: 'A very slow-scoring over with lots of dot balls.',
        baseWeight: 7,
        tags: ['middle', 'pressure'],
        variations: [
            { outcomes: [{ type: 'DOT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['defensive_bowling'] },
        ],
    },
    {
        id: 'POWERPLAY_WICKET',
        description: 'A wicket falls early in the powerplay.',
        baseWeight: 6,
        tags: ['powerplay', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'WICKET', wicketType: 'BOWLED' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['early_breakthrough'] },
        ],
    },
    {
        id: 'MIDDLE_SLOG',
        description: 'An aggressive over in the middle with big shots.',
        baseWeight: 4,
        tags: ['middle', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'SIX', runs: 6 }, { type: 'FOUR', runs: 4 }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SIX', runs: 6 }, { type: 'DOT' }], contextTags: ['aggressive_batting'] },
        ],
    },
    {
        id: 'WIDE_BONANZA',
        description: 'An over with multiple wides and runs.',
        baseWeight: 3,
        tags: ['powerplay', 'death'],
        variations: [
            { outcomes: [{ type: 'WIDE', runs: 1 }, { type: 'WIDE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'FOUR', runs: 4 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['erratic_bowling'] },
        ],
    },
    {
        id: 'SPIN_MAIDEN',
        description: 'A spinner bowls a maiden over.',
        baseWeight: 3,
        tags: ['middle', 'pressure'],
        variations: [
            { outcomes: [{ type: 'DOT' }, { type: 'DOT' }, { type: 'DOT' }, { type: 'DOT' }, { type: 'DOT' }, { type: 'DOT' }], contextTags: ['spin_bowling'] },
        ],
    },
    {
        id: 'DEATH_TIGHT',
        description: 'A tight over in the death with minimal runs.',
        baseWeight: 5,
        tags: ['death', 'pressure'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['yorkers'] },
        ],
    },
    {
        id: 'MIDDLE_WICKET_DOUBLE',
        description: 'Two wickets in a middle over, shifting momentum.',
        baseWeight: 3,
        tags: ['middle', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'WICKET', wicketType: 'CAUGHT' }, { type: 'DOT' }, { type: 'WICKET', wicketType: 'BOWLED' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['collapse'] },
        ],
    },
    {
        id: 'POWERPLAY_EXTRAS',
        description: 'An over with multiple extras in the powerplay.',
        baseWeight: 4,
        tags: ['powerplay'],
        variations: [
            { outcomes: [{ type: 'WIDE', runs: 1 }, { type: 'NO_BALL', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'WIDE', runs: 1 }, { type: 'SINGLE', runs: 1 }], contextTags: ['erratic_bowling'] },
        ],
    },
    {
        id: 'SLOW_BOUNCER_WICKET',
        description: 'A wicket falls due to a slow bouncer in the middle overs.',
        baseWeight: 4,
        tags: ['middle', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'WICKET', wicketType: 'CAUGHT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['pace_bowling'] },
        ],
    },
    {
        id: 'DEATH_BOUNCER',
        description: 'A bouncer-heavy over in the death.',
        baseWeight: 4,
        tags: ['death', 'pressure'],
        variations: [
            { outcomes: [{ type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'WICKET', wicketType: 'CAUGHT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['bouncer_tactic'] },
        ],
    },
    {
        id: 'MIDDLE_STEADY_SINGLES',
        description: 'An over with consistent singles in the middle.',
        baseWeight: 8,
        tags: ['middle', 'normal'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['rotating_strike'] },
        ],
    },
    {
        id: 'POWERPLAY_SIX',
        description: 'A powerplay over with a big six.',
        baseWeight: 6,
        tags: ['powerplay', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'SIX', runs: 6 }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'FOUR', runs: 4 }, { type: 'DOT' }], contextTags: ['attacking_batting'] },
        ],
    },
    {
        id: 'SPIN_TRAP',
        description: 'A spinner sets up a batsman for a wicket.',
        baseWeight: 5,
        tags: ['middle', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'WICKET', wicketType: 'STUMPED' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['spin_bowling'] },
        ],
    },
    {
        id: 'DEATH_MISFIELD',
        description: 'A misfield leads to extra runs in the death overs.',
        baseWeight: 4,
        tags: ['death', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'FOUR', runs: 4 }, { type: 'SINGLE', runs: 1 }, { type: 'FOUR', runs: 4 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'SIX', runs: 6 }], contextTags: ['fielding_error'] },
        ],
    },
    {
        id: 'MIDDLE_DOT_PRESSURE',
        description: 'An over with multiple dot balls building pressure.',
        baseWeight: 7,
        tags: ['middle', 'pressure'],
        variations: [
            { outcomes: [{ type: 'DOT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['tight_bowling'] },
        ],
    },
    {
        id: 'POWERPLAY_TIGHT',
        description: 'A tight powerplay over with minimal scoring.',
        baseWeight: 7,
        tags: ['powerplay', 'pressure'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['tight_bowling'] },
        ],
    },
    {
        id: 'WICKET_AND_SIX',
        description: 'A wicket and a six in the same over.',
        baseWeight: 5,
        tags: ['death', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'WICKET', wicketType: 'CAUGHT' }, { type: 'SIX', runs: 6 }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['mixed_momentum'] },
        ],
    },
    {
        id: 'MIDDLE_EXTRAS',
        description: 'An over with extras in the middle overs.',
        baseWeight: 4,
        tags: ['middle'],
        variations: [
            { outcomes: [{ type: 'WIDE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'NO_BALL', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['erratic_bowling'] },
        ],
    },
    {
        id: 'DEATH_SLOW_BALL',
        description: 'A slower ball deceives the batsman in the death.',
        baseWeight: 5,
        tags: ['death', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'WICKET', wicketType: 'CAUGHT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['slower_ball'] },
        ],
    },
    {
        id: 'POWERPLAY_DOT_HEAVY',
        description: 'A powerplay over with many dot balls.',
        baseWeight: 6,
        tags: ['powerplay', 'pressure'],
        variations: [
            { outcomes: [{ type: 'DOT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['tight_bowling'] },
        ],
    },
    {
        id: 'MIDDLE_SIX_BURST',
        description: 'A sudden burst of aggression with sixes in the middle.',
        baseWeight: 4,
        tags: ['middle', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'SIX', runs: 6 }, { type: 'SIX', runs: 6 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'FOUR', runs: 4 }, { type: 'DOT' }], contextTags: ['aggressive_batting'] },
        ],
    },
    {
        id: 'DEATH_WIDE_WICKET',
        description: 'A wide followed by a wicket in the death overs.',
        baseWeight: 4,
        tags: ['death', 'pressure'],
        variations: [
            { outcomes: [{ type: 'WIDE', runs: 1 }, { type: 'WICKET', wicketType: 'CAUGHT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['erratic_bowling'] },
        ],
    },
    {
        id: 'MIDDLE_RUN_RATE_BOOST',
        description: 'An over that boosts the run rate in the middle.',
        baseWeight: 6,
        tags: ['middle', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'FOUR', runs: 4 }, { type: 'SINGLE', runs: 1 }, { type: 'SIX', runs: 6 }, { type: 'SINGLE', runs: 1 }, { type: 'FOUR', runs: 4 }, { type: 'DOT' }], contextTags: ['attacking_batting'] },
        ],
    },
    {
        id: 'POWERPLAY_MISFIELD',
        description: 'A misfield leads to extra runs in the powerplay.',
        baseWeight: 5,
        tags: ['powerplay', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'FOUR', runs: 4 }, { type: 'SINGLE', runs: 1 }, { type: 'FOUR', runs: 4 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }], contextTags: ['fielding_error'] },
        ],
    },
    {
        id: 'SPIN_DOT_HEAVY',
        description: 'A spinner bowls an over with many dot balls.',
        baseWeight: 7,
        tags: ['middle', 'pressure'],
        variations: [
            { outcomes: [{ type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['spin_bowling'] },
        ],
    },
    {
        id: 'DEATH_SIX_WICKET',
        description: 'A six followed by a wicket in the death overs.',
        baseWeight: 5,
        tags: ['death', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'SIX', runs: 6 }, { type: 'WICKET', wicketType: 'CAUGHT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['mixed_momentum'] },
        ],
    },
    {
        id: 'MIDDLE_TIGHT_SINGLES',
        description: 'An over with tight singles and no boundaries.',
        baseWeight: 8,
        tags: ['middle', 'normal'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'SINGLE', runs: 1 }], contextTags: ['rotating_strike'] },
        ],
    },
    {
        id: 'POWERPLAY_SLOW_START',
        description: 'A slow start in the powerplay with cautious play.',
        baseWeight: 7,
        tags: ['powerplay', 'normal'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['cautious_batting'] },
        ],
    },
    {
        id: 'SPIN_WICKET_DOUBLE',
        description: 'A spinner takes two wickets in an over.',
        baseWeight: 3,
        tags: ['middle', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'WICKET', wicketType: 'STUMPED' }, { type: 'SINGLE', runs: 1 }, { type: 'WICKET', wicketType: 'LBW' }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }], contextTags: ['spin_bowling'] },
        ],
    },
    {
        id: 'DEATH_EXTRAS',
        description: 'An over with extras in the death overs.',
        baseWeight: 4,
        tags: ['death'],
        variations: [
            { outcomes: [{ type: 'WIDE', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'NO_BALL', runs: 1 }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['erratic_bowling'] },
        ],
    },
    {
        id: 'MIDDLE_SLOW_BALL_WICKET',
        description: 'A slower ball takes a wicket in the middle overs.',
        baseWeight: 5,
        tags: ['middle', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'WICKET', wicketType: 'CAUGHT' }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }], contextTags: ['slower_ball'] },
        ],
    },
    {
        id: 'POWERPLAY_SIX_BURST',
        description: 'A powerplay over with multiple sixes.',
        baseWeight: 4,
        tags: ['powerplay', 'momentum-swing'],
        variations: [
            { outcomes: [{ type: 'SIX', runs: 6 }, { type: 'SIX', runs: 6 }, { type: 'SINGLE', runs: 1 }, { type: 'DOT' }, { type: 'SINGLE', runs: 1 }, { type: 'FOUR', runs: 4 }], contextTags: ['attacking_batting'] },
        ],
    },
];
