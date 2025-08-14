import { BallOutcome, MatchPhase } from './types';

type OutcomeProbabilities = {
  [key in BallOutcome['type']]?: number;
};

export const transitionMatrices: { [key in MatchPhase]: OutcomeProbabilities } = {
  POWERPLAY: {
    DOT: 0.25,
    SINGLE: 0.35,
    DOUBLE: 0.10,
    FOUR: 0.18,
    SIX: 0.07,
    WICKET: 0.05,
    WIDE: 0.02,
    NO_BALL: 0.01,
    BYE: 0.005,
    LEG_BYE: 0.005,
  },
  MIDDLE_OVERS: {
    DOT: 0.38,
    SINGLE: 0.40,
    DOUBLE: 0.08,
    FOUR: 0.08,
    SIX: 0.02,
    WICKET: 0.04,
    WIDE: 0.02,
    NO_BALL: 0.01,
    BYE: 0.005,
    LEG_BYE: 0.005,
  },
  DEATH_OVERS: {
    DOT: 0.15,
    SINGLE: 0.25,
    DOUBLE: 0.10,
    FOUR: 0.25,
    SIX: 0.15,
    WICKET: 0.10,
    WIDE: 0.02,
    NO_BALL: 0.01,
    BYE: 0.005,
    LEG_BYE: 0.005,
  },
};
