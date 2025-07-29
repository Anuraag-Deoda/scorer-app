import { BallOutcome, MatchPhase } from './types';

type OutcomeProbabilities = {
  [key in BallOutcome['type']]?: number;
};

export const transitionMatrices: { [key in MatchPhase]: OutcomeProbabilities } = {
  POWERPLAY: {
    DOT: 0.30,
    SINGLE: 0.35,
    DOUBLE: 0.10,
    FOUR: 0.15,
    SIX: 0.05,
    WICKET: 0.05,
  },
  MIDDLE_OVERS: {
    DOT: 0.45,
    SINGLE: 0.40,
    DOUBLE: 0.08,
    FOUR: 0.04,
    SIX: 0.01,
    WICKET: 0.02,
  },
  DEATH_OVERS: {
    DOT: 0.20,
    SINGLE: 0.30,
    DOUBLE: 0.10,
    FOUR: 0.20,
    SIX: 0.10,
    WICKET: 0.10,
  },
};
