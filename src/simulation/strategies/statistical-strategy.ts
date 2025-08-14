import {
  CricketContext,
  OverSimulationResult,
  SimulationStrategy,
  BallOutcome,
  WicketType,
} from '../types';
import { transitionMatrices } from '../probabilities';
import { cloneDeep } from 'lodash';
import { updateContextAfterBall } from '../context-analyzer';

export class StatisticalStrategy implements SimulationStrategy {
  public name = 'Statistical';
  public priority = 3;

  // This strategy will be used for mid-complexity scenarios.
  public canHandle(context: CricketContext): boolean {
    return context.complexity >= 4 && context.complexity < 7;
  }

  public async simulate(context: CricketContext): Promise<OverSimulationResult> {
    const outcomes: BallOutcome[] = [];
    let currentContext = context;
    let legalDeliveries = 0;

    while (legalDeliveries < 6) {
      const outcome = this.simulateBall(currentContext);
      outcomes.push(outcome);
      currentContext = updateContextAfterBall(currentContext, outcome);
      if (outcome.type !== 'WIDE' && outcome.type !== 'NO_BALL') {
        legalDeliveries++;
      }
    }

    return {
      outcomes,
      commentary: 'An over simulated using statistical probabilities.',
      cost: 0.001, // Statistical simulation might have a very small cost for data lookups.
      debug: {
        strategy: 'Statistical',
      },
    };
  }

  private simulateBall(context: CricketContext): BallOutcome {
    const baseProbs = cloneDeep(transitionMatrices[context.phase]);

    // Adjust probabilities based on context
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    // Pressure adjustments
    if (context.pressure.requiredRunRate > 12) {
      baseProbs.FOUR! = clamp(baseProbs.FOUR! * 1.2, 0, 0.3);
      baseProbs.SIX! = clamp(baseProbs.SIX! * 1.5, 0, 0.2);
      baseProbs.WICKET! = clamp(baseProbs.WICKET! * 1.3, 0, 0.15);
    }
    if (context.pressure.dotBallPressure > 3) {
      baseProbs.WICKET! *= 1.2;
      baseProbs.SINGLE! *= 1.1;
    }

    // Momentum adjustments
    if (context.momentum.battingMomentum > 5) {
        baseProbs.FOUR! *= 1.2;
        baseProbs.SIX! *= 1.2;
    }
     if (context.momentum.bowlingMomentum > 5) {
        baseProbs.WICKET! *= 1.2;
        baseProbs.DOT! *= 1.1;
    }

    // Adjust for set batsman
    if (context.strikerBallsFaced > 15) {
        const aggressionFactor = Math.min(1 + (context.strikerBallsFaced - 15) / 10, 2.5);
        baseProbs.FOUR! = clamp(baseProbs.FOUR! * aggressionFactor, 0, 0.5);
        baseProbs.SIX! = clamp(baseProbs.SIX! * aggressionFactor, 0, 0.4);
    }

    // Normalize probabilities
    const totalProb = Object.values(baseProbs).reduce((sum, p) => sum! + p!, 0);
    if (totalProb === 0) {
        // This should not happen, but as a fallback, return a dot ball.
        return { type: 'DOT' };
    }
    const normalizedProbs = Object.entries(baseProbs).reduce((acc, [key, value]) => {
        acc[key as BallOutcome['type']] = Math.max(0, value!) / totalProb; // Ensure no negative probabilities
        return acc;
    }, {} as { [key in BallOutcome['type']]: number });


    const random = Math.random();
    let cumulativeProb = 0;

    for (const [key, value] of Object.entries(normalizedProbs)) {
      cumulativeProb += value!;
      if (random < cumulativeProb) {
        const type = key as BallOutcome['type'];
        switch (type) {
          case 'DOT': return { type };
          case 'SINGLE': return { type, runs: 1 };
          case 'DOUBLE': return { type, runs: 2 };
          case 'FOUR': return { type, runs: 4 };
          case 'SIX': return { type, runs: 6 };
          case 'WICKET':
            const wicketTypes: WicketType[] = ['BOWLED', 'CAUGHT', 'LBW'];
            return { type, wicketType: wicketTypes[Math.floor(Math.random() * wicketTypes.length)] };
          case 'WIDE': return { type, runs: 1 };
          case 'NO_BALL': return { type, runs: 1 };
          case 'BYE': return { type, runs: 1 };
          case 'LEG_BYE': return { type, runs: 1 };
        }
      }
    }

    return { type: 'DOT' }; // Fallback
  }
}
