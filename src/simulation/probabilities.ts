import { BallOutcome, MatchPhase, CricketContext } from './types';
import { ANURAAG_IDS, PRASHANT_IDS, HARSHAL_IDS } from './special-players';

type OutcomeProbabilities = {
  [key in BallOutcome['type']]?: number;
};

const normalizeProbabilities = (probs: OutcomeProbabilities): OutcomeProbabilities => {
  const total = Object.values(probs).reduce((sum, p) => (sum || 0) + (p || 0), 0);
  if (total === 0) return probs;
  const normalizedProbs: OutcomeProbabilities = {};
  for (const key in probs) {
    const probValue = probs[key as BallOutcome['type']];
    if (probValue !== undefined) {
      normalizedProbs[key as BallOutcome['type']] = probValue / total;
    }
  }
  return normalizedProbs;
};

export const getPlayerAdjustedProbabilities = (
  context: CricketContext,
  baseProbabilities: OutcomeProbabilities
): OutcomeProbabilities => {
  const batsmanId = context.striker.id;
  const bowlerId = context.bowler.id;
  let adjustedProbs = { ...baseProbabilities };

  if (ANURAAG_IDS.includes(batsmanId)) {
    adjustedProbs.DOT = (adjustedProbs.DOT ?? 0) * 0.2; // Very low dot ball probability
    adjustedProbs.SINGLE = (adjustedProbs.SINGLE ?? 0) * 0.5;
    adjustedProbs.WICKET = (adjustedProbs.WICKET ?? 0) * 0.05; // Very low wicket probability
    adjustedProbs.FOUR = (adjustedProbs.FOUR ?? 0) * 2.5; // High four probability
    adjustedProbs.SIX = (adjustedProbs.SIX ?? 0) * 3.0; // Very high six probability
  } else if (PRASHANT_IDS.includes(batsmanId)) {
    adjustedProbs.DOT = (adjustedProbs.DOT ?? 0) * 3.0; // Very high dot ball probability
    adjustedProbs.SINGLE = (adjustedProbs.SINGLE ?? 0) * 1.5;
    adjustedProbs.WICKET = (adjustedProbs.WICKET ?? 0) * 0.4; // Lower per-ball wicket chance to extend innings
    adjustedProbs.FOUR = 0.001; // Virtually no fours
    adjustedProbs.SIX = 0.001; // Virtually no sixes
  }

  if (ANURAAG_IDS.includes(bowlerId)) {
    adjustedProbs.WICKET = (adjustedProbs.WICKET ?? 0) * 3.5; // Very high wicket probability
    adjustedProbs.FOUR = (adjustedProbs.FOUR ?? 0) * 0.4;
    adjustedProbs.SIX = (adjustedProbs.SIX ?? 0) * 0.3;
  } else if (PRASHANT_IDS.includes(bowlerId)) {
    adjustedProbs.WICKET = (adjustedProbs.WICKET ?? 0) * 0.1; // Drastically reduce wicket probability
    adjustedProbs.FOUR = (adjustedProbs.FOUR ?? 0) * 1.9;
    adjustedProbs.SIX = (adjustedProbs.SIX ?? 0) * 2.2;
  } else if (HARSHAL_IDS.includes(bowlerId)) {
    adjustedProbs.WICKET = (adjustedProbs.WICKET ?? 0) * 1.5; // Good wicket-taking ability
    adjustedProbs.FOUR = (adjustedProbs.FOUR ?? 0) * 0.7; // Economical
    adjustedProbs.SIX = (adjustedProbs.SIX ?? 0) * 0.6;
    adjustedProbs.DOT = (adjustedProbs.DOT ?? 0) * 1.2;
  }

  return normalizeProbabilities(adjustedProbs);
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
